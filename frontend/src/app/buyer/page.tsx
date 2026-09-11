'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Button, Card, Spinner, Alert } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-context';
import { getMyReport } from '@/lib/api/reports';
import { listOrders } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';
import type { BuyerReport } from '@/lib/api/types';

function BuyerHome() {
  const { locale, t } = useLocale();
  const [report, setReport] = useState<BuyerReport | null>(null);
  const [openOrders, setOpenOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const reportResult = await getMyReport();
        if (reportResult.data.role === 'BUYER') {
          setReport(reportResult.data);
        } else {
          setError(t('dashboard.buyerLoadFail'));
        }
        const ordersResult = await listOrders({ status: 'pending', limit: 1 });
        setOpenOrders(ordersResult.pagination?.total ?? ordersResult.data.length);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  if (loading) return <Spinner />;
  if (error || !report) return <Alert>{error || t('dashboard.buyerLoadFail')}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-forest">{t('dashboard.buyerTitle')}</h1>
          <p className="text-ink/70">{t('dashboard.buyerSubtitle')}</p>
        </div>
        <Link href="/marketplace">
          <Button>{t('dashboard.browseProduce')}</Button>
        </Link>
        <Link href="/buyer/alerts">
          <Button variant="secondary">{t('dashboard.produceAlerts')}</Button>
        </Link>
        <Link href="/market-prices">
          <Button variant="secondary">{t('dashboard.marketPrices')}</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm font-bold uppercase text-soil">{t('dashboard.orders')}</p>
          <p className="font-display text-4xl text-forest">{report.totalOrders}</p>
          <p className="text-sm text-ink/60">{t('dashboard.pendingOrders', { count: openOrders })}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">{t('dashboard.spend')}</p>
          <p className="font-display text-4xl text-forest">{formatMoney(report.totalSpend, locale)}</p>
        </Card>
      </div>
    </div>
  );
}

export default function BuyerPage() {
  return (
    <RequireAuth roles={['BUYER']}>
      <BuyerHome />
    </RequireAuth>
  );
}
