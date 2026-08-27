'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingBlock from '@/components/LoadingBlock';
import MenuCard from '@/components/MenuCard';
import SafetyNotice from '@/components/SafetyNotice';
import { getAllergies } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { useAnalyzeResult } from '@/lib/result-store';
import type { Allergy } from '@/lib/types';

/**
 * 결과 화면 (/result).
 *
 * 여기가 여정의 종착지가 아니다. 결과 카드는 "확인이 필요하다"까지만 말하고,
 * 실제 확인은 각 카드의 "직원에게 보여주기" → 질문 카드로 이어진다.
 */
export default function ResultPage() {
  const router = useRouter();
  const { t } = useI18n();

  const result = useAnalyzeResult();
  const profile = useProfile() ?? null;
  const [allergyMaster, setAllergyMaster] = useState<Allergy[]>([]);

  // 결과가 없으면(직접 URL 진입·탭 재시작) 촬영 화면으로 되돌린다.
  useEffect(() => {
    if (result === null) router.replace('/scan');
  }, [result, router]);

  // 질문 카드 문구에 쓸 nameKo/nameEn 을 확보한다.
  // 실패하면 표준 알레르기명이 빠지지만, 커스텀 키워드만으로도 카드는 뜬다.
  useEffect(() => {
    let alive = true;
    void getAllergies()
      .then((list) => {
        if (alive) setAllergyMaster(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /** 내가 선택한 알레르기를 마스터와 조인해 이름으로 보여준다. */
  const myAllergyNames = useMemo(() => {
    if (!profile) return [];
    const byId = new Map(allergyMaster.map((a) => [a.allergyId, a]));
    const standard = profile.allergyIds
      .map((id) => byId.get(id)?.nameKo)
      .filter((n): n is string => Boolean(n));
    return [...standard, ...profile.customAllergies];
  }, [profile, allergyMaster]);

  if (!result) {
    return <LoadingBlock title={t('common.loading')} />;
  }

  const menus = result.resultList;

  return (
    <div className="stack stack--loose">
      {/* 상단 고정 · 접히지 않음 */}
      <SafetyNotice sticky />

      <div>
        <h1 className="page-title">{t('result.title')}</h1>
        <p className="page-subtitle">
          {t('result.menuCount', { count: menus.length })}
        </p>
      </div>

      <section className="card stack stack--tight" aria-labelledby="my-allergies-title">
        <h2 className="card__title" id="my-allergies-title">
          {t('result.myAllergies')}
        </h2>
        {myAllergyNames.length > 0 ? (
          <ul className="tag-list">
            {myAllergyNames.map((name, i) => (
              <li className="tag" key={`${name}-${i}`}>
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="warn-box">{t('result.myAllergiesNone')}</p>
        )}
      </section>

      {menus.length === 0 ? (
        <section className="card stack">
          <h2 className="card__title">{t('result.empty')}</h2>
          <p className="muted">{t('result.emptyHint')}</p>
        </section>
      ) : (
        <ul className="stack">
          {menus.map((menu, i) => (
            <li key={`${menu.originalNameKo}-${i}`}>
              <MenuCard menu={menu} profile={profile} allergyMaster={allergyMaster} />
            </li>
          ))}
        </ul>
      )}

      <div className="btn-row btn-row--inline">
        <Link className="btn btn--primary btn--block" href="/scan">
          {t('result.rescan')}
        </Link>
        <Link className="btn btn--secondary btn--block" href="/profile">
          {t('result.editProfile')}
        </Link>
      </div>
    </div>
  );
}
