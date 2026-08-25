'use client';

import { useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { useAuth } from '@/features/auth/auth-context';
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui';
import {
  deleteMyAccount,
  exportMyData,
  updateBuyerProfile,
  updateFarmerProfile,
  updateMe,
} from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/errors';
import { BUYER_TYPES, INDIAN_STATES } from '@/lib/constants';

function ProfileForm() {
  const { user, refreshUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  if (!user) return null;
  const currentUser = user;

  async function save(form: FormData) {
    setError('');
    setMessage('');
    setPending(true);
    try {
      await updateMe({
        name: String(form.get('name') ?? ''),
        phone: String(form.get('phone') || '') || undefined,
        state: String(form.get('state') || '') || undefined,
        district: String(form.get('district') || '') || undefined,
        village: String(form.get('village') || '') || undefined,
      });
      if (currentUser.role === 'FARMER') {
        await updateFarmerProfile({
          farmName: String(form.get('farmName') || '') || undefined,
          region: String(form.get('region') || '') || undefined,
        });
      }
      if (currentUser.role === 'BUYER') {
        await updateBuyerProfile({
          businessName: String(form.get('businessName') || '') || undefined,
          buyerType: (String(form.get('buyerType') || 'trader') as (typeof BUYER_TYPES)[number]),
        });
      }
      await refreshUser();
      setMessage('Saved.');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function downloadExport() {
    const { data } = await exportMyData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agriconnect-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-forest">Profile</h1>
      <Card>
        <form className="grid gap-4 md:grid-cols-2" action={save}>
          {error ? (
            <div className="md:col-span-2">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {message ? <p className="md:col-span-2 text-leaf">{message}</p> : null}
          <Field label="Name">
            <Input name="name" defaultValue={user.name} required />
          </Field>
          <Field label="Email">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={user.phone ?? ''} />
          </Field>
          <Field label="State">
            <Select name="state" defaultValue={user.state ?? ''}>
              <option value="">Select</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="District">
            <Input name="district" defaultValue={user.district ?? ''} />
          </Field>
          <Field label="Village">
            <Input name="village" defaultValue={user.village ?? ''} />
          </Field>
          {user.role === 'FARMER' ? (
            <>
              <Field label="Farm name">
                <Input name="farmName" defaultValue={user.farmerProfile?.farmName ?? ''} />
              </Field>
              <Field label="Region">
                <Input name="region" defaultValue={user.farmerProfile?.region ?? ''} />
              </Field>
            </>
          ) : null}
          {user.role === 'BUYER' ? (
            <>
              <Field label="Business name">
                <Input name="businessName" defaultValue={user.buyerProfile?.businessName ?? ''} />
              </Field>
              <Field label="Buyer type">
                <Select name="buyerType" defaultValue={user.buyerProfile?.buyerType ?? 'trader'}>
                  {BUYER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Card>
      <Card className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => void downloadExport()}>
          Download my data
        </Button>
        {user.role !== 'ADMIN' ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (confirm('This will close your account. Continue?')) {
                void deleteMyAccount().then(() => logout());
              }
            }}
          >
            Delete account
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileForm />
    </RequireAuth>
  );
}
