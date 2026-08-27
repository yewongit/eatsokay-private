'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorPanel from '@/components/ErrorPanel';
import LoadingBlock from '@/components/LoadingBlock';
import ProfileForm from '@/components/ProfileForm';
import { getAllergies } from '@/lib/api';
import { useConsent } from '@/lib/consent';
import { toApiError, toErrorCode, type ErrorCode } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { purgeExpiredProfile, useProfile } from '@/lib/profile';
import type { Allergy } from '@/lib/types';

/**
 * 알레르기 프로필 설정 (/profile).
 *
 * 저장 위치는 LocalStorage 뿐이다. 서버는 분석 요청마다 allergyIds 를
 * 받기만 하고 사용자를 식별하거나 저장하지 않는다.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();

  const consented = useConsent();
  const profile = useProfile();

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ErrorCode | null>(null);
  /** 재시도 버튼이 올리는 값. 바뀌면 아래 효과가 다시 돈다. */
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    purgeExpiredProfile();
  }, []);

  // 동의하지 않은 사용자는 온보딩으로 돌려보낸다.
  useEffect(() => {
    if (consented === undefined) return;
    if (!consented) router.replace('/');
  }, [consented, router]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const list = await getAllergies();
        if (alive) setAllergies(list);
      } catch (error) {
        if (alive) setLoadError(toErrorCode(toApiError(error).code));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadToken]);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    setReloadToken((n) => n + 1);
  }

  // 저장소를 읽는 중 (프로필은 폼 초기값이므로 반드시 먼저 확정돼야 한다)
  const storageReady = consented !== undefined && profile !== undefined;

  return (
    <div className="stack stack--loose">
      <div>
        <h1 className="page-title">{t('profile.title')}</h1>
        <p className="page-subtitle">{t('profile.subtitle')}</p>
      </div>

      {loadError ? (
        <ErrorPanel
          code={loadError}
          detail={t('profile.loadFailed')}
          onRetry={retryLoad}
        />
      ) : null}

      {loading || !storageReady ? <LoadingBlock title={t('common.loading')} /> : null}

      {/* 프로필을 읽은 뒤에 폼을 마운트해 저장값을 useState 초기값으로 넣는다.
          알레르기 목록 로딩이 실패해도 폼 자체는 띄운다 — 커스텀 키워드만으로도
          프로필을 저장할 수 있어야 한다. */}
      {storageReady && !loading ? (
        <ProfileForm
          allergies={allergies}
          initial={profile}
          onSaved={() => router.push('/scan')}
        />
      ) : null}
    </div>
  );
}
