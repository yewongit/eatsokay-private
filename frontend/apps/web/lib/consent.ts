'use client';

import {
  createSnapshot,
  readRaw,
  removeRaw,
  useStorageValue,
  writeRaw,
  type Loadable,
} from './client-storage';

const CONSENT_KEY = 'kfood-lens.consent.v1';

const consentSnapshot = createSnapshot('local', CONSENT_KEY, (raw) => raw === 'true');

/** React 밖에서 쓰는 경로 */
export function hasConsented(): boolean {
  return readRaw('local', CONSENT_KEY) === 'true';
}

/**
 * 동의 여부를 React 상태로 구독한다.
 * undefined 는 "아직 읽지 않음" 이므로 이때 리다이렉트하면 안 된다.
 */
export function useConsent(): Loadable<boolean> {
  return useStorageValue(consentSnapshot);
}

export function setConsented(): void {
  writeRaw('local', CONSENT_KEY, 'true');
}

export function clearConsent(): void {
  removeRaw('local', CONSENT_KEY);
}
