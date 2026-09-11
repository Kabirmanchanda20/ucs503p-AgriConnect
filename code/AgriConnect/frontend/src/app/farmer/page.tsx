'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Button, Card, EmptyState, Spinner, Alert } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-context';
import { getMyReport } from '@/lib/api/reports';
import { listListings } from '@/lib/api/listings';
import { listOrders } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';
import type { FarmerReport } from '@/lib/api/types';

function FarmerHome() {
  const { locale, t } = useLocale();
  const [report, setReport] = useState<FarmerReport | null>(null);
  const [openOrders, setOpenOrders] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const reportResult = await getMyReport();
        if (reportResult.data.role === 'FARMER') {
          setReport(reportResult.data);
        } else {
          setError(t('dashboard.farmerLoadFail'));
        }
        const ordersResult = await listOrders({ status: 'pending', limit: 1 });
        setOpenOrders(ordersResult.pagination?.total ?? ordersResult.data.length);
        const listingsResult = await listListings({ mine: true, status: 'active', limit: 1 });
        setActiveListings(
          listingsResult.pagination?.total ?? listingsResult.data.length,
        );
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  if (loading) return <Spinner />;
  if (error || !report) return <Alert>{error || t('dashboard.farmerLoadFail')}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-forest">{t('dashboard.farmerTitle')}</h1>
          <p className="text-ink/70">{t('dashboard.farmerSubtitle')}</p>
        </div>
        <Link href="/farmer/listings/new">
          <Button>{t('dashboard.addProduce')}</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-bold uppercase text-soil">{t('dashboard.listings')}</p>
          <p className="font-display text-4xl text-forest">{report.totalListings}</p>
          <p className="text-sm text-ink/60">{t('dashboard.activeNow', { count: activeListings })}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">{t('dashboard.revenue')}</p>
          <p className="font-display text-4xl text-forest">{formatMoney(report.revenue, locale)}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">{t('dashboard.qtySold')}</p>
          <p className="font-display text-4xl text-forest">{report.totalQuantitySold}</p>
          <p className="text-sm text-ink/60">{t('dashboard.pendingOrders', { count: openOrders })}</p>
        </Card>
      </div>
      {report.totalListings === 0 ? (
        <EmptyState
          title={t('dashboard.noListingsTitle')}
          body={t('dashboard.noListingsBody')}
          action={
            <Link href="/farmer/listings/new">
              <Button>{t('dashboard.createFirst')}</Button>
            </Link>
          }
        />
      ) : null}
    </div>
  );
}

export default function FarmerPage() {
  return (
    <RequireAuth roles={['FARMER']}>
      <FarmerHome />
    </RequireAuth>
  );
}
