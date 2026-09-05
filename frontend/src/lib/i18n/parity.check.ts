import assert from 'node:assert/strict';
import { collectMessageKeys, translate } from './translate';
import { messagesByLocale } from './messages';
import { normalizeLocale } from './locales';

const enKeys = collectMessageKeys(messagesByLocale.en as unknown as Record<string, unknown>);
const hiKeys = collectMessageKeys(messagesByLocale.hi as unknown as Record<string, unknown>);
const paKeys = collectMessageKeys(messagesByLocale.pa as unknown as Record<string, unknown>);

assert.deepEqual(hiKeys, enKeys, 'Hindi messages must define the same keys as English');
assert.deepEqual(paKeys, enKeys, 'Punjabi messages must define the same keys as English');
assert.equal(translate('en', 'nav.mandiPrices'), 'Mandi prices');
assert.equal(translate('hi', 'nav.mandiPrices'), 'मंडी भाव');
assert.equal(translate('pa', 'nav.mandiPrices'), 'ਮੰਡੀ ਭਾਅ');
assert.equal(
  translate('hi', 'marketPrices.cropCount', { count: 3, state: 'Punjab' }),
  'Punjab की आधिकारिक मंडी फ़ीड में 3 फसलें',
);
assert.equal(normalizeLocale('hi-IN'), 'hi');
assert.equal(normalizeLocale('pa-Guru'), 'pa');
assert.equal(normalizeLocale('punjabi'), 'pa');
assert.equal(normalizeLocale('fr'), null);

console.log(`i18n parity OK (${String(enKeys.length)} keys × 3 locales)`);
