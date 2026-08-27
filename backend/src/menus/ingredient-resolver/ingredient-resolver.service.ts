import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allergy, DataSource, Ingredient, IngredientAllergy } from '../../entities';
import { normalizeIngredientName } from '../../common/utils/normalize-food-name';
import { VisionAiService } from '../vision-ai/vision-ai.service';

/**
 * Service 계층 - 재료 사전 조회/생성.
 * 재료명이 ingredient 마스터에 이미 있으면 그대로 재사용(결정론적, AI 호출 없음)하고,
 * 시스템에서 처음 등장한 재료라면 AI에게 22종 알레르기 분류를 딱 1회 요청해 ingredient/ingredient_allergy에 캐싱한다.
 * 이후 동일한 재료명이 다시 등장하면 이 서비스는 항상 캐싱된 결과만 반환하므로, AI 호출은 재료 종류 수만큼만 발생한다.
 */
@Injectable()
export class IngredientResolverService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientAllergy)
    private readonly ingredientAllergyRepository: Repository<IngredientAllergy>,
    @InjectRepository(Allergy)
    private readonly allergyRepository: Repository<Allergy>,
    private readonly visionAiService: VisionAiService,
  ) {}

  async resolveIngredient(rawName: string): Promise<Ingredient> {
    // 조회와 저장에 항상 같은 정규화 규칙을 적용한다 - 조회에서만 정규화하고 저장은 다른 규칙(혹은 무규칙)을 쓰면
    // "돼지고기"/"돼지 고기"처럼 표기만 다른 같은 재료가 서로 다른 row로 중복 생성될 수 있다.
    const name = normalizeIngredientName(rawName);

    // 1. DB 사전 조회 (재료가 DB에 있는지)
    const existing = await this.ingredientRepository.findOne({ where: { name } });
    if (existing) return existing;

    // 2. 재료가 DB에 없으면 AI 호출 및 신규 등록 (정규화된 이름으로 저장)
    return this.createFromAiClassification(name);
  }

  // DB에 없는 신규 재료일 때만 실행되는 메서드
  // 신규 재료를 AI_GENERATED/미검증 상태로 생성하고, AI가 분류한 알레르기 코드를 ingredient_allergy에 저장
  private async createFromAiClassification(name: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.save(
      this.ingredientRepository.create({ name, dataSource: DataSource.AI_GENERATED }),
    ); //Ingredient 테이블에 재료명과 AI가 생성했다고 저장

    // VisionAiService를 호출하여 "이 재료가 22종 알레르기 중 어디에 해당하는가?"를 AI에게 물어봄
    // 응답으로 알레르기 코드 배열을 전달받음
    const classification = await this.visionAiService.classifyIngredientAllergies(name);

    // AI가 알레르기 없음이라고 판단한 경우, DB 조회를 하지 않고 즉시 빈 배열을 할당
    // 매칭된 알레르기가 있다면 IngredientAllergy에 (재료ID, 알레르기ID) 관계를 저장
    // TypeORM find()의 where에 빈 배열을 넘기면 조건이 하나도 안 걸려 "전체 행"이 반환된다(OR 조건 0개 = 필터 없음).
    // AI가 "이 재료는 해당 알레르기가 없음"(matchedCodes: [])이라고 정확히 판단한 경우, 이 가드가 없으면
    // 오히려 22종 알레르기 전체가 매핑되는 정반대의 결과가 캐싱되어버린다.
    const matchedAllergies =
      classification.matchedCodes.length === 0
        ? []
        : await this.allergyRepository.find({
            where: classification.matchedCodes.map((code) => ({ code })),
          });

    if (matchedAllergies.length > 0) {
      await this.ingredientAllergyRepository.save(
        matchedAllergies.map((allergy) =>
          this.ingredientAllergyRepository.create({
            ingredientId: ingredient.ingredientId,
            allergyId: allergy.allergyId,
            dataSource: DataSource.AI_GENERATED,
          }),
        ),
      );
    }

    return ingredient;
  }
}
