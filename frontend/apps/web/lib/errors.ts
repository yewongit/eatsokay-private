/**
 * 서버 에러와 클라이언트 에러를 하나의 타입으로 다룬다.
 * 화면은 `code`로 locales 를 조회해 사용자 문구를 얻고,
 * `message`(서버 원문)는 폴백으로만 쓴다.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly reason?: string;
  readonly status?: number;

  constructor(params: {
    code: string;
    message: string;
    reason?: string;
    status?: number;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.reason = params.reason;
    this.status = params.status;
  }
}

/** locales 의 `errors.*` 키로 매핑되는 코드. 명세에 없는 코드는 UNKNOWN 으로 떨어진다. */
export const ERROR_CODES = [
  'INVALID_IMAGE_OR_NOT_MENU',
  'UNSUPPORTED_MEDIA_TYPE',
  'IMAGE_TOO_LARGE',
  'INVALID_ALLERGY_ID',
  'AI_TIMEOUT',
  'AI_PROVIDER_ERROR',
  'RATE_LIMITED',
  'NETWORK',
  'TIMEOUT',
  'UNKNOWN',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

function isKnownCode(code: string): code is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(code);
}

/** locales 에 문구가 있는 코드로 좁힌다. 없으면 UNKNOWN. */
export function toErrorCode(code: string | undefined): ErrorCode {
  return code && isKnownCode(code) ? code : 'UNKNOWN';
}

/**
 * 이 에러가 "다시 촬영"으로 복구 가능한지.
 * INVALID_ALLERGY_ID 만 프로필 재설정이 필요하므로 예외다.
 */
export function isRetryable(code: ErrorCode): boolean {
  return code !== 'INVALID_ALLERGY_ID';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ code: 'TIMEOUT', message: 'Request timed out' });
  }
  return new ApiError({
    code: 'NETWORK',
    message: error instanceof Error ? error.message : String(error),
  });
}
