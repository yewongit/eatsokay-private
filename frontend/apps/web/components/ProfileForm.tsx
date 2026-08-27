'use client';

import { useId, useState } from 'react';
import AllergySelector from './AllergySelector';
import CustomAllergyInput from './CustomAllergyInput';
import { useI18n } from '@/lib/i18n';
import {
  DEFAULT_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  clearProfile,
  saveProfile,
} from '@/lib/profile';
import type { Allergy, Profile } from '@/lib/types';

interface Props {
  allergies: readonly Allergy[];
  /** 저장된 프로필 (수정 진입). 없으면 빈 폼. */
  initial: Profile | null;
  onSaved: () => void;
}

/**
 * 알레르기 프로필 입력 폼.
 *
 * 저장된 값을 효과로 채워 넣지 않고, **프로필을 읽은 뒤에 이 컴포넌트를 마운트**해서
 * useState 초기값으로 한 번에 세팅한다. 효과에서 setState 하면 렌더가 한 번 더
 * 캐스케이드되고, 사용자가 입력하는 중에 저장값이 덮어쓸 위험도 생긴다.
 */
export default function ProfileForm({ allergies, initial, onSaved }: Props) {
  const { t } = useI18n();
  const retentionId = useId();

  const [selectedIds, setSelectedIds] = useState<number[]>(() => initial?.allergyIds ?? []);
  const [customAllergies, setCustomAllergies] = useState<string[]>(
    () => initial?.customAllergies ?? [],
  );
  const [retentionDays, setRetentionDays] = useState(
    () => initial?.retentionDays ?? DEFAULT_RETENTION_DAYS,
  );
  const [cleared, setCleared] = useState(false);

  function toggle(allergyId: number) {
    setSelectedIds((prev) =>
      prev.includes(allergyId)
        ? prev.filter((id) => id !== allergyId)
        : [...prev, allergyId],
    );
    setCleared(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    saveProfile({ allergyIds: selectedIds, customAllergies, retentionDays });
    onSaved();
  }

  function handleClear() {
    clearProfile();
    setSelectedIds([]);
    setCustomAllergies([]);
    setRetentionDays(DEFAULT_RETENTION_DAYS);
    setCleared(true);
  }

  const isEmpty = selectedIds.length === 0 && customAllergies.length === 0;

  return (
    <form className="stack stack--loose" onSubmit={handleSubmit}>
      <AllergySelector
        allergies={allergies}
        selectedIds={selectedIds}
        onToggle={toggle}
      />

      <CustomAllergyInput
        keywords={customAllergies}
        onChange={(next) => {
          setCustomAllergies(next);
          setCleared(false);
        }}
      />

      <section className="card stack" aria-labelledby="retention-title">
        <div>
          <h2 className="card__title" id="retention-title">
            {t('profile.retentionTitle')}
          </h2>
          <p className="card__hint">{t('profile.retentionHint')}</p>
        </div>
        <div className="range-row">
          <label className="sr-only" htmlFor={retentionId}>
            {t('profile.retentionTitle')}
          </label>
          <input
            id={retentionId}
            type="range"
            min={MIN_RETENTION_DAYS}
            max={MAX_RETENTION_DAYS}
            step={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
          />
          <output className="range-row__value" htmlFor={retentionId}>
            {t('profile.retentionValue', { days: retentionDays })}
          </output>
        </div>
      </section>

      {/* 알레르기를 하나도 고르지 않아도 진행을 막지 않는다.
          대신 그 경우 무슨 일이 일어나는지 미리 알려준다. */}
      {isEmpty ? <p className="warn-box">{t('profile.emptyWarning')}</p> : null}

      {cleared ? (
        <p className="warn-box" role="status">
          {t('profile.cleared')}
        </p>
      ) : null}

      <div className="btn-row">
        <button type="submit" className="btn btn--primary btn--xl btn--block">
          {t('profile.save')}
        </button>
        <button
          type="button"
          className="btn btn--danger-outline btn--block"
          onClick={handleClear}
        >
          {t('profile.clear')}
        </button>
      </div>
    </form>
  );
}
