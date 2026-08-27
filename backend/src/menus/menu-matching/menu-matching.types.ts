import { Allergy, Ingredient, StandardMenu } from '../../entities';

// MenuMatchingService의 매칭 결과 타입 정의
export interface MenuMatchResult {
  menu: StandardMenu;
  allergies: Allergy[];
  ingredients: Ingredient[];
  isAiFallback: boolean;
  // 이 메뉴에 연결된 재료들의 ingredient_allergy 매핑 중 AI가 분류한 것이 하나라도 있는지
  isIngredientAllergyAiSourced: boolean;
}

// MenuMatchingService.getAllergyProfileByMenuId의 조회 결과 타입 정의 (menuId 기반 직접 조회용, 매칭 메타데이터 없음)
export interface MenuAllergyProfile {
  menu: StandardMenu;
  ingredients: Ingredient[];
  allergies: Allergy[];
}
