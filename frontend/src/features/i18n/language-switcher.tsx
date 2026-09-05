'use client';

import { LOCALES, LOCALE_LABELS } from '@/lib/i18n';
import { useLocale } from '@/features/i18n/locale-context';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof LOCALES)[number])}
        aria-label={t('common.language')}
        className="rounded-lg border border-paper/20 bg-forest px-2 py-1.5 text-xs font-semibold text-paper outline-none focus-visible:ring-2 focus-visible:ring-harvest"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} className="bg-forest text-paper">
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
