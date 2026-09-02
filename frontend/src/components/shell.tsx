'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { listNotifications } from '@/lib/api/notifications';
import { onNotificationsUpdated } from '@/lib/notifications-events';
import { dashboardPath, useAuth } from '@/features/auth/auth-context';
import { FarmerChatWidget } from '@/features/assistant/FarmerChatWidget';
import { Logo } from '@/components/logo';
import { cx } from '@/components/ui';

/** Dashboard roots match exactly; other nav items match their subtree (not sibling routes). */
function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;

  const dashboardRoots = ['/farmer', '/buyer', '/admin'];
  if (dashboardRoots.includes(href)) return false;

  if (!pathname.startsWith(`${href}/`)) return false;

  if (href === '/farmer/listings' && pathname.startsWith('/farmer/listings/new')) {
    return false;
  }

  return true;
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);
  return (
    <Link
      href={href}
      className={cx(
        'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition',
        active ? 'bg-paper/15 text-paper' : 'text-paper/80 hover:bg-paper/10 hover:text-paper',
      )}
    >
      {children}
    </Link>
  );
}

function roleNav(role: string | undefined): ReactNode {
  if (role === 'FARMER') {
    return (
      <>
        <NavLink href="/farmer">Dashboard</NavLink>
        <NavLink href="/farmer/listings">My listings</NavLink>
        <NavLink href="/farmer/listings/new">Add produce</NavLink>
        <NavLink href="/orders">Orders</NavLink>
      </>
    );
  }
  if (role === 'BUYER') {
    return (
      <>
        <NavLink href="/buyer">Dashboard</NavLink>
        <NavLink href="/marketplace">Browse</NavLink>
        <NavLink href="/orders">My orders</NavLink>
      </>
    );
  }
  if (role === 'ADMIN') {
    return (
      <>
        <NavLink href="/admin">Overview</NavLink>
        <NavLink href="/admin/users">Users</NavLink>
        <NavLink href="/admin/listings">Listings</NavLink>
        <NavLink href="/admin/logs">Logs</NavLink>
      </>
    );
  }
  return <NavLink href="/marketplace">Browse produce</NavLink>;
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
    const unsubscribe = onNotificationsUpdated(load);
    const timer = window.setInterval(load, 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [user, pathname]);

  const isLanding = pathname === '/';
  const links = roleNav(user?.role);

  return (
    <div className="min-h-full bg-field">
      <header className="border-b border-paper/10 bg-forest text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4 md:gap-6">
            <Logo variant="header" />
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
              {links}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {!user ? (
              <>
                <NavLink href="/login">Log in</NavLink>
                <Link
                  href="/register"
                  className="rounded-lg bg-harvest px-3 py-2 text-sm font-bold text-forest hover:bg-[#c49212]"
                >
                  Join
                </Link>
              </>
            ) : (
              <>
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
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-paper/80 hover:bg-paper/10 hover:text-paper"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-paper/10 px-4 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
          aria-label="Primary"
        >
          {links}
        </nav>
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
