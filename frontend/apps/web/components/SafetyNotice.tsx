'use client';

import { useI18n } from '@/lib/i18n';

/**
 * 안전 고지. 결과 화면 상단에 **접히지 않고 항상** 표시된다.
 * 접거나 닫는 기능을 추가하지 말 것 — 수용 기준 위반이다.
 */
export default function SafetyNotice({ sticky = false }: { sticky?: boolean }) {
  const { t } = useI18n();

  return (
    <section
      className={`safety-notice${sticky ? ' safety-notice--sticky' : ''}`}
      aria-labelledby="safety-notice-title"
    >
      <h2 className="safety-notice__title" id="safety-notice-title">
        {t('safety.noticeTitle')}
      </h2>
      <p className="safety-notice__body">{t('safety.notice')}</p>
    </section>
  );
}
