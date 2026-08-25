'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { dashboardPath, useAuth } from '@/features/auth/auth-context';
import { GuestOnly } from '@/features/auth/guards';
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui';
import { INDIAN_STATES } from '@/lib/constants';
import { getErrorMessage } from '@/lib/api/errors';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
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
      });
      router.replace(dashboardPath(user.role));
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not create account'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-forest">Join AgriConnect</h1>
      <p className="mt-1 text-ink/70">One account. Farmer or buyer — pick below.</p>
      <form className="mt-6 grid gap-4" action={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="I am a">
          <Select name="role" defaultValue="FARMER">
            <option value="FARMER">Farmer — I sell produce</option>
            <option value="BUYER">Buyer — I purchase produce</option>
          </Select>
        </Field>
        <Field label="Full name">
          <Input name="name" required minLength={1} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Password (8+ characters)">
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <Field label="Phone (optional)">
          <Input name="phone" />
        </Field>
        <Field label="State (optional)">
          <Select name="state" defaultValue="">
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="District (optional)">
          <Input name="district" />
        </Field>
        <Field label="Village (optional)">
          <Input name="village" />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink/70">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-leaf">
          Log in
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
