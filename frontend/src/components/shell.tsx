'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listNotifications } from '@/lib/api/notifications';
import { dashboardPath, useAuth } from '@/features/auth/auth-context';
import { FarmerChatWidget } from '@/features/assistant/FarmerChatWidget';
import { Logo } from '@/components/logo';
import { cx } from '@/components/ui';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cx(
        'rounded-lg px-3 py-2 text-sm font-semibold transition',
        active ? 'bg-paper/15 text-paper' : 'text-paper/80 hover:bg-paper/10 hover:text-paper',
      )}
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    const load = () => {
      void listNotifications({ unread: true, limit: 1 })
        .then((result) => setUnread(result.pagination?.total ?? result.data.length))
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [user, pathname]);

  const farmerLinks = (
    <>
      <NavLink href="/farmer">Dashboard</NavLink>
      <NavLink href="/farmer/listings">My listings</NavLink>
      <NavLink href="/farmer/listings/new">Add produce</NavLink>
      <NavLink href="/orders">Orders</NavLink>
    </>
  );
  const buyerLinks = (
    <>
      <NavLink href="/buyer">Dashboard</NavLink>
      <NavLink href="/marketplace">Browse</NavLink>
      <NavLink href="/orders">My orders</NavLink>
    </>
  );
  const adminLinks = (
    <>
      <NavLink href="/admin">Overview</NavLink>
      <NavLink href="/admin/users">Users</NavLink>
      <NavLink href="/admin/listings">Listings</NavLink>
      <NavLink href="/admin/logs">Logs</NavLink>
    </>
  );

  const isLanding = pathname === '/';

  return (
    <div className="min-h-full bg-field">
      <header className="border-b border-forest/20 bg-forest text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Logo variant="header" className="mr-2" />
          {user?.role === 'FARMER' ? farmerLinks : null}
          {user?.role === 'BUYER' ? buyerLinks : null}
          {user?.role === 'ADMIN' ? adminLinks : null}
          {!user ? (
            <>
              <NavLink href="/marketplace">Browse produce</NavLink>
              <span className="ml-auto flex gap-2">
                <NavLink href="/login">Log in</NavLink>
                <Link
                  href="/register"
                  className="rounded-lg bg-harvest px-3 py-2 text-sm font-bold text-soil"
                >
                  Join
                </Link>
              </span>
            </>
          ) : (
            <span className="ml-auto flex items-center gap-2">
              {user.isSuspended ? (
                <span className="rounded-full bg-clay px-3 py-1 text-xs font-bold">
                  Suspended
                </span>
              ) : null}
              <NavLink href="/notifications">
                Alerts{unread ? ` (${unread})` : ''}
              </NavLink>
              <NavLink href="/profile">{user.name.split(' ')[0]}</NavLink>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-paper/80 hover:bg-paper/10"
              >
                Log out
              </button>
            </span>
          )}
        </div>
      </header>
      <main
        className={cx(
          'mx-auto w-full',
          isLanding ? 'max-w-none px-0 py-0' : 'max-w-6xl px-4 py-8',
          user ? 'pb-28' : '',
        )}
      >
        {children}
      </main>
      {ready && user ? (
        <>
          <p className="sr-only">Signed in as {user.email}, home {dashboardPath(user.role)}</p>
          <FarmerChatWidget role={user.role} name={user.name} />
        </>
      ) : null}
    </div>
  );
}
