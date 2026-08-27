/**
 * 백엔드 API 계약 (API 명세.md) 을 그대로 반영한 타입.
 *
 * 주의: 서버의 `allergyId`는 DB bigint 컬럼이라 pg 드라이버 특성상 JSON에서
 * 문자열로 내려온다. 그 정규화는 lib/api.ts 의 응답 경계에서 처리하고,
 * 앱 내부(여기 아래 전부)는 number 로만 다룬다.
 */

export type MenuStatus = 'DANGER' | 'NEEDS_CHECK';

export type DataSource = 'OFFICIAL' | 'AI_GENERATED';

/** 식약처 지정 22종 알레르기 마스터 항목 */
export interface Allergy {
  allergyId: number;
  code: string;
  nameKo: string;
  nameEn: string;
}

/** 어떤 알레르기가 "어떤 재료 때문에" 걸렸는지 */
export interface ConflictDetail {
  allergyLabel: string;
  ingredientNames: string[];
}

/** 이 메뉴에서 검출된 알레르기 유발물질 (사용자 선택으로 필터링되지 않은 원본) */
export interface DetectedAllergy {
  code: string;
  nameKo: string;
  nameEn: string;
}

export interface MenuResult {
  originalNameKo: string;
  translatedNameEn: string;
  status: MenuStatus;
  conflictAllergies: string[];
  conflictDetails: ConflictDetail[];
  ingredients: string[];
  detectedAllergies: DetectedAllergy[];
  dataSource: DataSource;
  noticeMessages?: string[];
  /**
   * 아직 서버가 내려주지 않는 필드. 나중에 서버가 질문 카드 조립을 맡으면
   * 이 필드만 추가되고, 프론트는 "있으면 쓰고 없으면 클라이언트 조립"으로
   * 폴백한다 (FRONTEND_FLOW.md §4.3).
   */
  questionCard?: QuestionCardText;
}

export interface AnalyzeResult {
  menuCount: number;
  resultList: MenuResult[];
}

export interface QuestionCardText {
  ko: string;
  en: string;
}

/** 사용자 알레르기 프로필 (LocalStorage 에만 존재, 서버로 저장되지 않음) */
export interface Profile {
  /** 표준 22종 알레르기 ID */
  allergyIds: number[];
  /** 표준 목록에 없는 사용자 입력 키워드 */
  customAllergies: string[];
  /** 보관 기간 (1~30일) */
  retentionDays: number;
  /** 저장 시각 (epoch ms) */
  savedAt: number;
  /** 만료 시각 (epoch ms) */
  expiresAt: number;
}

/** 프로필 저장 시 사용자가 실제로 입력하는 부분 */
export type ProfileInput = Pick<
  Profile,
  'allergyIds' | 'customAllergies' | 'retentionDays'
>;
