'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Alert, Button, Card, Field, Input, Select } from '@/components/ui';
import { createAlert, deleteAlert, listMyAlerts } from '@/lib/api/alerts';
import { getErrorMessage } from '@/lib/api/errors';
import { INDIAN_STATES } from '@/lib/constants';
import type { BuyerCropAlert } from '@/lib/api/alerts';

function BuyerAlerts() {
  const [alerts, setAlerts] = useState<BuyerCropAlert[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function reload() {
    void listMyAlerts()
      .then((result) => setAlerts(result.data))
      .catch((cause) => setError(getErrorMessage(cause)));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onAdd(form: FormData) {
    setPending(true);
    setError('');
    try {
      await createAlert({
        crop: String(form.get('crop') || '') || null,
        state: String(form.get('state') || '') || null,
      });
      reload();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">Produce alerts</h1>
      <p className="text-ink/70">
        Get notified when farmers publish listings that match your crop or region.
      </p>
      {error ? <Alert>{error}</Alert> : null}
      <Card>
        <form className="grid gap-3 md:grid-cols-3" action={onAdd}>
          <Field label="Crop (optional)">
            <Input name="crop" placeholder="Wheat" />
          </Field>
          <Field label="State (optional)">
            <Select name="state" defaultValue="">
              <option value="">Any state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit" disabled={pending} className="mt-7">
            Add alert
          </Button>
        </form>
      </Card>
      {alerts.map((alert) => (
        <Card key={alert.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-forest">
              {alert.crop ?? 'Any crop'} · {alert.state ?? 'Any state'}
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => void deleteAlert(alert.id).then(reload)}
          >
            Remove
          </Button>
        </Card>
      ))}
    </div>
  );
}

export default function BuyerAlertsPage() {
  return (
    <RequireAuth roles={['BUYER']}>
      <BuyerAlerts />
    </RequireAuth>
  );
}
