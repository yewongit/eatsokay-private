'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { createSnapshot, useStorageValue, writeRaw } from './client-storage';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import zh from '@/locales/zh.json';

export const LOCALES = ['ko', 'en', 'ja', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

/** ko.json 을 문구의 원본으로 삼는다. 나머지 로케일은 같은 키 구조를 유지해야 한다. */
type Dictionary = typeof ko;

const DICTIONARIES: Record<Locale, Dictionary> = {
  ko,
  en: en as Dictionary,
  ja: ja as Dictionary,
  zh: zh as Dictionary,
};

/** ko.json 의 중첩 구조를 "a.b.c" 형태의 문자열 유니온으로 펼친다. */
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPaths<Dictionary>;

export type TranslateVars = Record<string, string | number>;

const LOCALE_KEY = 'kfood-lens.locale.v1';

function resolve(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** `{count}` 같은 자리표시자를 치환한다. */
function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

/** 브라우저 언어에서 지원 로케일을 추정한다. 못 찾으면 한국어. */
function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ko';
  for (const lang of navigator.languages ?? [navigator.language]) {
    const base = lang.toLowerCase().split('-')[0];
    if (isLocale(base ?? null)) return base as Locale;
  }
  return 'ko';
}

/** 저장된 선택이 없으면 브라우저 언어를 따른다. */
const localeSnapshot = createSnapshot('local', LOCALE_KEY, (raw) =>
  isLocale(raw) ? raw : detectLocale(),
);

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: TranslateVars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR/하이드레이션 렌더는 ko, 그 직후 저장값·브라우저 언어로 보정된다.
  const locale = useStorageValue(localeSnapshot) ?? 'ko';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // 저장소에 쓰면 useStorageValue 구독자 전체가 다시 읽는다.
  const setLocale = useCallback((next: Locale) => {
    writeRaw('local', LOCALE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslateVars): string => {
      const template =
        resolve(DICTIONARIES[locale], key) ?? resolve(DICTIONARIES.ko, key) ?? key;
      return interpolate(template, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
