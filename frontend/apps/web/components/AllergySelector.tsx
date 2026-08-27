'use client';

import { useId, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Allergy } from '@/lib/types';

interface Props {
  allergies: readonly Allergy[];
  selectedIds: readonly number[];
  onToggle: (allergyId: number) => void;
}

/**
 * 표준 22종 선택. 22개는 스크롤이 길어져 검색을 붙였다.
 * 한글·영문·코드 어느 쪽으로도 찾을 수 있어야 한다 (관광객은 영문으로 찾는다).
 */
export default function AllergySelector({ allergies, selectedIds, onToggle }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const searchId = useId();

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allergies;
    return allergies.filter((a) =>
      [a.nameKo, a.nameEn, a.code].some((field) => field.toLowerCase().includes(q)),
    );
  }, [allergies, query]);

  return (
    <section className="card stack" aria-labelledby="allergy-selector-title">
      <div>
        <h2 className="card__title" id="allergy-selector-title">
          {t('profile.standardTitle')}
        </h2>
        <p className="card__hint">{t('profile.standardHint')}</p>
      </div>

      <div>
        <label className="sr-only" htmlFor={searchId}>
          {t('profile.searchPlaceholder')}
        </label>
        <input
          id={searchId}
          className="text-input"
          type="search"
          value={query}
          placeholder={t('profile.searchPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="caption" aria-live="polite">
        {t('profile.selectedCount', { count: selectedIds.length })}
      </p>

      {filtered.length === 0 ? (
        <p className="muted">{t('profile.searchEmpty')}</p>
      ) : (
        <ul className="chip-grid">
          {filtered.map((allergy) => {
            const isOn = selected.has(allergy.allergyId);
            return (
              <li key={allergy.allergyId}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={isOn}
                  onClick={() => onToggle(allergy.allergyId)}
                >
                  <span className="chip__ko">{allergy.nameKo}</span>
                  <span className="chip__en">{allergy.nameEn}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
