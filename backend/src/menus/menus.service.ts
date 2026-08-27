import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allergy, DataSource, Ingredient, MenuAnalysisResult } from '../entities';
import { MenuAnalysisException } from '../common/exceptions/menu-analysis.exception';
import { MenuAnalysisResultNotFoundException } from '../common/exceptions/menu-analysis-result-not-found.exception';
import { deriveMenuStatus } from '../common/utils/menu-status.util';
import { AllergyFilterService } from './allergy-filter/allergy-filter.service';
import { AnalyzeMenuRequestDto } from './dto/analyze-menu-request.dto';
import { AnalyzeMenuResponseDto, MenuAnalysisSummaryItem, MenuStatus } from './dto/analyze-menu-response.dto';
import { ConflictDetailDto, MenuAnalysisDetailDto } from './dto/menu-analysis-detail-response.dto';
import { MenuMatchingService } from './menu-matching/menu-matching.service';
import { VisionAiService } from './vision-ai/vision-ai.service';

const AI_FALLBACK_NOTICE_MESSAGE = 'AI가 추정한 퓨전/신규 메뉴입니다. 매장에 원재료를 한 번 더 확인하세요.';
const INGREDIENT_ALLERGY_AI_NOTICE = '재료에 대한 알러지 정보를 AI로부터 가져왔습니다.';

/**
 * Service 계층 - 메뉴판 분석 오케스트레이터(Orchestrator).
 * VisionAiService(이미지 → 메뉴명 추출) → MenuMatchingService(DB 매칭) → AllergyFilterService(알레르기 교차검증)
 * 순서로 호출해 각 메뉴의 DANGER/NEEDS_CHECK 상태를 조립하고, 세션ID로 묶어 DB에 저장한다.
 * 저장된 상세 결과는 이후 getAnalysisDetail(세션ID + 메뉴ID)로 조회된다.
 */
@Injectable()
export class MenusService {
  constructor(
    private readonly visionAiService: VisionAiService,
    private readonly menuMatchingService: MenuMatchingService,
    private readonly allergyFilterService: AllergyFilterService,
    @InjectRepository(MenuAnalysisResult)
    private readonly analysisResultRepository: Repository<MenuAnalysisResult>,
  ) {}

  async analyzeMenu(
    imageBuffer: Buffer,
    mimeType: string,
    requestDto: AnalyzeMenuRequestDto,
  ): Promise<AnalyzeMenuResponseDto> {
    // 1단계: Vision AI로 이미지에서 메뉴 항목들을 추출
    const visionResult = await this.visionAiService.analyzeMenuImage(imageBuffer, mimeType);

    // 메뉴판이 아니거나 글자를 인식할 수 없는 이미지는 여기서 바로 실패 처리
    if (!visionResult.isMenu) {
      throw new MenuAnalysisException(
        'INVALID_IMAGE_OR_NOT_MENU',
        '메뉴판을 인식할 수 없습니다. 빛 반사나 흔들림을 피하여 사각형 가이드에 맞게 다시 촬영해 주세요.',
        visionResult.reason ?? 'BLURRY_OR_NO_TEXT',
      );
    }

    const analysisItems: MenuAnalysisDetailDto[] = [];
    for (const item of visionResult.items) {
      // 2단계: 인식된 메뉴명을 DB 표준 메뉴와 매칭 (실패 시 AI로 신규 생성)
      const matchResult = await this.menuMatchingService.match(item.originalNameKo);
      // 3단계: 메뉴의 알레르기와 사용자가 선택한 표준 22종 알레르기를 교차 검증
      const overlapAllergies = this.allergyFilterService.filter(matchResult.allergies, requestDto.allergyIds);
      const conflictDetails = this.buildConflictDetails(matchResult.ingredients, overlapAllergies);

      analysisItems.push(
        this.buildAnalysisItem(
          item.originalNameKo,
          item.translatedNameEn,
          matchResult.menu.dataSource,
          matchResult.isAiFallback,
          matchResult.isIngredientAllergyAiSourced,
          overlapAllergies,
          conflictDetails,
        ),
      );
    }

    // 4단계: 같은 메뉴판 호출의 결과를 하나의 세션ID로 묶어 저장 (상세 조회는 이 row의 id를 menuId로 사용)
    const sessionId = randomUUID();
    const savedResults = await this.analysisResultRepository.save(
      analysisItems.map((item) =>
        this.analysisResultRepository.create({
          sessionId,
          originalNameKo: item.originalNameKo,
          translatedNameEn: item.translatedNameEn,
          status: item.status,
          conflictAllergies: item.conflictAllergies,
          conflictDetails: item.conflictDetails,
          dataSource: item.dataSource as DataSource,
          noticeMessages: item.noticeMessages ?? null,
        }),
      ),
    );

    const resultList: MenuAnalysisSummaryItem[] = savedResults.map((saved) => ({
      menuId: saved.id,
      originalNameKo: saved.originalNameKo,
      translatedNameEn: saved.translatedNameEn,
      status: saved.status as MenuStatus,
    }));

    return { sessionId, menuCount: resultList.length, resultList };
  }

  // 세션ID + 메뉴ID로 저장된 상세 분석 결과 1건을 조회한다.
  // sessionId도 함께 검사하므로 다른 세션의 결과를 menuId만 추측해 조회할 수 없다.
  async getAnalysisDetail(sessionId: string, menuId: number): Promise<MenuAnalysisDetailDto> {
    const result = await this.analysisResultRepository.findOne({ where: { id: menuId, sessionId } });
    if (!result) {
      throw new MenuAnalysisResultNotFoundException(sessionId, menuId);
    }

    return {
      originalNameKo: result.originalNameKo,
      translatedNameEn: result.translatedNameEn,
      status: result.status as MenuStatus,
      conflictAllergies: result.conflictAllergies,
      conflictDetails: result.conflictDetails,
      dataSource: result.dataSource,
      noticeMessages: result.noticeMessages ?? undefined,
    };
  }

  // 겹치는 알레르기마다 "어떤 재료 때문인지"를 구조화한다 (질문하기 카드가 재료명을 물을 때 사용).
  // 표준 22종 알레르기는 menu_ingredient -> ingredient_allergy 경로로 실제 재료를 역추적한다.
  private buildConflictDetails(ingredients: Ingredient[], overlapAllergies: Allergy[]): ConflictDetailDto[] {
    return overlapAllergies.map((allergy) => ({
      allergyLabel: `${allergy.nameKo} (${allergy.nameEn})`,
      ingredientNames: ingredients
        .filter((ingredient) =>
          (ingredient.ingredientAllergies ?? []).some((ia) => Number(ia.allergyId) === Number(allergy.allergyId)),
        )
        .map((ingredient) => ingredient.name),
    }));
  }

  private buildAnalysisItem(
    originalNameKo: string,
    translatedNameEn: string,
    dataSource: DataSource,
    isAiFallback: boolean,
    isIngredientAllergyAiSourced: boolean,
    overlapAllergies: { nameKo: string; nameEn: string }[],
    conflictDetails: ConflictDetailDto[],
  ): MenuAnalysisDetailDto {
    const isAiGenerated = isAiFallback || dataSource === DataSource.AI_GENERATED;
    const hasConflict = overlapAllergies.length > 0;

    // 두 안내 문구는 서로 배타적이지 않다 - AI 생성 메뉴이면서 동시에 재료의 알레르기 분류도 AI 출처일 수 있음
    const noticeMessages: string[] = [];
    if (isAiGenerated) noticeMessages.push(AI_FALLBACK_NOTICE_MESSAGE);
    if (isIngredientAllergyAiSourced) noticeMessages.push(INGREDIENT_ALLERGY_AI_NOTICE);

    // 알레르기 유발 재료가 1개라도 검출되면 DANGER, 그 외에는 전부 NEEDS_CHECK(확인 필요)로 판정한다.
    const status: MenuStatus = deriveMenuStatus(hasConflict);

    const conflictAllergies = isAiGenerated
      ? overlapAllergies.map((a) => `${a.nameKo} (${a.nameEn} - AI 추정)`)
      : overlapAllergies.map((a) => `${a.nameKo} (${a.nameEn})`);

    return {
      originalNameKo,
      translatedNameEn,
      status,
      conflictAllergies,
      conflictDetails,
      dataSource,
      noticeMessages: noticeMessages.length > 0 ? noticeMessages : undefined,
    };
  }
}
