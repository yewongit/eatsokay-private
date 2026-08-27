import { describe, expect, it } from 'vitest';
import { buildQuestionCard, cleanMenuName } from './question-card';
import type { Allergy, MenuResult, Profile } from './types';

const MASTER: Allergy[] = [
  { allergyId: 5, code: 'SOYBEAN', nameKo: '대두', nameEn: 'Soybean' },
  { allergyId: 6, code: 'WHEAT', nameKo: '밀', nameEn: 'Wheat' },
  { allergyId: 10, code: 'SHRIMP', nameKo: '새우', nameEn: 'Shrimp' },
];

function menu(overrides: Partial<MenuResult> = {}): MenuResult {
  return {
    originalNameKo: '김치찌개',
    translatedNameEn: 'Kimchi Stew',
    status: 'DANGER',
    conflictAllergies: [],
    conflictDetails: [],
    ingredients: [],
    detectedAllergies: [],
    dataSource: 'OFFICIAL',
    ...overrides,
  };
}

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    allergyIds: [5, 6],
    customAllergies: ['참기름'],
    retentionDays: 7,
    savedAt: 0,
    expiresAt: 0,
    ...overrides,
  };
}

describe('cleanMenuName', () => {
  it('메뉴명 뒤에 붙은 가격을 떼어낸다', () => {
    expect(cleanMenuName('김치찌개 8,000')).toBe('김치찌개');
    expect(cleanMenuName('김치찌개 8,000원')).toBe('김치찌개');
    expect(cleanMenuName('김치찌개 ₩8,000')).toBe('김치찌개');
    expect(cleanMenuName('김치찌개 8000')).toBe('김치찌개');
  });

  it('점선 리더와 목록 번호를 떼어낸다', () => {
    expect(cleanMenuName('떡볶이 ..... 6,000')).toBe('떡볶이');
    expect(cleanMenuName('1. 김치찌개')).toBe('김치찌개');
    expect(cleanMenuName('3) 제육볶음 9,000')).toBe('제육볶음');
  });

  it('가격이 여러 개 붙어도 모두 떼어낸다', () => {
    expect(cleanMenuName('제육볶음 6,000 / 8,000')).toBe('제육볶음');
  });

  it('메뉴명에 원래 포함된 수량 표기는 건드리지 않는다', () => {
    expect(cleanMenuName('김밥 2인분')).toBe('김밥 2인분');
    expect(cleanMenuName('삼겹살 1인분')).toBe('삼겹살 1인분');
  });

  it('가격만 남는 경우에는 원문을 그대로 쓴다 (이름을 잃는 것이 더 나쁘다)', () => {
    expect(cleanMenuName('8,000')).toBe('8,000');
  });

  it('빈 값을 안전하게 처리한다', () => {
    expect(cleanMenuName('')).toBe('');
    expect(cleanMenuName('   ')).toBe('');
  });
});

describe('buildQuestionCard', () => {
  it('표준 알레르기는 한국어 카드에 nameKo, 영문 카드에 nameEn 으로 넣는다', () => {
    const card = buildQuestionCard(menu(), profile(), MASTER);
    expect(card.ko).toContain('대두, 밀');
    expect(card.en).toContain('Soybean, Wheat');
  });

  it('매칭 실패한 커스텀 키워드도 반드시 포함한다 (이 기능의 존재 이유)', () => {
    const card = buildQuestionCard(
      menu(),
      profile({ allergyIds: [], customAllergies: ['참기름', '생강'] }),
      MASTER,
    );
    expect(card.ko).toContain('참기름');
    expect(card.ko).toContain('생강');
    // 커스텀 키워드는 영문 카드에서도 입력 원문 그대로다 (앱이 번역하지 않는다).
    expect(card.en).toContain('참기름');
  });

  it('마스터에 없는 allergyId 는 조용히 건너뛴다', () => {
    const card = buildQuestionCard(
      menu(),
      profile({ allergyIds: [5, 999], customAllergies: [] }),
      MASTER,
    );
    expect(card.ko).toContain('대두');
    expect(card.ko).not.toContain('undefined');
  });

  it('문구는 항상 \\n 3덩어리 구조를 유지한다', () => {
    for (const p of [profile(), profile({ allergyIds: [], customAllergies: [] })]) {
      const card = buildQuestionCard(menu(), p, MASTER);
      expect(card.ko.split('\n')).toHaveLength(3);
      expect(card.en.split('\n')).toHaveLength(3);
    }
  });

  it('메뉴명은 가격을 뗀 이름을 쓴다', () => {
    const card = buildQuestionCard(
      menu({ originalNameKo: '김치찌개 8,000' }),
      profile(),
      MASTER,
    );
    expect(card.ko).toContain('이 김치찌개을(를) 먹어도 되나요?');
    expect(card.ko).not.toContain('8,000');
  });

  it('알레르기를 하나도 선택하지 않으면 재료 확인 요청 문구로 대체한다', () => {
    const card = buildQuestionCard(
      menu(),
      profile({ allergyIds: [], customAllergies: [] }),
      MASTER,
    );
    // 버튼을 숨기지 않으므로 문구가 반드시 만들어져야 한다.
    expect(card.ko).toContain('재료를 확인해야 합니다');
    expect(card.ko).toContain('김치찌개');
    expect(card.en).toContain('Kimchi Stew');
    // 알레르기 목록이 비어 "저는  알레르기가" 처럼 새는 일이 없어야 한다.
    expect(card.ko).not.toMatch(/저는\s{2,}/);
  });

  it('프로필 자체가 없어도 카드를 만든다', () => {
    const card = buildQuestionCard(menu(), null, MASTER);
    expect(card.ko.split('\n')).toHaveLength(3);
    expect(card.en).toContain('Kimchi Stew');
  });

  it('영문명이 없으면 영문 카드도 한글 메뉴명으로 폴백한다', () => {
    const card = buildQuestionCard(menu({ translatedNameEn: '' }), profile(), MASTER);
    expect(card.en).toContain('김치찌개');
  });

  it('이모지·마크다운 장식을 넣지 않는다', () => {
    const card = buildQuestionCard(menu(), profile(), MASTER);
    for (const text of [card.ko, card.en]) {
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text).not.toMatch(/[*_#`~]/);
    }
  });

  it('서버가 questionCard 를 내려주면 그 값을 그대로 쓴다', () => {
    const served = { ko: '서버 문구', en: 'server text' };
    const card = buildQuestionCard(menu({ questionCard: served }), profile(), MASTER);
    expect(card).toEqual(served);
  });

  it('서버 questionCard 가 반쪽이면 클라이언트 조립으로 폴백한다', () => {
    const card = buildQuestionCard(
      menu({ questionCard: { ko: '서버 문구', en: '' } }),
      profile(),
      MASTER,
    );
    expect(card.en).toContain('Soybean');
  });

  it('중복된 알레르기명을 한 번만 넣는다', () => {
    const card = buildQuestionCard(
      menu(),
      profile({ allergyIds: [5], customAllergies: ['대두'] }),
      MASTER,
    );
    expect(card.ko.match(/대두/g)).toHaveLength(1);
  });
});
