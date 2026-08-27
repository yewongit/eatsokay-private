/**
 * 표준 메뉴(StandardMenu) 데이터의 출처를 나타내는 Enum.
 * OFFICIAL: 공식 레시피 데이터로 생성됨, OWNER_VERIFIED: 매장 점주가 검증함, AI_GENERATED: 매칭 실패 시 AI가 추정해 생성함.
 */
export enum DataSource {
  OFFICIAL = 'OFFICIAL',
  OWNER_VERIFIED = 'OWNER_VERIFIED',
  AI_GENERATED = 'AI_GENERATED',
}
