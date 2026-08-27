import { ApiError, toApiError } from './errors';
import type { Allergy, AnalyzeResult, Profile } from './types';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

/** 메뉴 분석은 AI 호출 2회가 들어가므로 넉넉하게 잡는다. */
const ANALYZE_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;

/** 서버 공통 응답 포맷 (API 명세.md §공통 응답 포맷) */
type ApiEnvelope<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; reason?: string };
    };

/**
 * 공통 응답 포맷을 풀고, success=false 면 ApiError 로 던진다.
 * 서버가 5xx 로 HTML/빈 본문을 줄 수도 있으므로 JSON 파싱 실패까지 감싼다.
 */
async function unwrap<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (body && body.success === true) return body.data;

  if (body && body.success === false) {
    throw new ApiError({
      code: body.error?.code ?? 'UNKNOWN',
      message: body.error?.message ?? 'Unknown error',
      reason: body.error?.reason,
      status: res.status,
    });
  }

  // 응답이 공통 포맷조차 아닌 경우 (프록시 에러, 502 HTML 등)
  throw new ApiError({
    code: 'UNKNOWN',
    message: `Unexpected response (HTTP ${res.status})`,
    status: res.status,
  });
}

/**
 * `allergyId` 는 DB bigint 라서 문자열로 내려온다 (API 명세.md).
 * 앱 내부는 number 로만 다루므로 이 경계에서 정규화한다.
 */
function normalizeAllergy(raw: unknown): Allergy | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = Number(r.allergyId);
  if (!Number.isFinite(id)) return null;
  return {
    allergyId: id,
    code: String(r.code ?? ''),
    nameKo: String(r.nameKo ?? ''),
    nameEn: String(r.nameEn ?? ''),
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/allergies
// ---------------------------------------------------------------------------

const ALLERGY_CACHE_KEY = 'kfood-lens.allergies.v1';

/** 같은 탭 안에서의 중복 호출 방지 (result 화면이 다시 필요로 한다) */
let allergyMemo: Allergy[] | null = null;
let allergyInflight: Promise<Allergy[]> | null = null;

function readAllergyCache(): Allergy[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ALLERGY_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const list = parsed.map(normalizeAllergy).filter((a): a is Allergy => a !== null);
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

function writeAllergyCache(list: Allergy[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ALLERGY_CACHE_KEY, JSON.stringify(list));
  } catch {
    // 시크릿 모드 등 저장 실패는 무시 — 메모리 캐시로 충분하다.
  }
}

/**
 * 알레르기 마스터 22종.
 * /profile 에서 선택지로, /result 에서 질문 카드 문구 조립에 재사용하므로
 * 탭 세션 동안 캐시한다.
 */
export async function getAllergies(): Promise<Allergy[]> {
  if (allergyMemo) return allergyMemo;

  const cached = readAllergyCache();
  if (cached) {
    allergyMemo = cached;
    return cached;
  }

  if (allergyInflight) return allergyInflight;

  allergyInflight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/allergies`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      const data = await unwrap<unknown[]>(res);
      const list = (Array.isArray(data) ? data : [])
        .map(normalizeAllergy)
        .filter((a): a is Allergy => a !== null);
      allergyMemo = list;
      writeAllergyCache(list);
      return list;
    } catch (error) {
      throw toApiError(error);
    } finally {
      allergyInflight = null;
    }
  })();

  return allergyInflight;
}

// ---------------------------------------------------------------------------
// POST /api/v1/menus/analyze
// ---------------------------------------------------------------------------

/**
 * 메뉴판 이미지 분석.
 * 프로필이 비어 있어도(알레르기 미선택) 호출 가능하다 — 그 경우 서버는
 * 모든 메뉴를 NEEDS_CHECK 로 돌려주고, 사용자는 질문 카드로 확인한다.
 */
export async function analyzeMenu(
  image: File,
  profile: Pick<Profile, 'allergyIds' | 'customAllergies'> | null,
): Promise<AnalyzeResult> {
  const form = new FormData();
  form.append('image', image);

  const allergyIds = profile?.allergyIds ?? [];
  if (allergyIds.length > 0) {
    form.append('allergyIds', allergyIds.join(','));
  }

  const customAllergies = (profile?.customAllergies ?? [])
    .map((kw) => kw.trim())
    .filter(Boolean);
  if (customAllergies.length > 0) {
    form.append('customAllergies', customAllergies.join(','));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/menus/analyze`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      // Content-Type 은 브라우저가 boundary 와 함께 자동으로 넣는다. 직접 넣으면 깨진다.
      body: form,
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
    });
    const data = await unwrap<AnalyzeResult>(res);
    return {
      menuCount: Number(data?.menuCount ?? data?.resultList?.length ?? 0),
      resultList: Array.isArray(data?.resultList) ? data.resultList : [],
    };
  } catch (error) {
    throw toApiError(error);
  }
}
