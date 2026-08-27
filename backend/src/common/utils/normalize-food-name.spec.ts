import { normalizeIngredientName, normalizeMenuName } from './normalize-food-name';

describe('normalizeIngredientName', () => {
  it('공백 표기(내부/양끝/2칸 이상)가 달라도 동일한 결과로 정규화된다', () => {
    const expected = '돼지고기';

    expect(normalizeIngredientName('돼지고기')).toBe(expected);
    expect(normalizeIngredientName('돼지 고기')).toBe(expected);
    expect(normalizeIngredientName(' 돼지고기')).toBe(expected);
    expect(normalizeIngredientName('돼지  고기')).toBe(expected);
  });
});

describe('normalizeMenuName', () => {
  it('메뉴명도 재료명과 동일한 규칙(공백 제거)으로 정규화된다', () => {
    expect(normalizeMenuName('김치 찌개')).toBe('김치찌개');
    expect(normalizeMenuName('  김치찌개  ')).toBe('김치찌개');
  });

  it('공백 외에 실제로 다른 단어가 포함된 메뉴명은 정규화 후에도 여전히 다르게 유지된다', () => {
    // "재료+메인메뉴명" 조합을 기존 메뉴와 동일시하면 추가된 알러지 유발 재료가 누락될 수 있어
    // 정규화가 단어 자체를 지우지 않는다는 걸 보장해야 한다.
    expect(normalizeMenuName('새우 김치찌개')).not.toBe(normalizeMenuName('김치찌개'));
  });
});
