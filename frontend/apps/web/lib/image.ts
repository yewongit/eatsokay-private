import type { ErrorCode } from './errors';

/** 서버 왕복을 아끼기 위한 클라이언트 사전 검증 (FRONTEND_FLOW.md §2) */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * iOS 기본 촬영 포맷이 HEIC 이므로 반드시 포함한다. 변환은 서버(sharp)가 담당한다.
 * `.heic` 는 브라우저가 MIME 을 모르고 빈 문자열로 주는 경우가 흔해서
 * 확장자 폴백까지 둔다.
 */
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

/** `<input accept>` 에 그대로 넣는 값 */
export const ACCEPT_ATTRIBUTE = 'image/*,.heic,.heif';

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * 업로드 전 검증. 통과하면 null, 실패하면 locales `errors.*` 로 바로 이어지는
 * 에러 코드를 반환한다.
 */
export function validateImageFile(file: File): ErrorCode | null {
  if (file.size > MAX_IMAGE_BYTES) return 'IMAGE_TOO_LARGE';
  if (file.size === 0) return 'UNSUPPORTED_MEDIA_TYPE';

  const type = file.type.toLowerCase();
  if (type && (ACCEPTED_MIME_TYPES as readonly string[]).includes(type)) return null;

  // HEIC 등 MIME 을 못 읽는 브라우저는 확장자로 판단한다.
  if (!type && hasAcceptedExtension(file.name)) return null;

  // image/* 지만 목록에 없는 포맷(avif, tiff 등)도 확장자가 맞으면 통과시킨다.
  if (type.startsWith('image/') && hasAcceptedExtension(file.name)) return null;

  return 'UNSUPPORTED_MEDIA_TYPE';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
