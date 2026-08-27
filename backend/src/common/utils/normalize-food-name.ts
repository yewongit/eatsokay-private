/**
 * OCR/Vision AI가 추출한 메뉴명·재료명의 표기 노이즈(유니코드 표기 차이, 공백)를 제거해
 * 매칭/조회/저장 전 비교 기준을 하나로 통일하는 순수 규칙 기반 정규화. AI를 호출하지 않는다.
 * 메뉴명과 재료명은 같은 정규화 규칙(유니코드 NFC + 공백 전체 제거)을 쓰므로 하나의 구현을 공유한다.
 * 단어 자체는 건드리지 않으므로 "김치찌개"와 "새우 김치찌개"는 정규화 후에도 여전히 다른 문자열이다.
 */
function normalizeFoodName(name: string): string {
  return name.normalize('NFC').replace(/\s+/g, '');
}

export function normalizeMenuName(name: string): string {
  return normalizeFoodName(name);
}

export function normalizeIngredientName(name: string): string {
  return normalizeFoodName(name);
}
