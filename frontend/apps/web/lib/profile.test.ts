import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETENTION_DAYS,
  MAX_CUSTOM_ALLERGIES,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  clampRetentionDays,
  isProfileEmpty,
  normalizeCustomAllergies,
  remainingDays,
} from './profile';
import type { Profile } from './types';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    allergyIds: [5],
    customAllergies: [],
    retentionDays: 7,
    savedAt: 0,
    expiresAt: 0,
    ...overrides,
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe('clampRetentionDays', () => {
  it('1~30일 범위로 가둔다', () => {
    expect(clampRetentionDays(0)).toBe(MIN_RETENTION_DAYS);
    expect(clampRetentionDays(-5)).toBe(MIN_RETENTION_DAYS);
    expect(clampRetentionDays(999)).toBe(MAX_RETENTION_DAYS);
    expect(clampRetentionDays(7)).toBe(7);
  });

  it('숫자가 아니면 기본값으로 돌린다', () => {
    expect(clampRetentionDays(Number.NaN)).toBe(DEFAULT_RETENTION_DAYS);
  });
});

describe('normalizeCustomAllergies', () => {
  it('공백을 다듬고 빈 값을 버린다', () => {
    expect(normalizeCustomAllergies([' 참기름 ', '', '   '])).toEqual(['참기름']);
  });

  it('대소문자 무시하고 중복을 제거하되 입력 순서를 지킨다', () => {
    expect(normalizeCustomAllergies(['Sesame', '생강', 'sesame'])).toEqual([
      'Sesame',
      '생강',
    ]);
  });

  it('개수 상한을 넘기지 않는다', () => {
    const many = Array.from({ length: 30 }, (_, i) => `키워드${i}`);
    expect(normalizeCustomAllergies(many)).toHaveLength(MAX_CUSTOM_ALLERGIES);
  });

  it('지나치게 긴 키워드를 자른다 (질문 카드가 읽을 수 없게 길어진다)', () => {
    const long = 'ㄱ'.repeat(50);
    expect(normalizeCustomAllergies([long])[0]).toHaveLength(20);
  });
});

describe('remainingDays', () => {
  it('남은 일수를 올림으로 계산한다', () => {
    const now = 1_000_000;
    expect(remainingDays(profile({ expiresAt: now + 5 * DAY }), now)).toBe(5);
    expect(remainingDays(profile({ expiresAt: now + 5.2 * DAY }), now)).toBe(6);
  });

  it('만료 직전은 1일로 보여준다', () => {
    const now = 1_000_000;
    expect(remainingDays(profile({ expiresAt: now + 1000 }), now)).toBe(1);
  });

  it('이미 만료되었으면 0', () => {
    const now = 1_000_000;
    expect(remainingDays(profile({ expiresAt: now - 1 }), now)).toBe(0);
  });
});

describe('isProfileEmpty', () => {
  it('표준·커스텀이 모두 비었을 때만 true', () => {
    expect(isProfileEmpty(null)).toBe(true);
    expect(isProfileEmpty(profile({ allergyIds: [], customAllergies: [] }))).toBe(true);
    expect(isProfileEmpty(profile({ allergyIds: [], customAllergies: ['참기름'] }))).toBe(
      false,
    );
    expect(isProfileEmpty(profile({ allergyIds: [5] }))).toBe(false);
  });
});
