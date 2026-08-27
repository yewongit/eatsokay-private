'use client';

import { useId } from 'react';
import { LOCALES, LOCALE_LABELS, useI18n, type Locale } from '@/lib/i18n';

/**
 * UI 언어 선택. 질문 카드의 한국어/English 전환과는 별개다 —
 * 질문 카드는 직원이 읽는 화면이므로 항상 ko/en 두 가지만 제공한다.
 */
export default function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();
  const id = useId();

  return (
    <div className="lang-select">
      <label className="sr-only" htmlFor={id}>
        {t('common.language')}
      </label>
      <select
        id={id}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
