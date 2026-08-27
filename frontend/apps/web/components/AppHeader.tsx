'use client';

import Link from 'next/link';
import LanguageSelect from './LanguageSelect';
import { useI18n } from '@/lib/i18n';

export default function AppHeader() {
  const { t } = useI18n();

  return (
    <>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <header className="app-header">
        <Link className="app-header__brand" href="/">
          {t('common.appName')}
        </Link>
        <LanguageSelect />
      </header>
    </>
  );
}
