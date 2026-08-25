'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Alert, Badge, Button, Card, Field, Input, Spinner } from '@/components/ui';
import { listAdminUsers, suspendUser, verifyUser } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import type { AdminUser } from '@/lib/api/types';

function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  function reload(search = query) {
    void listAdminUsers({ q: search || undefined, limit: 50 }).then((result) =>
      setUsers(result.data),
    );
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

  if (!users) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">Users</h1>
      <form
        className="flex gap-3"
        action={(form) => {
          const next = String(form.get('q') ?? '');
          setQuery(next);
          reload(next);
        }}
      >
        <Field label="Search">
          <Input name="q" placeholder="Name or email" />
        </Field>
        <Button className="mt-7" type="submit">
          Search
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
              {user.verified ? <Badge tone="good">Verified</Badge> : <Badge>Unverified</Badge>}
              {user.isSuspended ? <Badge tone="bad">Suspended</Badge> : null}
            </div>
          </div>
          {user.role !== 'ADMIN' ? (
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => void act(user, 'verify')}>
                {user.verified ? 'Unverify' : 'Verify'}
              </Button>
              <Button
                variant={user.isSuspended ? 'secondary' : 'danger'}
                type="button"
                onClick={() => void act(user, 'suspend')}
              >
                {user.isSuspended ? 'Reinstate' : 'Suspend'}
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
