'use client';

import {
  createSnapshot,
  removeRaw,
  useStorageValue,
  writeRaw,
  type Loadable,
} from './client-storage';
import type { AnalyzeResult } from './types';

/**
 * /scan → /result 로 분석 결과를 넘기는 통로.
 *
 * App Router 는 라우트 간에 객체를 직접 넘길 수 없다. sessionStorage 를 쓰면
 * /result 에서 새로고침해도 결과가 살아 있고, 탭을 닫으면 자동으로 사라진다.
 *
 * 촬영 이미지(File)는 절대 저장하지 않는다 — 업로드 후 참조를 버린다
 * (FRONTEND_FLOW.md §LocalStorage 구조).
 */
const RESULT_KEY = 'kfood-lens.result.v1';

function parseResult(raw: string | null): AnalyzeResult | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const r = parsed as Partial<AnalyzeResult>;
    if (!Array.isArray(r.resultList)) return null;
    return {
      menuCount: Number(r.menuCount ?? r.resultList.length),
      resultList: r.resultList,
    };
  } catch {
    return null;
  }
}

const resultSnapshot = createSnapshot('session', RESULT_KEY, parseResult);

export function saveResult(result: AnalyzeResult): void {
  writeRaw('session', RESULT_KEY, JSON.stringify(result));
}

/**
 * undefined → 아직 읽지 않음 / null → 결과 없음 (→ /scan) / AnalyzeResult → 사용 가능
 */
export function useAnalyzeResult(): Loadable<AnalyzeResult | null> {
  return useStorageValue(resultSnapshot);
}

export function clearResult(): void {
  removeRaw('session', RESULT_KEY);
}
