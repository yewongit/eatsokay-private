'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="stack stack--loose">
      <h1 className="page-title">{t('notFound.title')}</h1>
      <Link className="btn btn--primary btn--block" href="/">
        {t('notFound.home')}
      </Link>
    </div>
  );
}
