'use client';

import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { MAX_CUSTOM_ALLERGIES, MAX_CUSTOM_ALLERGY_LENGTH } from '@/lib/profile';

interface Props {
  keywords: readonly string[];
  onChange: (keywords: string[]) => void;
}

/**
 * 표준 22종에 없는 재료 키워드.
 *
 * 이 입력이 중요한 이유: 서버가 매칭에 실패해도 이 키워드는 질문 카드 문구에
 * 그대로 들어간다. 시스템이 못 잡는 걸 사람이 잡게 하는 통로다.
 */
export default function CustomAllergyInput({ keywords, onChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const inputId = useId();

  const atLimit = keywords.length >= MAX_CUSTOM_ALLERGIES;

  function add() {
    const kw = draft.trim().slice(0, MAX_CUSTOM_ALLERGY_LENGTH);
    if (!kw || atLimit) return;
    const exists = keywords.some((k) => k.toLowerCase() === kw.toLowerCase());
    if (!exists) onChange([...keywords, kw]);
    setDraft('');
  }

  function remove(target: string) {
    onChange(keywords.filter((k) => k !== target));
  }

  return (
    <section className="card stack" aria-labelledby="custom-allergy-title">
      <div>
        <h2 className="card__title" id="custom-allergy-title">
          {t('profile.customTitle')}
        </h2>
        <p className="card__hint">{t('profile.customHint')}</p>
      </div>

      <div className="input-row">
        <label className="sr-only" htmlFor={inputId}>
          {t('profile.customTitle')}
        </label>
        <input
          id={inputId}
          className="text-input"
          type="text"
          value={draft}
          maxLength={MAX_CUSTOM_ALLERGY_LENGTH}
          placeholder={t('profile.customPlaceholder')}
          disabled={atLimit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // form 안에 있으므로 Enter 가 submit 으로 새지 않게 막는다.
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="btn btn--secondary"
          onClick={add}
          disabled={atLimit || draft.trim().length === 0}
        >
          {t('profile.customAdd')}
        </button>
      </div>

      {atLimit ? (
        <p className="warn-box">
          {t('profile.customLimit', { max: MAX_CUSTOM_ALLERGIES })}
        </p>
      ) : null}

      {keywords.length === 0 ? (
        <p className="muted">{t('profile.customEmpty')}</p>
      ) : (
        <ul className="tag-list" aria-live="polite">
          {keywords.map((kw) => (
            <li key={kw} className="tag tag--removable">
              <span>{kw}</span>
              <button
                type="button"
                className="tag__remove"
                aria-label={t('profile.customRemove', { keyword: kw })}
                onClick={() => remove(kw)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
