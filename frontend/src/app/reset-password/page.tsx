'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { resetPassword } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { Alert, Button, Card, Field, Input, Spinner } from '@/components/ui';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(form: FormData) {
    setError('');
    setPending(true);
    try {
      await resetPassword({
        token,
        password: String(form.get('password') ?? ''),
      });
      router.replace('/login');
    } catch (cause) {
      setError(getErrorMessage(cause, 'Reset failed'));
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return <Alert>This reset link is missing a token. Use the link from your email.</Alert>;
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="font-display text-3xl text-forest">Choose a new password</h1>
      <form className="mt-6 space-y-4" action={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field label="New password">
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetForm />
    </Suspense>
  );
}
