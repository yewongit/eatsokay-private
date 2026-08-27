'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { ACCEPT_ATTRIBUTE, validateImageFile } from '@/lib/image';
import type { ErrorCode } from '@/lib/errors';

export interface CameraCaptureHandle {
  /** 카메라를 다시 연다. 모든 재시도 버튼은 반드시 이걸 호출해야 한다. */
  open: () => void;
}

interface Props {
  onCapture: (file: File) => void;
  /** 10MB 초과 · 미지원 포맷을 서버 왕복 없이 걸러낸 결과 */
  onValidationError: (code: ErrorCode) => void;
  disabled?: boolean;
  label: string;
}

/**
 * 메뉴판 이미지의 **유일한** 입력 경로.
 *
 * 촬영 전용 정책 (FRONTEND_FLOW.md §2):
 * - 갤러리 선택 진입점을 만들지 않는다. 여기 있는 input 하나가 전부다.
 * - `capture="environment"` 는 모바일에서 후면 카메라를 바로 여는 힌트다.
 *   데스크톱 브라우저는 이 속성을 무시하고 파일 선택창을 연다 (데모는 모바일로).
 * - `accept` 에 HEIC 를 반드시 포함한다 (iOS 기본 촬영 포맷). 변환은 서버가 한다.
 */
const CameraCapture = forwardRef<CameraCaptureHandle, Props>(function CameraCapture(
  { onCapture, onValidationError, disabled = false, label },
  ref,
) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    open() {
      inputRef.current?.click();
    },
  }));

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // 같은 파일을 다시 선택해도 change 가 발생하도록 값을 비운다.
    // 이게 없으면 "다시 촬영" 후 동일 이미지를 골랐을 때 아무 일도 일어나지 않는다.
    event.target.value = '';

    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      onValidationError(invalid);
      return;
    }

    onCapture(file);
  }

  return (
    <div className="stack stack--tight">
      <div className="camera-guide">
        <div className="camera-guide__frame" aria-hidden="true" />
        <p className="camera-guide__text">{t('scan.guideTitle')}</p>
      </div>

      <ul className="guide-list">
        <li>{t('scan.guideTip1')}</li>
        <li>{t('scan.guideTip2')}</li>
        <li>{t('scan.guideTip3')}</li>
      </ul>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />

      <button
        type="button"
        className="btn btn--primary btn--xl btn--block"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>

      <p className="caption">{t('scan.cameraOnlyHint')}</p>
    </div>
  );
});

export default CameraCapture;
