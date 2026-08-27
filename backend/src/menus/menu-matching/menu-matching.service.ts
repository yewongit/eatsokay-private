import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allergy, DataSource, Ingredient, IngredientAllergy, MenuIngredient, StandardMenu } from '../../entities';
import { levenshteinSimilarity } from '../../common/utils/levenshtein';
import { normalizeIngredientName, normalizeMenuName } from '../../common/utils/normalize-food-name';
import { IngredientResolverService } from '../ingredient-resolver/ingredient-resolver.service';
import { VisionAiService } from '../vision-ai/vision-ai.service';
import { MenuAllergyProfile, MenuMatchResult } from './menu-matching.types';

const LEVENSHTEIN_SIMILARITY_THRESHOLD = 0.9;
// Postgres unique_violation 에러 코드 (동시 요청으로 같은 정규화 메뉴명이 중복 등록되는 경쟁 상태 방어용)
const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * Service 계층 - 메뉴 매칭 및 알레르기 도출 로직.
 * Vision AI가 인식한 메뉴명을 정규화한 뒤 DB의 표준 메뉴(StandardMenu)와 매칭한다.
 * 매칭 우선순위: 정규화된 이름 기준 정확 일치 → Levenshtein 유사도(90% 이상) → 매칭 실패 시 AI로 재료를 추론해 신규 메뉴로 캐싱.
 * "재료+메인메뉴명" 조합(예: 새우 김치찌개)은 기존 메뉴(김치찌개)와 절대 동일시하지 않고 항상 별도 메뉴로 취급한다 -
 * 부분 문자열/느슨한 유사도로 다른 메뉴를 같다고 판단하면 추가된 재료(알레르기)가 누락되는 것이 가장 위험하기 때문이다.
 * 알레르기는 항상 menu_ingredient -> ingredient_allergy -> allergy 경로의 결정론적 조회로만 산출한다(AI가 메뉴의 알레르기를 직접 판단하지 않음).
 */
@Injectable()
export class MenuMatchingService {
  constructor(
    @InjectRepository(StandardMenu)
    private readonly standardMenuRepository: Repository<StandardMenu>,
    @InjectRepository(MenuIngredient)
    private readonly menuIngredientRepository: Repository<MenuIngredient>,
    @InjectRepository(Allergy)
    private readonly allergyRepository: Repository<Allergy>,
    private readonly visionAiService: VisionAiService,
    private readonly ingredientResolverService: IngredientResolverService,
  ) {}

  async match(originalNameKo: string): Promise<MenuMatchResult> {
    // 이후 모든 비교(정확 일치, 유사도 비교, 신규 등록)는 이 정규화된 이름 하나로 일관되게 처리한다.
    const normalizedName = normalizeMenuName(originalNameKo);
    const matchedMenu = await this.findExactOrSimilarMenu(normalizedName);

    let menu: StandardMenu;
    let ingredients: Ingredient[];
    let isAiFallback: boolean;

    if (matchedMenu && matchedMenu.menuIngredients.length > 0) {
      // Case 1: DB에서 메뉴도 찾았고, 재료 정보도 이미 등록되어 있는 경우
      menu = matchedMenu;
      ingredients = matchedMenu.menuIngredients.map((mi) => mi.ingredient);
      isAiFallback = false;
    } else {
      // Case 2: 메뉴를 못 찾았거나, 찾았어도 재료 정보가 빈 값인 경우
      menu = matchedMenu ?? (await this.createAiGeneratedMenu(normalizedName));
      ingredients = await this.inferAndCacheIngredients(menu, normalizedName);
      isAiFallback = true;
    }

    // 알레르기 목록과 AI 출처 여부는 Case 1/2 관계없이 항상 같은 방식(실제 저장된 dataSource 기준)으로 판단한다.
    // isAiFallback은 "이번 요청에서 AI를 호출했는가"만 알려주지만, 이 플래그는 "과거에 캐싱된 것 포함해서 이 메뉴의
    // 실제 데이터가 AI 출처인가"를 알려주므로 UI에 신뢰도 안내 문구를 띄우는 데 이 플래그를 사용해야 정확하다.
    const [allergies, isIngredientAllergyAiSourced] = await Promise.all([
      this.findAllergiesForMenu(menu.menuId),
      this.hasAiGeneratedIngredientAllergy(menu.menuId),
    ]);

    return { menu, allergies, ingredients, isAiFallback, isIngredientAllergyAiSourced };
  }

  // 메뉴 정보와 재료 정보, 재료의 알레르기 정보까지 이미 DB에 완성되어 존재하는 상태에서 사용하는 조회 함수
  // menuId만으로 메뉴/재료/알레르기 프로필을 조회한다. match()와 달리 이름 매칭이나 AI 추론을 전혀 수행하지 않으며,
  // FK로 이미 menuId가 확정된 경우(예: 식당-메뉴 매핑)에 사용한다. 존재하지 않는 menuId는 null을 반환한다.
  async getAllergyProfileByMenuId(menuId: number): Promise<MenuAllergyProfile | null> {
    const menu = await this.standardMenuRepository.findOne({
      where: { menuId },
      relations: { menuIngredients: { ingredient: true } },
    });
    if (!menu) return null;

    const ingredients = menu.menuIngredients.map((mi) => mi.ingredient);
    const allergies = await this.findAllergiesForMenu(menuId);

    return { menu, ingredients, allergies };
  }

  // 정규화된 이름 기준으로 정확 일치를 우선 찾고, 없으면 Levenshtein 유사도가 임계값(90%) 이상인 것 중 가장 유사한 메뉴를 찾는다.
  // 두 비교 모두 같은 정규화 기준을 써야 하므로 한 번의 전체 조회로 같이 처리한다(기존 데이터의 표기가 정규화되어 있지 않아도 비교 시점에 정규화해서 맞춘다).
  private async findExactOrSimilarMenu(normalizedName: string): Promise<StandardMenu | null> {
    const candidates = await this.standardMenuRepository.find({
      relations: { menuIngredients: { ingredient: { ingredientAllergies: true } } },
    });

    let best: { menu: StandardMenu; score: number } | null = null;
    for (const candidate of candidates) {
      const normalizedCandidateName = normalizeMenuName(candidate.name);
      if (normalizedCandidateName === normalizedName) {
        return candidate;
      }

      const score = levenshteinSimilarity(normalizedName, normalizedCandidateName);
      if (score >= LEVENSHTEIN_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { menu: candidate, score };
      }
    }

    return best?.menu ?? null;
  }

  // 인식된 메뉴명이 전혀 DB에 없을 때 실행되는 함수. name 컬럼의 unique 제약을 이용해 동시성 경쟁을 방어한다:
  // 같은 정규화된 이름이 동시에 두 번 등록 시도되면 두 번째 insert는 유니크 제약 위반으로 실패하고,
  // 이 경우 그 사이 먼저 등록된 행을 그대로 재사용한다(중복 행 생성 방지).
  private async createAiGeneratedMenu(normalizedName: string): Promise<StandardMenu> {
    try {
      return await this.standardMenuRepository.save(
        this.standardMenuRepository.create({ name: normalizedName, dataSource: DataSource.AI_GENERATED }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION) {
        const existing = await this.standardMenuRepository.findOne({ where: { name: normalizedName } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  // [AI 호출 #1 - 메뉴당 1회] 메뉴 → 대표 재료 추론 후, 재료별로 사전 조회/신규 생성(IngredientResolverService)을 거쳐 menu_ingredient에 캐싱
  private async inferAndCacheIngredients(menu: StandardMenu, name: string): Promise<Ingredient[]> {
    // VisionAiService를 호출하여 메뉴에 대해 들어가는 대표 재료 이름들을 요청
    const inference = await this.visionAiService.inferMenuIngredients(name);
    // 재료명을 정규화된 형태로 먼저 중복 제거한다 - 정규화 전 문자열 기준으로 중복 제거하면
    // "돼지고기"/"돼지 고기"처럼 표기만 다른 같은 재료가 서로 다른 항목으로 남아 두 번 처리(중복 링크 시도)될 수 있다.
    const uniqueNames = Array.from(
      new Set(inference.ingredients.map((n) => normalizeIngredientName(n)).filter(Boolean)),
    );

    // 가져온 재료 목록을 하나씩 돌며 이미 DB에 재료가 존재하는지 확인
    const ingredients: Ingredient[] = [];
    for (const ingredientName of uniqueNames) {
      // 사전에 있으면 재사용(AI 호출 없음), 없으면 이 재료에 대해서만 AI 분류를 1회 실행 (IngredientResolverService 내부에서 처리)
      const ingredient = await this.ingredientResolverService.resolveIngredient(ingredientName);
      ingredients.push(ingredient);

      await this.linkIngredientToMenu(menu.menuId, ingredient.ingredientId);
    }

    return ingredients;
  }

  // menu_ingredient 관계를 DB-level conflict 처리로 안전하게 확정한다.
  // (menu_id, ingredient_id) 복합 PK 덕분에, 동시에 같은 관계를 만들려는 요청이 여러 개 들어와도
  // INSERT ... ON CONFLICT DO NOTHING(orIgnore)로 인해 예외 없이 하나만 실제로 insert되고 나머지는 조용히 무시된다.
  // "findOne으로 존재 확인 후 insert" 방식은 두 요청이 동시에 findOne을 통과할 수 있어 그 사이 경쟁 상태가 생기지만,
  // 이 방식은 DB의 PK 제약이 최종 방어선이 되므로 그 경쟁 자체가 발생하지 않는다.
  private async linkIngredientToMenu(menuId: number, ingredientId: number): Promise<MenuIngredient> {
    await this.menuIngredientRepository
      .createQueryBuilder()
      .insert()
      .into(MenuIngredient)
      .values({ menuId, ingredientId, dataSource: DataSource.AI_GENERATED })
      .orIgnore()
      .execute();

    // 이번 호출이 실제로 insert했는지, 다른 요청이 먼저 insert해서 무시됐는지와 관계없이
    // 이 시점엔 row가 반드시 존재하므로 다시 조회해서 확정된 관계를 반환한다(신규/기존 분기 불필요).
    const link = await this.menuIngredientRepository.findOne({ where: { menuId, ingredientId } });
    if (!link) {
      throw new Error(`menu_ingredient 관계 확정에 실패했습니다. menuId=${menuId}, ingredientId=${ingredientId}`);
    }
    return link;
  }

  // 메뉴의 알레르기를 항상 이 쿼리 하나로 도출한다 (menu_ingredient -> ingredient_allergy -> allergy, 중복 제거)
  // Case 1(캐시 히트)과 Case 2(AI 추론 후 캐싱)가 동일한 쿼리를 재사용하므로 결과의 일관성이 보장된다.
  private async findAllergiesForMenu(menuId: number): Promise<Allergy[]> {
    return this.allergyRepository
      .createQueryBuilder('allergy')
      .innerJoin(IngredientAllergy, 'ia', 'ia.allergyId = allergy.allergyId')
      .innerJoin(MenuIngredient, 'mi', 'mi.ingredientId = ia.ingredientId')
      .where('mi.menuId = :menuId', { menuId })
      .distinct(true)
      .orderBy('allergy.allergyId', 'ASC')
      .getMany();
  }

  // 이 메뉴에 연결된 재료들의 ingredient_allergy 매핑 중 AI가 분류한 게 하나라도 있는지
  // (화면에 "알러지 정보를 AI로부터 가져왔다" 안내용. 검증된 메뉴라도 재료 하나가 AI 분류였다면 true가 될 수 있음)
  private async hasAiGeneratedIngredientAllergy(menuId: number): Promise<boolean> {
    const count = await this.menuIngredientRepository
      .createQueryBuilder('mi')
      .innerJoin(IngredientAllergy, 'ia', 'ia.ingredientId = mi.ingredientId')
      .where('mi.menuId = :menuId', { menuId })
      .andWhere('ia.dataSource = :source', { source: DataSource.AI_GENERATED })
      .getCount();
    return count > 0;
  }
}
