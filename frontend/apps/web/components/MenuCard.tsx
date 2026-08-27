'use client';

import { useMemo, useState } from 'react';
import QuestionCardModal from './QuestionCardModal';
import { useI18n } from '@/lib/i18n';
import { buildQuestionCard, cleanMenuName } from '@/lib/question-card';
import type { Allergy, MenuResult, Profile } from '@/lib/types';

interface Props {
  menu: MenuResult;
  profile: Profile | null;
  allergyMaster: readonly Allergy[];
}

export default function MenuCard({ menu, profile, allergyMaster }: Props) {
  const { t } = useI18n();
  const [cardOpen, setCardOpen] = useState(false);

  const isDanger = menu.status === 'DANGER';

  const questionCard = useMemo(
    () => buildQuestionCard(menu, profile, allergyMaster),
    [menu, profile, allergyMaster],
  );

  const menuNameKo = cleanMenuName(menu.originalNameKo);
  const menuNameEn = cleanMenuName(menu.translatedNameEn) || menuNameKo;

  const notices = menu.noticeMessages ?? [];
  const conflicts = menu.conflictDetails ?? [];
  const ingredients = menu.ingredients ?? [];
  const detected = menu.detectedAllergies ?? [];

  return (
    <article
      className={`menu-card ${isDanger ? 'menu-card--danger' : 'menu-card--needs-check'}`}
    >
      <header className="menu-card__head">
        {/* 색만으로 상태를 전달하지 않도록 배지에 텍스트를 함께 넣는다. */}
        <span className={`badge ${isDanger ? 'status-danger' : 'status-needs-check'}`}>
          {isDanger ? t('menu.statusDanger') : t('menu.statusNeedsCheck')}
        </span>

        <div>
          <h3 className="menu-card__name">{menu.originalNameKo}</h3>
          {menu.translatedNameEn ? (
            <p className="menu-card__name-en" lang="en">
              {menu.translatedNameEn}
            </p>
          ) : null}
        </div>

        <p className="menu-card__status-hint">
          {isDanger ? t('menu.statusDangerHint') : t('menu.statusNeedsCheckHint')}
        </p>
      </header>

      <div className="menu-card__body">
        {/* 겹치는 항목 — 걸리는 게 있을 때만 (NEEDS_CHECK 는 비어 있다) */}
        {conflicts.length > 0 ? (
          <section className="info-block">
            <h4 className="info-block__title">{t('menu.conflictTitle')}</h4>
            <ul className="conflict-list">
              {conflicts.map((detail, i) => (
                <li className="conflict-item" key={`${detail.allergyLabel}-${i}`}>
                  <p className="conflict-item__label">{detail.allergyLabel}</p>
                  {detail.ingredientNames.length > 0 ? (
                    <p className="conflict-item__because">
                      {t('menu.conflictBecause')}: {detail.ingredientNames.join(', ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 재료 — 사용자 선택과 무관하게 항상 노출 */}
        <section className="info-block">
          <h4 className="info-block__title">{t('menu.ingredientsTitle')}</h4>
          {ingredients.length > 0 ? (
            <ul className="tag-list">
              {ingredients.map((name, i) => (
                <li className="tag" key={`${name}-${i}`}>
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="info-block__empty">{t('menu.ingredientsEmpty')}</p>
          )}
        </section>

        {/* 검출된 알레르기 — 사용자 선택으로 필터링되지 않은 원본 */}
        <section className="info-block">
          <h4 className="info-block__title">{t('menu.detectedTitle')}</h4>
          {detected.length > 0 ? (
            <ul className="detected-list">
              {detected.map((allergy, i) => (
                <li className="detected-item" key={`${allergy.code || allergy.nameKo}-${i}`}>
                  {allergy.nameKo}{' '}
                  <span className="detected-item__en" lang="en">
                    {allergy.nameEn}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="info-block__empty">{t('menu.detectedEmpty')}</p>
          )}
        </section>

        <section className="info-block">
          <p className="source-line">
            <span className="info-block__title">{t('menu.sourceTitle')}</span>
            {/* OFFICIAL 은 "공식"이 아니라 "표준 레시피 기준"으로 표기한다.
                "공식"은 매장이 보증한다는 오해를 준다. */}
            <span className="source-line__value">
              {menu.dataSource === 'OFFICIAL'
                ? t('menu.sourceOfficial')
                : t('menu.sourceAiGenerated')}
            </span>
          </p>
        </section>

        {/* 서버가 준 안내 문구를 그대로 노출한다 (요약·가공 금지) */}
        {notices.length > 0 ? (
          <section className="notice-list">
            <h4 className="notice-list__title">{t('menu.noticeTitle')}</h4>
            <ul className="stack stack--tight">
              {notices.map((message, i) => (
                <li key={`${message}-${i}`}>{message}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* 모든 카드에 항상 노출된다. NEEDS_CHECK 는 "안전"이 아니라
          "확인이 필요하다"는 뜻이고, 그 확인 수단이 이 버튼이다. */}
      <footer className="menu-card__foot">
        <button
          type="button"
          className="btn btn--primary btn--xl btn--block"
          onClick={() => setCardOpen(true)}
        >
          {t('menu.showToStaff')}
        </button>
      </footer>

      {cardOpen ? (
        <QuestionCardModal
          text={questionCard}
          menuNameKo={menuNameKo}
          menuNameEn={menuNameEn}
          onClose={() => setCardOpen(false)}
        />
      ) : null}
    </article>
  );
}
