'use client';

interface Props {
  title: string;
  hint?: string;
}

export default function LoadingBlock({ title, hint }: Props) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="loading-block__title">{title}</p>
      {hint ? <p className="loading-block__hint">{hint}</p> : null}
    </div>
  );
}
