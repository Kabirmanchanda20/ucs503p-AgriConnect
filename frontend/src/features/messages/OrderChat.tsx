'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, cx } from '@/components/ui';
import { getErrorMessage } from '@/lib/api/errors';
import type { Message } from '@/lib/api/messages';
import {
  listOrderMessages,
  markOrderMessagesRead,
  sendOrderMessage,
} from '@/lib/api/messages';
import { joinOrderRoom } from '@/lib/socket';

export function OrderChat({
  orderId,
  userId,
  disabled,
}: {
  orderId: string;
  userId: string;
  disabled?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listOrderMessages(orderId, { limit: 100 })
      .then((result) => {
        setMessages(result.data);
        void markOrderMessagesRead(orderId).catch(() => undefined);
      })
      .catch((cause) => setError(getErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    const leave = joinOrderRoom(orderId, (payload) => {
      const message = payload as Message;
      if (!message?.id) return;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message];
      });
      if (message.senderId !== userId) {
        void markOrderMessagesRead(orderId).catch(() => undefined);
      }
    });
    return leave;
  }, [orderId, userId]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || pending || disabled) return;
    setPending(true);
    setError('');
    try {
      const { data } = await sendOrderMessage(orderId, body);
      setMessages((current) =>
        current.some((item) => item.id === data.id) ? current : [...current, data],
      );
      setDraft('');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-display text-2xl text-forest">Order chat</h2>
        <p className="text-sm text-ink/60">Message the other party in real time.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div
        ref={listRef}
        className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-forest/10 bg-field p-3"
      >
        {loading ? (
          <p className="text-sm text-ink/60">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-ink/60">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === userId;
            return (
              <div
                key={message.id}
                className={cx('flex', mine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cx(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-leaf text-paper' : 'border border-forest/10 bg-paper text-ink',
                  )}
                >
                  {!mine ? (
                    <p className="mb-1 text-xs font-bold text-soil">{message.sender.name}</p>
                  ) : null}
                  <p>{message.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {disabled ? (
        <p className="text-sm text-ink/60">Chat is closed for cancelled orders.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            placeholder="Type a message…"
            className="min-h-12 flex-1 rounded-xl border border-forest/15 bg-paper px-4 text-sm outline-none ring-harvest/40 focus:border-leaf focus:ring-2"
          />
          <Button type="submit" disabled={pending || !draft.trim()}>
            Send
          </Button>
        </form>
      )}
    </Card>
  );
}
