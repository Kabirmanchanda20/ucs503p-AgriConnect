import { en, type MessageTree } from './en';
import { hi } from './hi';
import { pa } from './pa';
import { bn } from './bn';
import { ta } from './ta';
import { te } from './te';
import { mr } from './mr';
import { gu } from './gu';
import { kn } from './kn';
import { ml } from './ml';
import { or } from './or';
import { assamese } from './as';
import { ur } from './ur';
import type { Locale } from '../locales';

export const messagesByLocale: Record<Locale, MessageTree> = {
  en,
  hi,
  pa,
  bn,
  ta,
  te,
  mr,
  gu,
  kn,
  ml,
  or,
  as: assamese,
  ur,
};
