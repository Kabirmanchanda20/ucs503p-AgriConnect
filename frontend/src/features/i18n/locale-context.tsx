'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { updateMe } from '@/lib/api/users';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type Locale,
  type MessageKey,
  normalizeLocale,
  translate,
} from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const LOCALE_EVENT = 'agriconnect-locale';

function readStoredLocale(): Locale {
  try {
    const stored = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;
    const browser = normalizeLocale(window.navigator.language);
    if (browser) return browser;
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}

function subscribeLocale(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener(LOCALE_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(LOCALE_EVENT, handler);
  };
}

function writeStoredLocale(next: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(LOCALE_EVENT));
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const storedLocale = useSyncExternalStore(
    subscribeLocale,
    readStoredLocale,
    () => DEFAULT_LOCALE,
  );
  const [sessionLocale, setSessionLocale] = useState<Locale | null>(null);

  const profileLocale = normalizeLocale(user?.languagePref);

  const locale =
    sessionLocale ??
    (user ? profileLocale ?? storedLocale : storedLocale) ??
    DEFAULT_LOCALE;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setSessionLocale(next);
      writeStoredLocale(next);
      if (user && normalizeLocale(user.languagePref) !== next) {
        void updateMe({ languagePref: next })
          .then(() => refreshUser())
          .catch(() => undefined);
      }
    },
    [refreshUser, user],
  );

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
