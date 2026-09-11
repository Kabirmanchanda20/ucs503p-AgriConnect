'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Card, EmptyState, Spinner, Alert } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-context';
import { listActivityLogs } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, titleCase } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n';
import type { ActivityLog } from '@/lib/api/types';

/** Server-side enum values; anything new falls back to its title-cased name. */
const ACTION_KEYS: Record<string, MessageKey> = {
  USER_SUSPEND: 'admin.logAction.USER_SUSPEND',
  USER_UNSUSPEND: 'admin.logAction.USER_UNSUSPEND',
  USER_VERIFY: 'admin.logAction.USER_VERIFY',
  LISTING_REMOVE: 'admin.logAction.LISTING_REMOVE',
  LISTING_REINSTATE: 'admin.logAction.LISTING_REINSTATE',
};

const TARGET_KEYS: Record<string, MessageKey> = {
  User: 'admin.logTarget.User',
  Listing: 'admin.logTarget.Listing',
  Order: 'admin.logTarget.Order',
};

function Logs() {
  const { locale, t } = useLocale();
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void listActivityLogs({ limit: 50 })
      .then((result) => setLogs(result.data))
      .catch((cause) => setError(getErrorMessage(cause)));
  }, []);

  if (error && !logs) return <Alert>{error}</Alert>;
  if (!logs) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">{t('admin.logsTitle')}</h1>
      {logs.length === 0 ? (
        <EmptyState title={t('admin.logsEmptyTitle')} body={t('admin.logsEmptyBody')} />
      ) : (
        logs.map((log) => (
          <Card key={log.id}>
            <p className="font-bold text-forest">
              {ACTION_KEYS[log.action] ? t(ACTION_KEYS[log.action]) : titleCase(log.action)}
            </p>
            <p className="text-sm text-ink/70">
              {TARGET_KEYS[log.targetType] ? t(TARGET_KEYS[log.targetType]) : log.targetType}{' '}
              {log.targetId} · {formatDate(log.createdAt, locale)}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}

export default function AdminLogsPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <Logs />
    </RequireAuth>
  );
}
