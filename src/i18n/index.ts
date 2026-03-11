/**
 * i18n — 轻量多语言系统
 * Context + hook，无第三方依赖
 */
import { createContext, useContext } from 'react';
import { zh } from './locales/zh';
import { zhTW } from './locales/zhTW';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { ru } from './locales/ru';
import type { Messages } from './types';

export type Locale = 'zh' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru';
export type { Messages };

const locales: Record<Locale, Messages> = { zh, 'zh-TW': zhTW, en, ja, ko, es, fr, de, ru };

const I18nContext = createContext<Messages>(en);

export const I18nProvider = I18nContext.Provider;

/** 获取当前语言的翻译文案 */
export function useI18n(): Messages {
  return useContext(I18nContext);
}

/** 根据 locale 获取对应的翻译字典 */
export function getMessages(locale: Locale): Messages {
  return locales[locale] ?? en;
}

/** 归一化浏览器/持久化中的 locale 标识 */
export function normalizeLocale(locale: string | null | undefined): Locale | null {
  const normalized = locale?.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized === 'zh-tw'
    || normalized === 'zh-hk'
    || normalized === 'zh-mo'
    || normalized.startsWith('zh-hant')
  ) {
    return 'zh-TW';
  }

  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-sg' || normalized.startsWith('zh-hans')) {
    return 'zh';
  }

  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('ru')) return 'ru';

  return null;
}

/** 检测浏览器语言，返回最匹配的 locale */
export function detectLocale(): Locale {
  const candidates = [...(navigator.languages ?? []), navigator.language];

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  // 默认英文（国际化优先）
  return 'en';
}
