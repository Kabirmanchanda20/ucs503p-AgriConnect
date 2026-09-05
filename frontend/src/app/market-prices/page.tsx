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
import { MANDI_LIVE_STATES } from '@/lib/constants';
import { useLocale } from '@/features/i18n/locale-context';

function pickDefaultCrop(crops: string[]): string {
  const wheat = crops.find((crop) => crop.toLowerCase() === 'wheat');
  return wheat ?? crops[0] ?? '';
}

function formatArrivalLabel(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export default function MarketPricesPage() {
  const { t } = useLocale();
  const [liveStates, setLiveStates] = useState<string[]>([...MANDI_LIVE_STATES]);
  const [state, setState] = useState<string>(MANDI_LIVE_STATES[0]);
  const [crop, setCrop] = useState('');
  const [stateCrops, setStateCrops] = useState<string[]>([]);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [points, setPoints] = useState<PriceTrendPoint[]>([]);
  const [mandiRows, setMandiRows] = useState<MandiPriceRow[]>([]);
  const [mandiHistory, setMandiHistory] = useState<MandiHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staleNotice, setStaleNotice] = useState('');

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
        const crops = result.data;
        setStateCrops(crops);
        if (crops.length === 0) {
          setCrop('');
          return;
        }
        setCrop((current) => {
          if (current && crops.includes(current)) return current;
          return pickDefaultCrop(crops);
        });
        setLoading(true);
      })
      .catch((cause) => {
        if (!cancelled) setError(getErrorMessage(cause, 'Could not load official crop list for this state.'));
      })
      .finally(() => {
        if (!cancelled) setCropsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (!crop || cropsLoading) return;

    let cancelled = false;
    const historyFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    async function load() {
      try {
        const [mandiRes, historyRes, pointsRes] = await Promise.all([
          getLiveMandiPrices({ state, commodity: crop, latestOnly: true }),
          getMandiPriceHistory({ state, commodity: crop, from: historyFrom }),
          listPriceTrends({ crop, state, days: 90, limit: 120 }),
        ]);

        if (cancelled) return;

        setMandiRows(mandiRes.data);
        setMandiHistory(historyRes.data);
        setPoints(pointsRes.data.filter((point) => point.source !== 'agmarknet'));
        setError('');
        const isStale = Boolean(mandiRes.meta?.stale || historyRes.meta?.stale);
        setStaleNotice(
          isStale
            ? 'Showing cached official mandi data while the live Agmarknet feed catches up. Prices refresh automatically.'
            : '',
        );
      } catch (cause) {
        if (!cancelled) {
          setMandiRows([]);
          setMandiHistory([]);
          setPoints([]);
          setStaleNotice('');
          const message = getErrorMessage(cause);
          setError(
            /rate limit/i.test(message)
              ? 'Govt mandi API is temporarily rate-limited. Wait a few minutes and refresh, or add DATA_GOV_IN_API_KEY in backend .env for a more reliable feed.'
              : message,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [state, crop, cropsLoading]);

  const arrivalDateLabel =
    mandiRows.length > 0 ? formatArrivalLabel(mandiRows[0].arrivalDate) : null;

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
      <Card className="grid gap-3 md:grid-cols-3">
        <Field label={t('marketPrices.state')}>
          <Select
            value={state}
            onChange={(e) => {
              setError('');
              setStaleNotice('');
              setCropsLoading(true);
              setLoading(true);
              setCrop('');
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
              <option key={item} value={item}>{item}</option>
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
              <p className="text-sm font-bold uppercase text-soil">Agmarknet · live</p>
              <p className="font-display text-2xl text-forest">{modalSummary.commodity}</p>
              <p className="text-sm text-ink/70">{modalSummary.state} · top modal at {modalSummary.market}</p>
              <p className="mt-2 text-xl font-bold">
                {formatMoney(modalSummary.pricePerKg)} / kg
                <span className="text-sm font-medium text-ink/50">
                  {' '}
                  (₹{modalSummary.modalPrice}/quintal modal)
                </span>
              </p>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-display text-2xl text-forest">
              {t('marketPrices.liveTitle', { crop })}
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Source: agmarknet.gov.in → data.gov.in.
              {arrivalDateLabel
                ? isPublishedToday
                  ? ` Today's official arrivals (${arrivalDateLabel}).`
                  : ` Latest published arrivals (${arrivalDateLabel}) — today's report may not be uploaded yet.`
                : ' Showing latest published arrival day.'}
              Prices in ₹/quintal as published by each APMC.
            </p>
            {mandiRows.length === 0 ? (
              <p className="mt-3 text-ink/70">
                {t('marketPrices.noRows', { crop, state })}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-left text-ink/60">
                      <th className="py-2 pr-3">Market</th>
                      <th className="py-2 pr-3">District</th>
                      <th className="py-2 pr-3">Variety</th>
                      <th className="py-2 pr-3">Arrival</th>
                      <th className="py-2 pr-3">Min</th>
                      <th className="py-2 pr-3">Max</th>
                      <th className="py-2 pr-3">Modal</th>
                      <th className="py-2">₹/kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mandiRows.map((row) => (
                      <tr key={row.id} className="border-b border-ink/5">
                        <td className="py-2 pr-3">{row.market}</td>
                        <td className="py-2 pr-3">{row.district}</td>
                        <td className="py-2 pr-3">{row.variety ?? '—'}</td>
                        <td className="py-2 pr-3">{formatArrivalLabel(row.arrivalDate)}</td>
                        <td className="py-2 pr-3">₹{row.minPrice}</td>
                        <td className="py-2 pr-3">₹{row.maxPrice}</td>
                        <td className="py-2 pr-3 font-semibold">₹{row.modalPrice}</td>
                        <td className="py-2">{formatMoney(row.pricePerKg)}</td>
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
                    title={`Govt avg ${formatMoney(point.avgModalPricePerKg)}/kg`}
                  />
                ))}
                {points.map((point) => (
                  <div
                    key={point.id}
                    className="flex-1 min-w-[4px] rounded-t bg-leaf/70"
                    style={{
                      height: `${Math.max(8, (Number(point.pricePerUnit) / maxPrice) * 100)}%`,
                    }}
                    title={`Trade ${formatMoney(point.pricePerUnit)}/${point.unit}`}
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
