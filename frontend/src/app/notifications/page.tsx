'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import { formatDate } from '@/lib/format';
import type { NotificationItem } from '@/lib/api/types';

function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  function reload() {
    void listNotifications({ limit: 50 }).then((result) => setItems(result.data));
  }

  useEffect(() => {
    reload();
  }, []);

  if (!items) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-forest">Alerts</h1>
        <Button variant="secondary" type="button" onClick={() => void markAllNotificationsRead().then(reload)}>
          Mark all read
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No alerts" body="Order updates and listing notices will appear here." />
      ) : (
        items.map((item) => (
          <Card key={item.id} className={item.readAt ? 'opacity-70' : ''}>
            <p className="text-xs font-bold uppercase text-soil">{item.type.replaceAll('_', ' ')}</p>
            <h2 className="font-display text-2xl text-forest">{item.title}</h2>
            <p className="mt-1">{item.body}</p>
            <p className="mt-2 text-sm text-ink/60">{formatDate(item.createdAt)}</p>
            {!item.readAt ? (
              <Button
                className="mt-3"
                variant="secondary"
                type="button"
                onClick={() => void markNotificationRead(item.id).then(reload)}
              >
                Mark read
              </Button>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <Notifications />
    </RequireAuth>
  );
}
