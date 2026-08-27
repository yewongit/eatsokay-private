'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CameraCapture, { type CameraCaptureHandle } from '@/components/CameraCapture';
import ErrorPanel from '@/components/ErrorPanel';
import LoadingBlock from '@/components/LoadingBlock';
import SafetyNotice from '@/components/SafetyNotice';
import { analyzeMenu, getAllergies } from '@/lib/api';
import { useConsent } from '@/lib/consent';
import { toApiError, toErrorCode, type ErrorCode } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { purgeExpiredProfile, remainingDays, useProfile } from '@/lib/profile';
import { clearResult, saveResult } from '@/lib/result-store';

/**
 * 스캔 화면 (/scan) — 촬영 전용.
 *
 * 갤러리 선택 진입점을 절대 추가하지 말 것. 입력 경로는 CameraCapture 안의
 * `capture="environment"` input 하나뿐이고, 모든 재시도는 그 input 을 다시 연다
 * (FRONTEND_FLOW.md §2 · 프론트 수용 기준).
 */
export default function ScanPage() {
  const router = useRouter();
  const { t } = useI18n();

  const cameraRef = useRef<CameraCaptureHandle>(null);
  const consented = useConsent();
  const profile = useProfile();
  const [analyzing, setAnalyzing] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | undefined>();

  // 만료된 프로필을 실제로 지운다. useProfile 은 만료된 값을 이미 null 로 준다.
  useEffect(() => {
    purgeExpiredProfile();
  }, []);

  useEffect(() => {
    if (consented === undefined || profile === undefined) return; // 아직 읽는 중
    if (!consented) router.replace('/');
    else if (!profile) router.replace('/profile');
  }, [consented, profile, router]);

  // 결과 화면에서 질문 카드를 조립할 때 필요하므로 마스터를 미리 받아 캐시한다.
  // 실패해도 촬영을 막지 않는다 — /result 에서 다시 시도한다.
  useEffect(() => {
    void getAllergies().catch(() => undefined);
  }, []);

  const handleCapture = useCallback(
    async (file: File) => {
      setErrorCode(null);
      setErrorDetail(undefined);
      setAnalyzing(true);
      try {
        const result = await analyzeMenu(file, profile ?? null);
        saveResult(result);
        router.push('/result');
      } catch (error) {
        const apiError = toApiError(error);
        setErrorCode(toErrorCode(apiError.code));
        setErrorDetail(apiError.reason ?? apiError.message);
        clearResult();
      } finally {
        setAnalyzing(false);
      }
      // File 참조는 여기서 끝난다. 어디에도 저장하지 않는다.
    },
    [profile, router],
  );

  // 저장소를 읽는 중이거나, 프로필이 없어 /profile 로 넘어가는 중
  if (consented === undefined || !profile) {
    return <LoadingBlock title={t('common.loading')} />;
  }

  if (analyzing) {
    return (
      <div className="stack stack--loose">
        <LoadingBlock title={t('scan.analyzing')} hint={t('scan.analyzingHint')} />
        <SafetyNotice />
      </div>
    );
  }

  const standardCount = profile.allergyIds.length;
  const custom = profile.customAllergies;

  return (
    <div className="stack stack--loose">
      <h1 className="page-title">{t('scan.title')}</h1>

      {/* 저장된 프로필 요약 — 지금 무슨 기준으로 분석되는지 항상 보이게 한다. */}
      <section className="card stack stack--tight" aria-labelledby="scan-profile-title">
        <h2 className="card__title" id="scan-profile-title">
          {t('scan.myProfile')}
        </h2>

        <p className="summary-row">
          <span className="summary-row__label">{t('scan.standardLabel')}</span>
          <span>
            {standardCount > 0
              ? t('scan.standardValue', { count: standardCount })
              : t('scan.noneSelected')}
          </span>
        </p>

        <p className="summary-row">
          <span className="summary-row__label">{t('scan.customLabel')}</span>
          <span>{custom.length > 0 ? custom.join(', ') : t('scan.noneSelected')}</span>
        </p>

        <p className="caption">{t('scan.remaining', { days: remainingDays(profile) })}</p>

        <Link className="btn btn--ghost" href="/profile">
          {t('scan.editProfile')}
        </Link>
      </section>

      {errorCode ? (
        <ErrorPanel
          code={errorCode}
          detail={errorDetail}
          // 재시도는 파일 선택창이 아니라 카메라를 다시 연다.
          onRetry={() => {
            setErrorCode(null);
            setErrorDetail(undefined);
            cameraRef.current?.open();
          }}
          onGoToProfile={() => router.push('/profile')}
        />
      ) : null}

      <CameraCapture
        ref={cameraRef}
        label={errorCode ? t('scan.recapture') : t('scan.capture')}
        onCapture={(file) => void handleCapture(file)}
        onValidationError={(code) => {
          setErrorCode(code);
          setErrorDetail(undefined);
        }}
      />

      <p className="caption">{t('scan.desktopHint')}</p>

      <SafetyNotice />
    </div>
  );
}
