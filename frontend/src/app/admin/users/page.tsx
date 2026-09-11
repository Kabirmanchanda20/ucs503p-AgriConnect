'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Alert, Badge, Button, Card, Field, Input, Spinner } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-context';
import { listAdminUsers, suspendUser, verifyUser } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import type { AdminUser } from '@/lib/api/types';

function UsersAdmin() {
  const { t } = useLocale();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  function reload(search = query) {
    void listAdminUsers({ q: search || undefined, limit: 50 })
      .then((result) => setUsers(result.data))
      .catch((cause) => setError(getErrorMessage(cause)));
  }

  useEffect(() => {
    reload('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(user: AdminUser, kind: 'suspend' | 'verify') {
    setError('');
    try {
      if (kind === 'suspend') {
        await suspendUser(user.id, {
          isSuspended: !user.isSuspended,
          reason: user.isSuspended ? 'Reinstated by admin' : 'Suspended from admin desk',
        });
      } else {
        await verifyUser(user.id, !user.verified);
      }
      reload();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  if (error && !users) return <Alert>{error}</Alert>;
  if (!users) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">{t('admin.users')}</h1>
      <form
        className="flex gap-3"
        action={(form) => {
          const next = String(form.get('q') ?? '');
          setQuery(next);
          reload(next);
        }}
      >
        <Field label={t('common.search')}>
          <Input name="q" placeholder={t('admin.searchPlaceholder')} />
        </Field>
        <Button className="mt-7" type="submit">
          {t('common.search')}
        </Button>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {users.map((user) => (
        <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl text-forest">{user.name}</p>
            <p className="text-sm text-ink/70">
              {user.email} · {user.role}
            </p>
            <div className="mt-2 flex gap-2">
              {user.verified ? (
                <Badge tone="good">{t('admin.verified')}</Badge>
              ) : (
                <Badge>{t('admin.unverified')}</Badge>
              )}
              {user.isSuspended ? <Badge tone="bad">{t('admin.suspended')}</Badge> : null}
            </div>
          </div>
          {user.role !== 'ADMIN' ? (
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => void act(user, 'verify')}>
                {user.verified ? t('admin.unverify') : t('admin.verify')}
              </Button>
              <Button
                variant={user.isSuspended ? 'secondary' : 'danger'}
                type="button"
                onClick={() => void act(user, 'suspend')}
              >
                {user.isSuspended ? t('admin.reinstate') : t('admin.suspend')}
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <UsersAdmin />
    </RequireAuth>
  );
}
