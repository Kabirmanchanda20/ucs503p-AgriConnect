import { logger } from '../config/logger.js';
import { getEnv } from '../config/env.js';
import { getPrismaClient } from '../config/db.js';
import { recordPriceTrend } from './price-trend.service.js';

/** Open mandi API — daily prices synced from Ministry of Agriculture Agmarknet via data.gov.in. */
const DEFAULT_MANDI_API_BASE = 'https://mandi-api.onrender.com';

/** Official data.gov.in Agmarknet daily mandi price resource (Govt of India OGD). */
const DATA_GOV_MANDI_RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070';

/** States on the keyless mandi-api feed (same underlying Agmarknet / data.gov.in data). */
export const MANDI_API_SUPPORTED_STATES = [
  'Punjab',
  'Maharashtra',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Karnataka',
] as const;

/** Punjab & Haryana via official data.gov.in when API key is configured. */
export const DATA_GOV_EXTRA_STATES = ['Haryana'] as const;

export interface MandiPriceRow {
  id: string;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: 'quintal';
  pricePerKg: string;
  source: 'agmarknet';
  fetchedAt: string | null;
}

interface MandiApiPriceRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety?: string;
  grade?: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  fetched_at?: string;
}

interface MandiApiHistoryRecord {
  arrival_date: string;
  avg_modal_price: number;
  avg_min_price: number;
  avg_max_price: number;
  data_points: number;
}

interface DataGovMandiRecord {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  grade?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
}

function mandiApiBase(): string {
  const env = getEnv();
  return env.MANDI_API_BASE_URL ?? DEFAULT_MANDI_API_BASE;
}

export interface MandiFeedMeta {
  stale: boolean;
  source: 'data.gov.in' | 'mandi-api' | 'cache';
  cachedAt: string | null;
}

export interface MandiServiceResult<T> {
  data: T;
  meta: MandiFeedMeta;
}

const LIVE_CACHE_TTL_MS = 15 * 60 * 1000;
const STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MANDI_API_COOLDOWN_MS = 15 * 60 * 1000;
/** Staple grains probed only when missing from the general feed (limits API calls). */
const STAPLE_SUPPLEMENT_GRAINS = ['Wheat', 'Rice', 'Paddy'] as const;

const livePricesCache = new Map<string, { at: number; data: MandiPriceRow[] }>();
export interface MandiHistoryPoint {
  arrivalDate: string;
  avgModalPrice: number;
  avgMinPrice: number;
  avgMaxPrice: number;
  avgModalPricePerKg: string;
  dataPoints: number;
}

const historyCache = new Map<string, { at: number; data: MandiHistoryPoint[] }>();
const commoditiesCache = new Map<string, { at: number; data: string[] }>();

let mandiApiCooldownUntil = 0;

function isMandiApiOnCooldown(): boolean {
  return Date.now() < mandiApiCooldownUntil;
}

function markMandiApiRateLimited(): void {
  mandiApiCooldownUntil = Date.now() + MANDI_API_COOLDOWN_MS;
  logger.warn('Mandi render API rate limited; cooling down for 15 minutes');
}

function isRateLimitMessage(message: string): boolean {
  return /rate limit/i.test(message);
}

function metaFromCache(at: number, stale: boolean): MandiFeedMeta {
  return {
    stale,
    source: 'cache',
    cachedAt: new Date(at).toISOString(),
  };
}

function readLivePriceCacheEntry(key: string): { at: number; data: MandiPriceRow[]; stale: boolean } | null {
  const entry = livePricesCache.get(key);
  if (!entry || entry.data.length === 0) return null;
  const age = Date.now() - entry.at;
  if (age <= LIVE_CACHE_TTL_MS) return { ...entry, stale: false };
  if (age <= STALE_CACHE_TTL_MS) return { ...entry, stale: true };
  return null;
}

function readCommoditiesCacheEntry(key: string): { at: number; data: string[]; stale: boolean } | null {
  const entry = commoditiesCache.get(key);
  if (!entry || entry.data.length === 0) return null;
  const age = Date.now() - entry.at;
  if (age <= LIVE_CACHE_TTL_MS) return { ...entry, stale: false };
  if (age <= STALE_CACHE_TTL_MS) return { ...entry, stale: true };
  return null;
}

function filterRowsByCommodity(rows: MandiPriceRow[], commodity?: string): MandiPriceRow[] {
  if (!commodity) return rows;
  const wanted = commodity.toLowerCase();
  return rows.filter((row) => row.commodity.toLowerCase() === wanted);
}

function applyLatestOnly(rows: MandiPriceRow[], latestOnly?: boolean): MandiPriceRow[] {
  if (latestOnly === false) return rows;
  return filterToLatestArrivalDay(rows);
}

function cacheKey(parts: Record<string, string | undefined>): string {
  return JSON.stringify(parts);
}

function normalizeStateName(state: string): string {
  return state.trim().toLowerCase();
}

async function fetchOfficialMandiRows(query: {
  state: string;
  commodity?: string | undefined;
  market?: string | undefined;
}): Promise<{ rows: MandiPriceRow[]; source: MandiFeedMeta['source'] }> {
  if (hasDataGovKey()) {
    try {
      const rows = await fetchDataGovMandiPrices(query);
      if (rows.length > 0) return { rows, source: 'data.gov.in' };
      if (query.commodity) {
        const broadRows = await fetchDataGovMandiPrices({ state: query.state });
        const wanted = query.commodity.toLowerCase();
        const matched = broadRows.filter((row) => row.commodity.toLowerCase() === wanted);
        if (matched.length > 0) return { rows: matched, source: 'data.gov.in' };
      }
    } catch (error) {
      logger.warn({ err: error, state: query.state }, 'data.gov.in mandi fetch failed');
    }
  }

  if (!isMandiApiSupportedState(query.state)) {
    if (hasDataGovKey()) {
      const rows = await fetchDataGovMandiPrices(query);
      return { rows, source: 'data.gov.in' };
    }
    throw new Error(`Official mandi feed does not cover ${query.state}.`);
  }

  if (isMandiApiOnCooldown()) {
    throw new Error('Rate limit exceeded. Maximum 100 requests per 15 minutes allowed per IP.');
  }

  try {
    const rows = await fetchRenderMandiPrices(query);
    return { rows, source: 'mandi-api' };
  } catch (error) {
    if (error instanceof Error && isRateLimitMessage(error.message)) {
      markMandiApiRateLimited();
    }
    if (hasDataGovKey()) {
      const rows = await fetchDataGovMandiPrices(query);
      if (rows.length > 0) return { rows, source: 'data.gov.in' };
    }
    throw error;
  }
}

export function isMandiApiSupportedState(state: string): boolean {
  return MANDI_API_SUPPORTED_STATES.some(
    (supported) => normalizeStateName(supported) === normalizeStateName(state),
  );
}

function hasDataGovKey(): boolean {
  return Boolean(getEnv().DATA_GOV_IN_API_KEY);
}

export function isMandiLiveState(state: string): boolean {
  if (isMandiApiSupportedState(state)) return true;
  if (hasDataGovKey() && normalizeStateName(state) === 'haryana') return true;
  return false;
}

function parseGovPrice(value: string | number | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Agmarknet via data.gov.in often uses DD/MM/YYYY; mandi-api uses YYYY-MM-DD. */
export function normalizeArrivalDate(raw: string): string {
  const trimmed = raw.trim();
  const slashDmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDmy) {
    const day = slashDmy[1].padStart(2, '0');
    const month = slashDmy[2].padStart(2, '0');
    const year = slashDmy[3];
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function filterToLatestPerMarket(rows: MandiPriceRow[]): MandiPriceRow[] {
  const byMarket = new Map<string, MandiPriceRow>();
  for (const row of rows) {
    const key = `${row.market}|${row.variety ?? ''}|${row.grade ?? ''}`;
    const existing = byMarket.get(key);
    if (!existing || row.arrivalDate > existing.arrivalDate) {
      byMarket.set(key, row);
    }
  }
  return [...byMarket.values()].sort((a, b) => {
    const byDate = b.arrivalDate.localeCompare(a.arrivalDate);
    if (byDate !== 0) return byDate;
    return a.market.localeCompare(b.market);
  });
}

function normalizeDataGovRow(record: DataGovMandiRecord): MandiPriceRow | null {
  if (!record.state || !record.market || !record.commodity || !record.arrival_date) return null;
  const modal = parseGovPrice(record.modal_price);
  if (modal <= 0) return null;

  const variety = record.variety?.trim() ? record.variety.trim() : null;
  const grade = record.grade?.trim() ? record.grade.trim() : null;
  const minPrice = parseGovPrice(record.min_price) || modal;
  const maxPrice = parseGovPrice(record.max_price) || modal;

  const base = {
    state: record.state.trim(),
    district: (record.district?.trim() || record.state).trim(),
    market: record.market.trim(),
    commodity: record.commodity.trim(),
    variety,
    grade,
    arrivalDate: normalizeArrivalDate(record.arrival_date),
    minPrice: Math.round(minPrice),
    maxPrice: Math.round(maxPrice),
    modalPrice: Math.round(modal),
    unit: 'quintal' as const,
    pricePerKg: quintalToKgPerUnit(modal),
    source: 'agmarknet' as const,
    fetchedAt: null,
  };

  return {
    id: mandiRowKey({
      state: base.state,
      market: base.market,
      commodity: base.commodity,
      variety,
      grade,
      arrivalDate: base.arrivalDate,
    }),
    ...base,
  };
}

async function fetchDataGovMandiPrices(query: {
  state: string;
  commodity?: string | undefined;
}): Promise<MandiPriceRow[]> {
  const apiKey = getEnv().DATA_GOV_IN_API_KEY;
  if (!apiKey) return [];

  const records: DataGovMandiRecord[] = [];
  const limit = 500;
  let offset = 0;

  while (offset < 15_000) {
    const params = new URLSearchParams({
      'api-key': apiKey,
      format: 'json',
      limit: String(limit),
      offset: String(offset),
      'filters[state.keyword]': query.state,
    });
    if (query.commodity) params.set('filters[commodity]', query.commodity);

    const response = await fetch(
      `https://api.data.gov.in/resource/${DATA_GOV_MANDI_RESOURCE}?${params.toString()}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(45_000) },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      records?: DataGovMandiRecord[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message ?? `data.gov.in mandi error (${String(response.status)})`);
    }

    const batch = payload.records ?? [];
    records.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return dedupeMandiRows(
    records
      .map(normalizeDataGovRow)
      .filter((row): row is MandiPriceRow => row !== null)
      .filter((row) => normalizeStateName(row.state) === normalizeStateName(query.state)),
  );
}

/** Grain/staple names used to query Agmarknet (official commodity names, not hardcoded prices). */
const STATE_MANDI_GRAIN_PROBES: Record<string, string[]> = {
  Punjab: ['Wheat', 'Rice', 'Paddy', 'Maize', 'Mustard', 'Cotton', 'Barley', 'Gram', 'Bajra'],
  Haryana: ['Wheat', 'Rice', 'Mustard', 'Cotton', 'Barley', 'Maize', 'Gram'],
  Maharashtra: ['Wheat', 'Rice', 'Onion', 'Tomato', 'Soyabean', 'Cotton', 'Jowar', 'Bajra', 'Gram'],
  'Uttar Pradesh': ['Wheat', 'Rice', 'Paddy', 'Potato', 'Onion', 'Maize', 'Mustard', 'Gram'],
  'Madhya Pradesh': ['Wheat', 'Rice', 'Soyabean', 'Maize', 'Cotton', 'Gram', 'Onion'],
  Karnataka: ['Rice', 'Paddy', 'Maize', 'Cotton', 'Ragi', 'Onion', 'Tomato', 'Bajra'],
};

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function filterToLatestArrivalDay(rows: MandiPriceRow[]): MandiPriceRow[] {
  if (rows.length === 0) return [];

  const today = getTodayIST();
  const todayRows = rows.filter((row) => row.arrivalDate === today);
  if (todayRows.length > 0) return todayRows;

  const latestDate = rows
    .map((row) => row.arrivalDate)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  if (!latestDate) return rows;

  const latestDayRows = rows.filter((row) => row.arrivalDate === latestDate);
  if (latestDayRows.length > 1) return latestDayRows;

  return filterToLatestPerMarket(rows);
}

function sortMandiCommodityList(state: string, crops: string[]): string[] {
  const probes = STATE_MANDI_GRAIN_PROBES[state] ?? [];
  const probeLower = new Set(probes.map((crop) => crop.toLowerCase()));
  const grains = crops.filter((crop) => probeLower.has(crop.toLowerCase()));
  const grainsOrdered = probes.filter((probe) =>
    grains.some((crop) => crop.toLowerCase() === probe.toLowerCase()),
  );
  const others = crops
    .filter((crop) => !probeLower.has(crop.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return [...grainsOrdered, ...others];
}

function mandiRowKey(parts: {
  state: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrivalDate: string;
}): string {
  return [
    parts.state,
    parts.market,
    parts.commodity,
    parts.variety ?? '',
    parts.grade ?? '',
    parts.arrivalDate,
  ].join('|');
}

function quintalToKgPerUnit(quintalPrice: number): string {
  return (quintalPrice / 100).toFixed(2);
}

function normalizePriceRow(row: MandiApiPriceRecord): MandiPriceRow {
  const variety = row.variety ?? null;
  const grade = row.grade ?? null;
  const arrivalDate = row.arrival_date;
  const base = {
    state: row.state,
    district: row.district,
    market: row.market,
    commodity: row.commodity,
    variety,
    grade,
    arrivalDate,
    minPrice: row.min_price,
    maxPrice: row.max_price,
    modalPrice: row.modal_price,
    unit: 'quintal' as const,
    pricePerKg: quintalToKgPerUnit(row.modal_price),
    source: 'agmarknet' as const,
    fetchedAt: row.fetched_at ?? null,
  };
  return {
    id: mandiRowKey({
      state: base.state,
      market: base.market,
      commodity: base.commodity,
      variety,
      grade,
      arrivalDate,
    }),
    ...base,
  };
}

function dedupeMandiRows(rows: MandiPriceRow[]): MandiPriceRow[] {
  const byId = new Map<string, MandiPriceRow>();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

async function fetchMandiJson<T>(path: string, retries = 2): Promise<T> {
  const url = `${mandiApiBase()}${path}`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45_000),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      data?: T;
      message?: string;
      error?: { message?: string; code?: string };
    };

    if (response.status === 429) {
      markMandiApiRateLimited();
      if (attempt < retries) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
    }

    if (!response.ok || !payload.success || payload.data === undefined) {
      const message =
        payload.message ?? payload.error?.message ?? `Mandi API error (${String(response.status)})`;
      throw new Error(message);
    }

    return payload.data;
  }

  throw new Error('Mandi API error (rate limited)');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function commodityInSet(commodities: Set<string>, name: string): boolean {
  const lower = name.toLowerCase();
  return [...commodities].some((crop) => crop.toLowerCase() === lower);
}

function storeLivePriceCache(
  query: { state: string; commodity?: string | undefined; market?: string | undefined },
  rows: MandiPriceRow[],
): void {
  if (rows.length === 0) return;
  livePricesCache.set(
    cacheKey({
      state: query.state,
      commodity: query.commodity,
      market: query.market,
      mode: 'raw',
    }),
    { at: Date.now(), data: rows },
  );
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

async function probeGrainCommodity(state: string, grain: string, commodities: Set<string>): Promise<void> {
  if (commodityInSet(commodities, grain)) return;
  if (isMandiApiOnCooldown()) return;

  const cacheKeyStr = cacheKey({ state, commodity: grain, mode: 'raw' });
  const cached = readLivePriceCacheEntry(cacheKeyStr);
  if (cached) {
    commodities.add(grain);
    return;
  }

  try {
    const { rows } = await fetchOfficialMandiRows({ state, commodity: grain });
    if (rows.length > 0) {
      commodities.add(grain);
      storeLivePriceCache({ state, commodity: grain }, rows);
    }
  } catch (error) {
    logger.warn({ err: error, state, grain }, 'Grain mandi probe skipped');
  }
}

export async function listMandiCommodities(state: string): Promise<MandiServiceResult<string[]>> {
  if (!isMandiLiveState(state)) {
    throw new Error(
      `Official mandi feed is available for Punjab, Haryana (with data.gov.in key), Maharashtra, Uttar Pradesh, Madhya Pradesh, and Karnataka.`,
    );
  }

  const key = `commodities-v4::${state}`;
  const cachedEntry = readCommoditiesCacheEntry(key);
  if (cachedEntry && !cachedEntry.stale) {
    return { data: cachedEntry.data, meta: metaFromCache(cachedEntry.at, false) };
  }

  const commodities = new Set<string>();
  const generalKey = cacheKey({ state, mode: 'raw' });
  const generalCached = readLivePriceCacheEntry(generalKey);
  if (generalCached) {
    for (const row of generalCached.data) commodities.add(row.commodity);
  }

  if (commodities.size < 10) {
    try {
      const { rows, source } = await fetchOfficialMandiRows({ state });
      storeLivePriceCache({ state }, rows);
      for (const row of rows) commodities.add(row.commodity);
      const sorted = await finalizeCommodityList(state, key, commodities, source);
      if (sorted.data.length > 0) return sorted;
    } catch (error) {
      logger.warn({ err: error, state }, 'General mandi feed failed while listing commodities');
    }
  } else {
    const missingStaples = STAPLE_SUPPLEMENT_GRAINS.filter((grain) => !commodityInSet(commodities, grain));
    await mapWithConcurrency(missingStaples, 1, async (grain) => {
      await probeGrainCommodity(state, grain, commodities);
    });
    const sorted = sortMandiCommodityList(state, [...commodities]);
    if (sorted.length > 0) {
      commoditiesCache.set(key, { at: Date.now(), data: sorted });
      return {
        data: sorted,
        meta: metaFromCache(Date.now(), false),
      };
    }
  }

  if (cachedEntry) {
    return { data: cachedEntry.data, meta: metaFromCache(cachedEntry.at, true) };
  }

  const fallback = sortMandiCommodityList(state, [...(STATE_MANDI_GRAIN_PROBES[state] ?? [])]);
  if (fallback.length > 0) {
    logger.warn({ state }, 'Mandi feed empty; returning staple grain list for dropdown');
    return {
      data: fallback,
      meta: { stale: true, source: 'cache', cachedAt: null },
    };
  }

  return {
    data: [],
    meta: { stale: true, source: 'cache', cachedAt: null },
  };
}

async function finalizeCommodityList(
  state: string,
  key: string,
  commodities: Set<string>,
  source: MandiFeedMeta['source'],
): Promise<MandiServiceResult<string[]>> {
  const missingStaples = STAPLE_SUPPLEMENT_GRAINS.filter((grain) => !commodityInSet(commodities, grain));
  await mapWithConcurrency(missingStaples, 1, async (grain) => {
    await probeGrainCommodity(state, grain, commodities);
  });

  const sorted = sortMandiCommodityList(state, [...commodities]);
  if (sorted.length > 0) {
    commoditiesCache.set(key, { at: Date.now(), data: sorted });
    return {
      data: sorted,
      meta: {
        stale: false,
        source,
        cachedAt: new Date().toISOString(),
      },
    };
  }

  return {
    data: sorted,
    meta: { stale: true, source: 'cache', cachedAt: null },
  };
}

async function fetchRenderMandiPrices(query: {
  state: string;
  commodity?: string | undefined;
  market?: string | undefined;
}): Promise<MandiPriceRow[]> {
  const params = new URLSearchParams({ state: query.state });
  if (query.commodity) params.set('commodity', query.commodity);
  if (query.market) params.set('market', query.market);

  const rows = await fetchMandiJson<MandiApiPriceRecord[]>(`/v1/prices?${params.toString()}`);
  return dedupeMandiRows(
    rows
      .map(normalizePriceRow)
      .filter((row) => normalizeStateName(row.state) === normalizeStateName(query.state)),
  );
}

export async function fetchLiveMandiPrices(query: {
  state: string;
  commodity?: string | undefined;
  market?: string | undefined;
  latestOnly?: boolean | undefined;
}): Promise<MandiServiceResult<MandiPriceRow[]>> {
  if (!isMandiLiveState(query.state)) {
    throw new Error(
      `Official mandi feed covers Punjab, Haryana (with data.gov.in key), Maharashtra, Uttar Pradesh, Madhya Pradesh, and Karnataka.`,
    );
  }

  const key = cacheKey({
    state: query.state,
    commodity: query.commodity,
    market: query.market,
    mode: 'raw',
  });
  const cachedEntry = readLivePriceCacheEntry(key);
  if (cachedEntry && !cachedEntry.stale) {
    const rows = applyLatestOnly(
      filterRowsByCommodity(cachedEntry.data, query.commodity),
      query.latestOnly,
    );
    return { data: rows, meta: metaFromCache(cachedEntry.at, false) };
  }

  try {
    const { rows: raw, source } = await fetchOfficialMandiRows(query);
    if (raw.length > 0) {
      storeLivePriceCache(query, raw);
    }
    const rows = applyLatestOnly(filterRowsByCommodity(raw, query.commodity), query.latestOnly);
    return {
      data: rows,
      meta: {
        stale: false,
        source,
        cachedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (cachedEntry) {
      const rows = applyLatestOnly(
        filterRowsByCommodity(cachedEntry.data, query.commodity),
        query.latestOnly,
      );
      return { data: rows, meta: metaFromCache(cachedEntry.at, true) };
    }
    throw error;
  }
}

export async function fetchMandiPriceHistory(query: {
  state: string;
  commodity: string;
  market?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}): Promise<MandiServiceResult<MandiHistoryPoint[]>> {
  if (!isMandiLiveState(query.state)) {
    throw new Error(
      `Official mandi feed covers Punjab, Haryana (with data.gov.in key), Maharashtra, Uttar Pradesh, Madhya Pradesh, and Karnataka.`,
    );
  }

  const key = cacheKey({
    state: query.state,
    commodity: query.commodity,
    market: query.market,
    from: query.from,
    to: query.to,
  });
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.at < LIVE_CACHE_TTL_MS && cached.data.length > 0) {
    return { data: cached.data, meta: metaFromCache(cached.at, false) };
  }
  if (cached && Date.now() - cached.at < STALE_CACHE_TTL_MS && cached.data.length > 0) {
    // try refresh below; stale served on failure
  }

  const buildFromRawCache = (): MandiHistoryPoint[] | null => {
    const rawKey = cacheKey({ state: query.state, commodity: query.commodity, mode: 'raw' });
    const rawEntry = readLivePriceCacheEntry(rawKey);
    if (!rawEntry) return null;
    const since = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : new Date(Date.now() - 90 * 86400000);
    const byDate = new Map<string, number[]>();
    for (const row of rawEntry.data) {
      const day = new Date(`${row.arrivalDate}T12:00:00.000Z`);
      if (day < since) continue;
      const bucket = byDate.get(row.arrivalDate) ?? [];
      bucket.push(Number(row.pricePerKg));
      byDate.set(row.arrivalDate, bucket);
    }
    if (byDate.size === 0) return null;
    return [...byDate.entries()]
      .map(([arrivalDate, prices]) => {
        const avgKg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const quintal = Math.round(avgKg * 100);
        return {
          arrivalDate,
          avgModalPrice: quintal,
          avgMinPrice: quintal,
          avgMaxPrice: quintal,
          avgModalPricePerKg: avgKg.toFixed(2),
          dataPoints: prices.length,
        };
      })
      .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));
  };

  try {
    let normalized: MandiHistoryPoint[] = [];
    let source: MandiFeedMeta['source'] = 'mandi-api';

    if (hasDataGovKey()) {
      const since = query.from
        ? new Date(`${query.from}T00:00:00.000Z`)
        : new Date(Date.now() - 90 * 86400000);
      const rows = await fetchDataGovMandiPrices({ state: query.state, commodity: query.commodity });
      const byDate = new Map<string, number[]>();
      for (const row of rows) {
        const day = new Date(`${row.arrivalDate}T12:00:00.000Z`);
        if (day < since) continue;
        const bucket = byDate.get(row.arrivalDate) ?? [];
        bucket.push(Number(row.pricePerKg));
        byDate.set(row.arrivalDate, bucket);
      }
      normalized = [...byDate.entries()].map(([arrivalDate, prices]) => {
        const avgKg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const quintal = Math.round(avgKg * 100);
        return {
          arrivalDate,
          avgModalPrice: quintal,
          avgMinPrice: quintal,
          avgMaxPrice: quintal,
          avgModalPricePerKg: avgKg.toFixed(2),
          dataPoints: prices.length,
        };
      });
      normalized.sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));
      source = 'data.gov.in';
    }

    if (normalized.length === 0 && isMandiApiSupportedState(query.state) && !isMandiApiOnCooldown()) {
      const params = new URLSearchParams({
        state: query.state,
        commodity: query.commodity,
      });
      if (query.market) params.set('market', query.market);
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);

      const rows = await fetchMandiJson<MandiApiHistoryRecord[]>(
        `/v1/prices/history?${params.toString()}`,
      );

      normalized = rows.map((row) => ({
        arrivalDate: normalizeArrivalDate(row.arrival_date),
        avgModalPrice: row.avg_modal_price,
        avgMinPrice: row.avg_min_price,
        avgMaxPrice: row.avg_max_price,
        avgModalPricePerKg: quintalToKgPerUnit(row.avg_modal_price),
        dataPoints: row.data_points,
      }));
      normalized.sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));
      source = 'mandi-api';
    }

    if (normalized.length === 0) {
      const fromCache = buildFromRawCache();
      if (fromCache) {
        normalized = fromCache;
        source = 'cache';
      }
    }

    if (normalized.length > 0) {
      historyCache.set(key, { at: Date.now(), data: normalized });
      return {
        data: normalized,
        meta: {
          stale: false,
          source,
          cachedAt: new Date().toISOString(),
        },
      };
    }

    throw new Error('No mandi history available for this crop and state.');
  } catch (error) {
    if (cached && Date.now() - cached.at < STALE_CACHE_TTL_MS) {
      return { data: cached.data, meta: metaFromCache(cached.at, true) };
    }
    const fromCache = buildFromRawCache();
    if (fromCache) {
      return {
        data: fromCache,
        meta: { stale: true, source: 'cache', cachedAt: null },
      };
    }
    throw error;
  }
}

export async function listMandiStates(): Promise<string[]> {
  const states = new Set<string>(MANDI_API_SUPPORTED_STATES);
  if (hasDataGovKey()) {
    for (const extra of DATA_GOV_EXTRA_STATES) states.add(extra);
  }

  if (!isMandiApiOnCooldown()) {
    try {
      const live = await fetchMandiJson<string[]>('/v1/states');
      for (const name of live) states.add(name);
    } catch (error) {
      logger.warn({ err: error }, 'Mandi states feed unavailable; using configured list');
    }
  }

  return [...states].sort((a, b) => a.localeCompare(b));
}

export async function listMandiMarkets(state: string): Promise<string[]> {
  if (!isMandiLiveState(state)) {
    throw new Error(`Official mandi feed does not cover ${state}.`);
  }

  if (normalizeStateName(state) === normalizeStateName('Haryana') && hasDataGovKey()) {
    const rows = await fetchDataGovMandiPrices({ state });
    return [...new Set(rows.map((row) => row.market))].sort((a, b) => a.localeCompare(b));
  }

  if (!isMandiApiSupportedState(state)) {
    throw new Error(`Markets for ${state} require DATA_GOV_IN_API_KEY in backend .env`);
  }

  const params = new URLSearchParams({ state });
  return fetchMandiJson<string[]>(`/v1/markets?${params.toString()}`);
}

/** Pull live govt mandi prices into `price_trends` for compare badges (sync job only). */
export async function syncMandiPricesToTrends(): Promise<number> {
  const env = getEnv();
  if (!env.MANDI_SYNC_ENABLED) return 0;
  if (isMandiApiOnCooldown()) {
    logger.warn('Skipping mandi sync — upstream API on cooldown');
    return 0;
  }

  let inserted = 0;
  const prisma = getPrismaClient();
  const states = await listMandiStates();

  for (const state of states) {
    const staples = STATE_MANDI_GRAIN_PROBES[state] ?? STAPLE_SUPPLEMENT_GRAINS;
    const cropsToSync = staples.slice(0, 5);

    for (const crop of cropsToSync) {
      try {
        const result = await fetchLiveMandiPrices({ state, commodity: crop, latestOnly: true });
        const rows = result.data;
        const latestByMarket = new Map<string, MandiPriceRow>();

        for (const row of rows) {
          const marketKey = `${row.market}::${row.commodity}::${row.variety ?? ''}`;
          const existing = latestByMarket.get(marketKey);
          if (!existing || row.arrivalDate > existing.arrivalDate) {
            latestByMarket.set(marketKey, row);
          }
        }

        for (const row of latestByMarket.values()) {
          const recordedAt = new Date(`${row.arrivalDate}T12:00:00.000Z`);

          const duplicate = await prisma.priceTrend.findFirst({
            where: {
              crop: row.commodity,
              state: row.state,
              district: row.district,
              source: 'agmarknet',
              recordedAt: {
                gte: new Date(`${row.arrivalDate}T00:00:00.000Z`),
                lt: new Date(`${row.arrivalDate}T23:59:59.999Z`),
              },
            },
          });

          if (duplicate) continue;

          await recordPriceTrend({
            crop: row.commodity,
            state: row.state,
            district: row.district,
            source: 'agmarknet',
            pricePerUnit: row.pricePerKg,
            unit: 'kg',
            recordedAt,
          });
          inserted += 1;
        }
      } catch (error) {
        logger.warn({ err: error, state, crop }, 'Mandi sync skipped for crop');
      }
    }
  }

  if (inserted > 0) {
    logger.info({ inserted }, 'Synced govt mandi prices into price trends');
  }

  return inserted;
}
