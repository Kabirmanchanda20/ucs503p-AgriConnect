'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { dashboardPath, useAuth } from '@/features/auth/auth-context';
import { GuestOnly } from '@/features/auth/guards';
import { useLocale } from '@/features/i18n/locale-context';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api/errors';

function LoginForm() {
  const { login } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setError('');
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const user = await login(
        String(form.get('email') ?? ''),
        String(form.get('password') ?? ''),
      );
      router.replace(dashboardPath(user.role));
    } catch (cause) {
      setError(getErrorMessage(cause, t('login.fail')));
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="font-display text-3xl text-forest">{t('login.title')}</h1>
      <p className="mt-1 text-ink/70">{t('login.subtitle')}</p>
      <Card className="mt-4 border-harvest/30 bg-harvest/10 p-3 text-sm text-ink/80">
        <p className="font-semibold text-forest">{t('login.demoTitle')}</p>
        <p className="mt-1">
          {t('login.farmer')}: <code className="text-xs">kabir.manchanda@demo.agriconnect.local</code>
        </p>
        <p>
          {t('login.buyer')}: <code className="text-xs">aman.singh@demo.agriconnect.local</code>
        </p>
        <p className="mt-1">
          {t('login.password')}: <code className="text-xs">Demo@AgriConnect1</code>
        </p>
      </Card>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label={t('login.email')}>
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label={t('login.password')}>
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t('login.signingIn') : t('login.signIn')}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="font-semibold text-leaf">
          {t('login.forgot')}
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink/70">
        {t('login.newHere')}{' '}
        <Link href="/register" className="font-semibold text-leaf">
          {t('login.createAccount')}
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
