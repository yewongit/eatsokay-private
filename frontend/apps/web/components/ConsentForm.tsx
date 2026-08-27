'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface Props {
  onAgree: () => void;
}

/**
 * 온보딩 동의. 두 항목 모두 체크해야 시작할 수 있다.
 * - 이미지가 분석을 위해 서버로 전송된다는 사실
 * - 결과가 의학적 조언이 아니며 매장 확인이 필요하다는 사실
 */
export default function ConsentForm({ onAgree }: Props) {
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState(false);
  const [limit, setLimit] = useState(false);
  const [showError, setShowError] = useState(false);

  const allChecked = analysis && limit;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!allChecked) {
      setShowError(true);
      return;
    }
    onAgree();
  }

  return (
    <form className="card stack" onSubmit={handleSubmit} noValidate>
      <h2 className="card__title">{t('onboarding.consentTitle')}</h2>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={analysis}
          onChange={(e) => {
            setAnalysis(e.target.checked);
            setShowError(false);
          }}
        />
        <span>{t('onboarding.consentAnalysis')}</span>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={limit}
          onChange={(e) => {
            setLimit(e.target.checked);
            setShowError(false);
          }}
        />
        <span>{t('onboarding.consentLimit')}</span>
      </label>

      {showError ? (
        <p className="warn-box" role="alert">
          {t('onboarding.consentRequired')}
        </p>
      ) : null}

      {/* 버튼을 disabled 로 막지 않고 눌렀을 때 이유를 알려준다.
          disabled 버튼은 스크린리더가 이유를 읽어주지 못한다. */}
      <button
        type="submit"
        className="btn btn--primary btn--xl btn--block"
        aria-describedby={showError ? undefined : 'consent-hint'}
      >
        {t('onboarding.start')}
      </button>
      <p className="sr-only" id="consent-hint">
        {t('onboarding.consentRequired')}
      </p>
    </form>
  );
}
