'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/lib/i18n';
import type { QuestionCardText } from '@/lib/types';

interface Props {
  text: QuestionCardText;
  /** 문구 안에서 크게 강조할 메뉴명 (ko/en 각각) */
  menuNameKo: string;
  menuNameEn: string;
  onClose: () => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 매장 직원에게 그대로 보여주는 전체 화면 카드.
 *
 * 설계 제약 (FRONTEND_FLOW.md §4) — 장식을 추가하지 말 것:
 * - 흰 배경 / 검정 글자. 명암비 21:1 로 최대치를 쓴다.
 * - 본문 28px, 메뉴명 34px. 1~2m 거리에서 읽힌다는 전제다.
 * - 이모지·마크다운·배지·아이콘·그림자·애니메이션 없음.
 * - `white-space: pre-line` 으로 문구의 `\n` 3덩어리를 그대로 렌더한다.
 *
 * 접근성: role="dialog", aria-modal, 포커스 트랩, ESC 닫기, 닫을 때 포커스 복원.
 */
export default function QuestionCardModal({
  text,
  menuNameKo,
  menuNameEn,
  onClose,
}: Props) {
  const { t } = useI18n();
  // 직원이 읽는 화면이므로 항상 한국어로 먼저 보여준다.
  const [lang, setLang] = useState<'ko' | 'en'>('ko');

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 열릴 때 포커스를 가져오고, 닫힐 때 원래 버튼으로 돌려준다.
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previousFocusRef.current?.focus?.();
  }, []);

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.dataset.modalOpen = 'true';
    return () => {
      delete document.body.dataset.modalOpen;
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      // 포커스 트랩: 모달 밖으로 Tab 이 새지 않게 순환시킨다.
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  // 이 모달은 사용자가 버튼을 누른 뒤에만 렌더되므로 SSR/하이드레이션 경로를
  // 타지 않는다. 그래도 document 접근 전에 한 번 막아 둔다.
  if (typeof document === 'undefined') return null;

  const body = lang === 'ko' ? text.ko : text.en;
  const menuName = lang === 'ko' ? menuNameKo : menuNameEn;

  return createPortal(
    <div
      className="question-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('questionCard.title')}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
    >
      <div className="question-modal__bar">
        <button
          type="button"
          className="question-modal__lang"
          aria-pressed={lang === 'ko'}
          onClick={() => setLang('ko')}
        >
          {t('questionCard.langKo')}
        </button>
        <button
          type="button"
          className="question-modal__lang"
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
        >
          {t('questionCard.langEn')}
        </button>
      </div>

      <div className="question-modal__scroll">
        {/* lang 속성을 실제 문구 언어에 맞춰야 스크린리더 발음이 맞다. */}
        <p className="question-card" lang={lang}>
          {emphasizeMenuName(body, menuName)}
        </p>
      </div>

      <div className="question-modal__foot">
        <p className="question-modal__hint">{t('questionCard.brightnessHint')}</p>
        <button
          ref={closeButtonRef}
          type="button"
          className="question-modal__close"
          onClick={onClose}
        >
          {t('questionCard.close')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 문구 안의 메뉴명만 34px 로 키운다.
 *
 * 문자열 자체는 건드리지 않는다 — 스크린샷으로 저장했을 때 텍스트가 템플릿과
 * 100% 같아야 하고, `\n` 3덩어리 구조도 그대로 유지된다. 글자 크기만 바뀐다.
 */
function emphasizeMenuName(body: string, menuName: string): ReactNode {
  if (!menuName) return body;

  const at = body.indexOf(menuName);
  if (at === -1) return body;

  return (
    <>
      {body.slice(0, at)}
      <span className="question-card__menu">{menuName}</span>
      {body.slice(at + menuName.length)}
    </>
  );
}
