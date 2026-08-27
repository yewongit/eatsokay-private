'use client';

import { useSyncExternalStore } from 'react';

/**
 * 브라우저 저장소(LocalStorage / SessionStorage)를 React 상태로 읽는 얇은 레이어.
 *
 * 왜 useEffect + setState 가 아니라 useSyncExternalStore 인가:
 *  - 저장소는 React 밖의 외부 시스템이다. 효과에서 읽어 setState 하면 렌더가
 *    한 번 더 캐스케이드되고, React 19 의 set-state-in-effect 규칙도 이를 막는다.
 *  - SSR/하이드레이션 렌더에는 getServerSnapshot 값을 쓰므로 마크업 불일치가 없다.
 *
 * 서버 스냅샷은 `undefined` 로 통일한다. 화면은 `undefined`(아직 읽지 않음) 과
 * `null`(읽었지만 없음) 을 구분해야 한다 — 이를 구분하지 않으면 하이드레이션
 * 시점에 "프로필 없음"으로 오판해 엉뚱한 곳으로 리다이렉트한다.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** 우리 코드가 저장소를 바꿨을 때 구독자에게 알린다 (같은 탭은 storage 이벤트가 안 온다). */
export function notifyStorageChanged(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // 다른 탭에서의 변경도 반영한다.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export type Loadable<T> = T | undefined;

export function readRaw(storage: 'local' | 'session', key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    return store.getItem(key);
  } catch {
    // 시크릿 모드 · 저장소 차단 환경
    return null;
  }
}

export function writeRaw(
  storage: 'local' | 'session',
  key: string,
  value: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    store.setItem(key, value);
  } catch {
    // 저장 실패는 조용히 넘긴다. 이번 세션 동작을 막을 이유는 없다.
  }
  notifyStorageChanged();
}

export function removeRaw(storage: 'local' | 'session', key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    store.removeItem(key);
  } catch {
    // ignore
  }
  notifyStorageChanged();
}

/**
 * 저장소 값을 읽는 스냅샷 함수를 만든다.
 *
 * useSyncExternalStore 는 getSnapshot 이 **같은 참조**를 돌려주길 요구한다.
 * 매번 JSON.parse 하면 새 객체가 나와 무한 렌더가 된다. 그래서 raw 문자열이
 * 바뀔 때만 파싱하고 결과를 캐시한다.
 */
export function createSnapshot<T>(
  storage: 'local' | 'session',
  key: string,
  parse: (raw: string | null) => T,
): () => T {
  let cachedRaw: string | null = null;
  let cached: T;
  let initialized = false;

  return () => {
    const raw = readRaw(storage, key);
    if (!initialized || raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parse(raw);
      initialized = true;
    }
    return cached;
  };
}

/** 스냅샷 함수를 React 상태로 구독한다. */
export function useStorageValue<T>(getSnapshot: () => T): Loadable<T> {
  return useSyncExternalStore<Loadable<T>>(subscribe, getSnapshot, () => undefined);
}
