export const LOCALES = ['en', 'hi', 'pa'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'agriconnect.locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  pa: 'ਪੰਜਾਬੀ',
};

/** Map API / browser language tags onto AgriConnect locales. */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase().replace('_', '-');
  if (raw === 'en' || raw.startsWith('en-')) return 'en';
  if (raw === 'hi' || raw.startsWith('hi-') || raw === 'hindi') return 'hi';
  if (
    raw === 'pa' ||
    raw.startsWith('pa-') ||
    raw === 'punjabi' ||
    raw === 'panjabi' ||
    raw.startsWith('pa-guru')
  ) {
    return 'pa';
  }
  return null;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
