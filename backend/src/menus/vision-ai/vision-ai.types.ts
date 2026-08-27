// VisionAiService의 요청/응답에 사용되는 타입 정의
export interface VisionMenuItem {
  originalNameKo: string;
  translatedNameEn: string;
}

export interface VisionAnalysisResult {
  isMenu: boolean;
  reason?: string;
  items: VisionMenuItem[];
}

// 메뉴 → 대표 재료 추론 결과 (Chain of Thought용 reasoning 포함)
export interface MenuIngredientInferenceResult {
  reasoning: string;
  ingredients: string[];
}

// 신규 재료 → 22종 알레르기 코드 분류 결과 (재료 하나당 시스템 전체에서 단 1회만 호출됨)
export interface IngredientAllergyClassificationResult {
  reasoning: string;
  matchedCodes: string[];
}
