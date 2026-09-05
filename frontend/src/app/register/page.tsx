'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { dashboardPath, useAuth } from '@/features/auth/auth-context';
import { GuestOnly } from '@/features/auth/guards';
import { useLocale } from '@/features/i18n/locale-context';
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui';
import { INDIAN_STATES } from '@/lib/constants';
import { getErrorMessage } from '@/lib/api/errors';

function RegisterForm() {
  const { register } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') === 'BUYER' ? 'BUYER' : 'FARMER';
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(form: FormData) {
    setError('');
    setPending(true);
    try {
      const user = await register({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        name: String(form.get('name') ?? ''),
        role: String(form.get('role')) === 'BUYER' ? 'BUYER' : 'FARMER',
        phone: String(form.get('phone') || '') || undefined,
        state: String(form.get('state') || '') || undefined,
        district: String(form.get('district') || '') || undefined,
        village: String(form.get('village') || '') || undefined,
        languagePref: locale,
      });
      router.replace(dashboardPath(user.role));
    } catch (cause) {
      setError(getErrorMessage(cause, t('register.fail')));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-forest">{t('register.title')}</h1>
      <p className="mt-1 text-ink/70">{t('register.subtitle')}</p>
      <form className="mt-6 grid gap-4" action={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label={t('register.roleLabel')}>
          <Select name="role" defaultValue={defaultRole}>
            <option value="FARMER">{t('register.roleFarmer')}</option>
            <option value="BUYER">{t('register.roleBuyer')}</option>
          </Select>
        </Field>
        <Field label={t('register.fullName')}>
          <Input name="name" required minLength={1} />
        </Field>
        <Field label={t('register.email')}>
          <Input name="email" type="email" required />
        </Field>
        <Field label={t('register.password')}>
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <Field label={t('register.phone')}>
          <Input name="phone" />
        </Field>
        <Field label={t('register.state')}>
          <Select name="state" defaultValue="">
            <option value="">{t('register.selectState')}</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('register.district')}>
          <Input name="district" />
        </Field>
        <Field label={t('register.village')}>
          <Input name="village" />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink/70">
        {t('register.already')}{' '}
        <Link href="/login" className="font-semibold text-leaf">
          {t('register.logIn')}
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}
