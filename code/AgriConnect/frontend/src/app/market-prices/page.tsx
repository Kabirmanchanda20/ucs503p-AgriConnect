'use client';

import { useEffect, useState } from 'react';
import { Card, Field, Select, Spinner, Alert } from '@/components/ui';
import {
  getLiveMandiPrices,
  getMandiCommodities,
  getMandiPriceHistory,
  getMandiStates,
  listPriceTrends,
  type MandiHistoryPoint,
  type MandiPriceRow,
  type PriceTrendPoint,
} from '@/lib/api/market';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';
import { MANDI_CROPS, MANDI_LIVE_STATES } from '@/lib/constants';
import { useLocale } from '@/features/i18n/locale-context';
import { mandiCropKey, unitKey } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

function pickDefaultCrop(crops: string[]): string {
  const wheat = crops.find((crop) => crop.toLowerCase() === 'wheat');
  return wheat ?? crops[0] ?? '';
}

function formatArrivalLabel(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(`${locale}-IN`, {
    timeZone: 'Asia/Kolkata',
    numberingSystem: 'latn',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export default function MarketPricesPage() {
  const { t, locale } = useLocale();
  const [liveStates, setLiveStates] = useState<string[]>([...MANDI_LIVE_STATES]);
  const [state, setState] = useState<string>(MANDI_LIVE_STATES[0]);
  const [crop, setCrop] = useState<string>(MANDI_CROPS[0]);
  const [stateCrops, setStateCrops] = useState<string[]>([...MANDI_CROPS]);
  // Starts true: the first crop list is fetched on mount. Later switches flip it in the
  // Select handler, so the fetch effect never has to set it synchronously.
  const [cropsLoading, setCropsLoading] = useState(true);
  const [points, setPoints] = useState<PriceTrendPoint[]>([]);
  const [mandiRows, setMandiRows] = useState<MandiPriceRow[]>([]);
  const [mandiHistory, setMandiHistory] = useState<MandiHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staleNotice, setStaleNotice] = useState('');
  const [unpublishedNotice, setUnpublishedNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    void getMandiStates()
      .then((result) => {
        if (cancelled) return;
        const states = result.data.length > 0 ? result.data : [...MANDI_LIVE_STATES];
        setLiveStates(states);
        setState((current) => (states.includes(current) ? current : states[0]));
      })
      .catch(() => {
        if (!cancelled) setLiveStates([...MANDI_LIVE_STATES]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getMandiCommodities({ state })
      .then((result) => {
        if (cancelled) return;
        const crops = result.data.length > 0 ? result.data : [...MANDI_CROPS];
        setStateCrops(crops);
        setUnpublishedNotice(result.meta?.stale ? t('marketPrices.unpublished') : '');
        setCrop((current) => {
          if (current && crops.includes(current)) return current;
          return pickDefaultCrop(crops);
        });
      })
      .catch((cause) => {
        if (cancelled) return;
        // Keep staple fallback so the page can still load prices.
        setStateCrops([...MANDI_CROPS]);
        setUnpublishedNotice('');
        setCrop((current) =>
          current && (MANDI_CROPS as readonly string[]).includes(current)
            ? current
            : pickDefaultCrop([...MANDI_CROPS]),
        );
        setError(getErrorMessage(cause, t('marketPrices.cropListFailed')));
      })
      .finally(() => {
        if (!cancelled) setCropsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [state, t]);

  useEffect(() => {
    if (!crop || cropsLoading) return;

    let cancelled = false;
    const historyFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    async function load() {
      const [mandiSettled, historySettled, pointsSettled] = await Promise.allSettled([
        getLiveMandiPrices({ state, commodity: crop, latestOnly: true }),
        getMandiPriceHistory({ state, commodity: crop, from: historyFrom }),
        listPriceTrends({ crop, state, days: 90, limit: 120 }),
      ]);

      if (cancelled) return;

      const mandiRes = mandiSettled.status === 'fulfilled' ? mandiSettled.value : null;
      const historyRes = historySettled.status === 'fulfilled' ? historySettled.value : null;
      const pointsRes = pointsSettled.status === 'fulfilled' ? pointsSettled.value : null;

      setMandiRows(mandiRes?.data ?? []);
      setMandiHistory(historyRes?.data ?? []);
      setPoints((pointsRes?.data ?? []).filter((point) => point.source !== 'agmarknet'));

      const firstFailure =
        [mandiSettled, historySettled, pointsSettled].find((result) => result.status === 'rejected') ??
        null;
      if (firstFailure && firstFailure.status === 'rejected') {
        const message = getErrorMessage(firstFailure.reason);
        setError(/rate limit/i.test(message) ? t('marketPrices.rateLimited') : message);
      } else {
        setError('');
      }

      const isStale = Boolean(mandiRes?.meta?.stale || historyRes?.meta?.stale);
      setStaleNotice(isStale ? t('marketPrices.stale') : '');
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [state, crop, cropsLoading, t]);

  // Commodity and unit names arrive as free-form strings from the govt feed, so fall
  // back to the raw value when there is no translation for them.
  const cropLabel = (name: string) => {
    const key = mandiCropKey(name);
    return key ? t(key) : name;
  };

  const unitLabel = (unit: string) => {
    const key = unitKey(unit);
    return key ? t(key) : unit;
  };

  const arrivalDateLabel =
    mandiRows.length > 0 ? formatArrivalLabel(mandiRows[0].arrivalDate, locale) : null;

  const latestArrivalDate = mandiRows[0]?.arrivalDate ?? null;
  const historyForChart = mandiHistory
    .filter((point) => point.arrivalDate !== latestArrivalDate)
    .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));

  const maxPrice = Math.max(
    ...historyForChart.map((p) => Number(p.avgModalPricePerKg)),
    ...points.map((p) => Number(p.pricePerUnit)),
    1,
  );

  const modalSummary = mandiRows.length
    ? mandiRows.reduce((best, row) => (row.modalPrice > best.modalPrice ? row : best), mandiRows[0])
    : null;

  const isPublishedToday = latestArrivalDate === getTodayIST();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-forest">{t('marketPrices.title')}</h1>
        <p className="mt-1 text-ink/70">{t('marketPrices.subtitle')}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {staleNotice ? (
        <p className="rounded-xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm text-forest">{staleNotice}</p>
      ) : null}
      {unpublishedNotice ? (
        <p className="rounded-xl border border-soil/30 bg-soil/10 px-4 py-3 text-sm text-forest">{unpublishedNotice}</p>
      ) : null}
      <Card className="grid gap-3 md:grid-cols-3">
        <Field label={t('marketPrices.state')}>
          <Select
            value={state}
            onChange={(e) => {
              setError('');
              setStaleNotice('');
              setUnpublishedNotice('');
              setCropsLoading(true);
              setLoading(true);
              setState(e.target.value);
            }}
          >
            {liveStates.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('marketPrices.crop')}>
          <Select
            value={crop}
            disabled={cropsLoading || stateCrops.length === 0}
            onChange={(e) => {
              setError('');
              setStaleNotice('');
              setLoading(true);
              setCrop(e.target.value);
            }}
          >
            {stateCrops.map((item) => (
              <option key={item} value={item}>{cropLabel(item)}</option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end text-sm text-ink/60">
          {cropsLoading
            ? t('marketPrices.loadingCrops')
            : t('marketPrices.cropCount', { count: stateCrops.length, state })}
        </div>
      </Card>
      {loading ? (
        <Spinner />
      ) : (
        <>
          {modalSummary ? (
            <Card>
              <p className="text-sm font-bold uppercase text-soil">
                {t('marketPrices.liveEyebrow')}
              </p>
              <p className="font-display text-2xl text-forest">
                {cropLabel(modalSummary.commodity)}
              </p>
              <p className="text-sm text-ink/70">
                {t('marketPrices.topModal', {
                  state: modalSummary.state,
                  market: modalSummary.market,
                })}
              </p>
              <p className="mt-2 text-xl font-bold">
                {t('marketPrices.perKg', {
                  price: formatMoney(modalSummary.pricePerKg, locale),
                })}
                <span className="text-sm font-medium text-ink/50">
                  {' '}
                  {t('marketPrices.modalPerQuintal', { price: `₹${modalSummary.modalPrice}` })}
                </span>
              </p>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-display text-2xl text-forest">
              {t('marketPrices.liveTitle', { crop: cropLabel(crop) })}
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              {[
                t('marketPrices.source'),
                arrivalDateLabel
                  ? t(
                      isPublishedToday
                        ? 'marketPrices.arrivalsToday'
                        : 'marketPrices.arrivalsLatest',
                      { date: arrivalDateLabel },
                    )
                  : t('marketPrices.arrivalsUnknown'),
                t('marketPrices.quintalNote'),
              ].join(' ')}
            </p>
            {mandiRows.length === 0 ? (
              <p className="mt-3 text-ink/70">
                {t('marketPrices.noRows', { crop: cropLabel(crop), state })}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-start text-ink/60">
                      <th className="py-2 pe-3">{t('marketPrices.colMarket')}</th>
                      <th className="py-2 pe-3">{t('marketPrices.colDistrict')}</th>
                      <th className="py-2 pe-3">{t('marketPrices.colVariety')}</th>
                      <th className="py-2 pe-3">{t('marketPrices.colArrival')}</th>
                      <th className="py-2 pe-3">{t('marketPrices.colMin')}</th>
                      <th className="py-2 pe-3">{t('marketPrices.colMax')}</th>
                      <th className="py-2 pe-3">{t('marketPrices.colModal')}</th>
                      <th className="py-2">{t('marketPrices.colPerKg')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mandiRows.map((row) => (
                      <tr key={row.id} className="border-b border-ink/5">
                        <td className="py-2 pe-3">{row.market}</td>
                        <td className="py-2 pe-3">{row.district}</td>
                        <td className="py-2 pe-3">{row.variety ?? '—'}</td>
                        <td className="py-2 pe-3">
                          {formatArrivalLabel(row.arrivalDate, locale)}
                        </td>
                        <td className="py-2 pe-3">₹{row.minPrice}</td>
                        <td className="py-2 pe-3">₹{row.maxPrice}</td>
                        <td className="py-2 pe-3 font-semibold">₹{row.modalPrice}</td>
                        <td className="py-2">{formatMoney(row.pricePerKg, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-2xl text-forest">{t('marketPrices.historyTitle')}</h2>
            <p className="mt-1 text-sm text-ink/60">
              {t('marketPrices.historyHint')}
            </p>
            {historyForChart.length === 0 && points.length === 0 ? (
              <p className="mt-3 text-ink/70">{t('marketPrices.noHistory')}</p>
            ) : (
              <div className="mt-4 flex items-end gap-1 h-48">
                {historyForChart.map((point, index) => (
                  <div
                    key={`mandi-${point.arrivalDate}-${index}`}
                    className="flex-1 min-w-[4px] rounded-t bg-soil/80"
                    style={{
                      height: `${Math.max(8, (Number(point.avgModalPricePerKg) / maxPrice) * 100)}%`,
                    }}
                    title={t('marketPrices.govtAvgTooltip', {
                      price: formatMoney(point.avgModalPricePerKg, locale),
                    })}
                  />
                ))}
                {points.map((point) => (
                  <div
                    key={point.id}
                    className="flex-1 min-w-[4px] rounded-t bg-leaf/70"
                    style={{
                      height: `${Math.max(8, (Number(point.pricePerUnit) / maxPrice) * 100)}%`,
                    }}
                    title={t('marketPrices.tradeTooltip', {
                      price: formatMoney(point.pricePerUnit, locale),
                      unit: unitLabel(point.unit),
                    })}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
