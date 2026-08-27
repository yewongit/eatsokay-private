'use client';

import {
  createSnapshot,
  readRaw,
  removeRaw,
  useStorageValue,
  writeRaw,
  type Loadable,
} from './client-storage';
import type { Profile, ProfileInput } from './types';

const PROFILE_KEY = 'kfood-lens.profile.v1';

export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 30;
export const DEFAULT_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 커스텀 키워드 입력 폭주 방지 (질문 카드가 읽을 수 없게 길어진다) */
export const MAX_CUSTOM_ALLERGIES = 10;
export const MAX_CUSTOM_ALLERGY_LENGTH = 20;

export function clampRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_RETENTION_DAYS;
  return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, Math.round(days)));
}

/** 공백 제거 + 중복 제거 + 개수/길이 제한. 순서는 사용자 입력 순서를 유지한다. */
export function normalizeCustomAllergies(input: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const kw = raw.trim().slice(0, MAX_CUSTOM_ALLERGY_LENGTH);
    if (!kw) continue;
    const key = kw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
    if (out.length >= MAX_CUSTOM_ALLERGIES) break;
  }
  return out;
}

/** 알 수 없는 형태의 저장값을 걸러낸다 (스키마 변경·수동 편집 대비) */
function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;

  const savedAt = Number(p.savedAt);
  const expiresAt = Number(p.expiresAt);
  if (!Number.isFinite(savedAt) || !Number.isFinite(expiresAt)) return null;

  // 만료된 프로필은 없는 것으로 취급한다. 실제 삭제는 purgeExpiredProfile() 이 한다
  // (스냅샷 함수는 부수효과가 없어야 한다).
  if (Date.now() > expiresAt) return null;

  return {
    allergyIds: Array.isArray(p.allergyIds)
      ? p.allergyIds.map(Number).filter((n) => Number.isFinite(n))
      : [],
    customAllergies: Array.isArray(p.customAllergies)
      ? normalizeCustomAllergies(p.customAllergies.map((v) => String(v)))
      : [],
    retentionDays: clampRetentionDays(Number(p.retentionDays)),
    savedAt,
    expiresAt,
  };
}

const profileSnapshot = createSnapshot('local', PROFILE_KEY, parseProfile);

/**
 * 저장된 프로필을 읽는다 (React 밖에서 쓰는 경로 — 예: 분석 요청 조립).
 * 만료·손상된 값은 null 이다.
 */
export function loadProfile(): Profile | null {
  return parseProfile(readRaw('local', PROFILE_KEY));
}

/**
 * 프로필을 React 상태로 구독한다.
 *
 * 반환값 3가지를 반드시 구분할 것:
 *   undefined → 아직 읽지 않음 (SSR/하이드레이션). 이때 리다이렉트하면 안 된다.
 *   null      → 저장된 프로필이 없거나 만료됨 → /profile 로 보낸다.
 *   Profile   → 사용 가능
 */
export function useProfile(): Loadable<Profile | null> {
  return useStorageValue(profileSnapshot);
}

export function saveProfile(input: ProfileInput): Profile {
  const retentionDays = clampRetentionDays(input.retentionDays);
  const savedAt = Date.now();
  const profile: Profile = {
    allergyIds: [...new Set(input.allergyIds)].sort((a, b) => a - b),
    customAllergies: normalizeCustomAllergies(input.customAllergies),
    retentionDays,
    savedAt,
    expiresAt: savedAt + retentionDays * DAY_MS,
  };

  writeRaw('local', PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function clearProfile(): void {
  removeRaw('local', PROFILE_KEY);
}

/**
 * 만료된 프로필을 실제로 지운다. 화면 진입 시 한 번 호출한다.
 * "만료되면 자동 삭제" 요건(FRONTEND_FLOW.md §만료 로직)을 여기서 만족시킨다.
 */
export function purgeExpiredProfile(): void {
  const raw = readRaw('local', PROFILE_KEY);
  if (raw && parseProfile(raw) === null) clearProfile();
}

/** 남은 보관 기간(일). 만료 직전은 최소 1일로 표시한다. */
export function remainingDays(profile: Profile, now: number = Date.now()): number {
  const left = profile.expiresAt - now;
  if (left <= 0) return 0;
  return Math.max(1, Math.ceil(left / DAY_MS));
}

/** 알레르기를 하나도 선택하지 않은 프로필인지 (질문 카드 문구 분기에 쓴다) */
export function isProfileEmpty(profile: Profile | null): boolean {
  if (!profile) return true;
  return profile.allergyIds.length === 0 && profile.customAllergies.length === 0;
}
