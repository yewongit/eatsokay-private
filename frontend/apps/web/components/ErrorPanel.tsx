'use client';

import { isRetryable, type ErrorCode } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';

interface Props {
  code: ErrorCode;
  /** 서버가 내려준 원문. 디버깅용으로만 작게 노출한다. */
  detail?: string;
  /** 카메라를 다시 여는 동작. 파일 선택창으로 빠지면 촬영 전용 정책이 무너진다. */
  onRetry?: () => void;
  /** INVALID_ALLERGY_ID 처럼 프로필 재설정이 필요한 경우 */
  onGoToProfile?: () => void;
}

export default function ErrorPanel({ code, detail, onRetry, onGoToProfile }: Props) {
  const { t } = useI18n();
  const retryable = isRetryable(code);

  return (
    <section className="error-panel" role="alert" aria-live="assertive">
      <h2 className="error-panel__title">{t(`errors.${code}.title`)}</h2>
      <p className="error-panel__message">{t(`errors.${code}.message`)}</p>

      {retryable && onRetry ? (
        <button type="button" className="btn btn--primary btn--block" onClick={onRetry}>
          {t(`errors.${code}.action`)}
        </button>
      ) : null}

      {!retryable && onGoToProfile ? (
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={onGoToProfile}
        >
          {t(`errors.${code}.action`)}
        </button>
      ) : null}

      {detail ? <p className="error-panel__detail">{detail}</p> : null}
    </section>
  );
}
