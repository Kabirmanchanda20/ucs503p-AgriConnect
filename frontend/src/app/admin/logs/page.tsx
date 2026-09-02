'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Card, EmptyState, Spinner, Alert } from '@/components/ui';
import { listActivityLogs } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, titleCase } from '@/lib/format';
import type { ActivityLog } from '@/lib/api/types';

function Logs() {
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
      <h1 className="font-display text-4xl text-forest">Activity logs</h1>
      {logs.length === 0 ? (
        <EmptyState title="No admin actions yet" body="Suspend, verify, and moderate events will list here." />
      ) : (
        logs.map((log) => (
          <Card key={log.id}>
            <p className="font-bold text-forest">{titleCase(log.action)}</p>
            <p className="text-sm text-ink/70">
              {log.targetType} {log.targetId} · {formatDate(log.createdAt)}
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
