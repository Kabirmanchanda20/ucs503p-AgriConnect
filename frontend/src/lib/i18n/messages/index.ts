import { en, type MessageTree } from './en';
import { hi } from './hi';
import { pa } from './pa';
import type { Locale } from '../locales';

export const messagesByLocale: Record<Locale, MessageTree> = {
  en,
  hi,
  pa,
};
