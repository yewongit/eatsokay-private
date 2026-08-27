'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConsentForm from '@/components/ConsentForm';
import LoadingBlock from '@/components/LoadingBlock';
import SafetyNotice from '@/components/SafetyNotice';
import { setConsented, useConsent } from '@/lib/consent';
import { useI18n } from '@/lib/i18n';
import { loadProfile, purgeExpiredProfile } from '@/lib/profile';

/**
 * 온보딩 (/).
 *
 * 진입 분기 (FRONTEND_FLOW.md §1):
 *   미동의        → 이 화면에 머문다
 *   동의 + 프로필 → /scan
 *   동의 + 무프로필/만료 → /profile
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const consented = useConsent();

  useEffect(() => {
    // 만료된 프로필은 여기서 실제로 지운다.
    purgeExpiredProfile();
  }, []);

  useEffect(() => {
    if (consented === undefined) return; // 아직 저장소를 읽지 않았다
    if (consented) router.replace(loadProfile() ? '/scan' : '/profile');
  }, [consented, router]);

  function handleAgree() {
    setConsented();
    router.push(loadProfile() ? '/scan' : '/profile');
  }

  // 저장소를 읽는 중이거나, 이미 동의해 다른 화면으로 넘어가는 중
  if (consented === undefined || consented) {
    return <LoadingBlock title={t('common.loading')} />;
  }

  return (
    <div className="stack stack--loose">
      <div>
        <h1 className="page-title">{t('onboarding.title')}</h1>
        <p className="page-subtitle">{t('onboarding.subtitle')}</p>
      </div>

      <ol className="card step-list">
        <li className="step-item">
          <span className="step-item__num" aria-hidden="true">
            1
          </span>
          <div>
            <p className="step-item__title">{t('onboarding.step1Title')}</p>
            <p className="step-item__body">{t('onboarding.step1Body')}</p>
          </div>
        </li>
        <li className="step-item">
          <span className="step-item__num" aria-hidden="true">
            2
          </span>
          <div>
            <p className="step-item__title">{t('onboarding.step2Title')}</p>
            <p className="step-item__body">{t('onboarding.step2Body')}</p>
          </div>
        </li>
        <li className="step-item">
          <span className="step-item__num" aria-hidden="true">
            3
          </span>
          <div>
            <p className="step-item__title">{t('onboarding.step3Title')}</p>
            <p className="step-item__body">{t('onboarding.step3Body')}</p>
          </div>
        </li>
      </ol>

      {/* 이 앱이 "안전"을 말하지 않는다는 사실을 시작 전에 알린다. */}
      <section className="warn-box">
        <h2 className="card__title">{t('onboarding.limitTitle')}</h2>
        <p>{t('onboarding.limitBody')}</p>
      </section>

      <SafetyNotice />

      <ConsentForm onAgree={handleAgree} />
    </div>
  );
}
