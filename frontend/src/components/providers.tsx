'use client';

import { AuthProvider } from '@/features/auth/auth-context';
import { AppShell } from '@/components/shell';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
