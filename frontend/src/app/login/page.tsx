'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { dashboardPath, useAuth } from '@/features/auth/auth-context';
import { GuestOnly } from '@/features/auth/guards';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api/errors';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(form: FormData) {
    setError('');
    setPending(true);
    try {
      const user = await login(
        String(form.get('email') ?? ''),
        String(form.get('password') ?? ''),
      );
      router.replace(dashboardPath(user.role));
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not log in'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="font-display text-3xl text-forest">Welcome back</h1>
      <p className="mt-1 text-ink/70">Log in to buy or sell produce.</p>
      <Card className="mt-4 border-harvest/30 bg-harvest/10 p-3 text-sm text-ink/80">
        <p className="font-semibold text-forest">Faculty demo accounts</p>
        <p className="mt-1">
          Farmer: <code className="text-xs">kabir.manchanda@demo.agriconnect.local</code>
        </p>
        <p>
          Buyer: <code className="text-xs">aman.singh@demo.agriconnect.local</code>
        </p>
        <p className="mt-1">Password: <code className="text-xs">Demo@AgriConnect1</code></p>
      </Card>
      <form className="mt-6 space-y-4" action={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="font-semibold text-leaf">
          Forgot password?
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink/70">
        New here?{' '}
        <Link href="/register" className="font-semibold text-leaf">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <GuestOnly>
      <LoginForm />
    </GuestOnly>
  );
}
