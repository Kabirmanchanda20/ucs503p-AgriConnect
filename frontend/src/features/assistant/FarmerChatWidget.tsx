'use client';

import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getAssistantStatus, queryAssistant } from '@/lib/api/assistant';
import { getErrorMessage } from '@/lib/api/errors';
import type { Role } from '@/lib/api/types';
import { Button, cx } from '@/components/ui';
import { useLocale } from '@/features/i18n/locale-context';
import { FarmerMascot } from './FarmerMascot';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clipForHistory(content: string, max = 800): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function FarmerChatWidget({
  role,
  name,
}: {
  role: Role;
  name: string;
}) {
  const { t, locale } = useLocale();
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();
  const firstName = name.split(' ')[0] ?? '';
  const nameSuffix = firstName ? `, ${firstName}` : '';

  const greeting = useMemo(() => {
    if (role === 'FARMER') return t('kisan.greetingFarmer', { name: nameSuffix });
    if (role === 'BUYER') return t('kisan.greetingBuyer', { name: nameSuffix });
    return t('kisan.greetingAdmin', { name: nameSuffix });
  }, [role, nameSuffix, t]);

  const chips = useMemo(
    () => [
      t('kisan.chips.list'),
      t('kisan.chips.fairPrice'),
      t('kisan.chips.cropCare'),
      t('kisan.chips.orders'),
    ],
    [t],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [assistantOnline, setAssistantOnline] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const visibleMessages = useMemo<ChatMessage[]>(
    () => [{ id: 'welcome', role: 'assistant', content: greeting }, ...messages],
    [greeting, messages],
  );

  useEffect(() => {
    if (!open) return;
    void getAssistantStatus()
      .then((result) => setAssistantOnline(result.data.connected))
      .catch(() => setAssistantOnline(false));
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [visibleMessages, pending, open]);

  function openChat() {
    setOpen(true);
  }

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || pending) return;

    const userTurn: ChatMessage = { id: newId(), role: 'user', content: message };
    const nextMessages = [...messages, userTurn];
    setMessages(nextMessages);
    setDraft('');
    setPending(true);

    try {
      const history = nextMessages
        .slice(0, -1)
        .slice(-4)
        .map((item) => ({
          role: item.role,
          content: clipForHistory(item.content),
        }));
      const { data } = await queryAssistant({ message, history, language: locale });
      setMessages((current) => [
        ...current,
        { id: newId(), role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      const raw = getErrorMessage(
        error,
        "I couldn't reach the fields just now. Please try again in a moment.",
      );
      const friendly =
        raw.includes('Validation failed') || raw.includes('Too big')
          ? "That reply was too long to continue the chat. I've reset — please ask again."
          : raw;
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: friendly,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] sm:right-6 sm:bottom-6">
      {open ? (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="pointer-events-auto kisan-panel mb-3 flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-forest/15 bg-paper shadow-[0_18px_50px_rgba(31,61,43,0.22)]"
        >
          <header className="flex items-center gap-3 bg-forest px-4 py-3 text-paper">
            <FarmerMascot size={46} className="ring-1 ring-harvest/40" />
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-lg leading-tight">
                {t('kisan.title')}
              </h2>
              <p className="text-xs text-paper/75">
                {assistantOnline === true
                  ? t('kisan.online')
                  : assistantOnline === false
                    ? t('kisan.offline')
                    : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-paper/80 hover:bg-paper/10 hover:text-paper"
              aria-label={t('kisan.closeLabel')}
            >
              ✕
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {visibleMessages.map((item) => (
              <div
                key={item.id}
                className={cx('flex gap-2', item.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {item.role === 'assistant' ? (
                  <FarmerMascot size={28} className="mt-1 shrink-0" />
                ) : null}
                <p
                  className={cx(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    item.role === 'user'
                      ? 'bg-leaf text-paper'
                      : 'border border-forest/10 bg-field text-ink',
                  )}
                >
                  {item.content}
                </p>
              </div>
            ))}
            {pending ? (
              <div className="flex items-center gap-2 text-soil">
                <FarmerMascot size={28} />
                <span className="kisan-typing rounded-2xl border border-forest/10 bg-field px-3 py-2 text-sm">
                  {t('kisan.sending')}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-forest/10 px-3 py-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={pending}
                onClick={() => void sendMessage(chip)}
                className="rounded-full border border-harvest/40 bg-harvest/15 px-2.5 py-1 text-xs font-semibold text-soil hover:bg-harvest/25 disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-forest/10 p-3">
            <label htmlFor={inputId} className="sr-only">
              {t('kisan.title')}
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              maxLength={800}
              rows={2}
              placeholder={t('kisan.placeholder')}
              className="min-h-12 flex-1 resize-none rounded-xl border border-forest/15 bg-field px-3 py-2 text-sm text-ink outline-none ring-harvest/40 focus:border-leaf focus:ring-2"
            />
            <Button type="submit" disabled={pending || !draft.trim()} className="self-end px-4">
              {t('kisan.send')}
            </Button>
          </form>
        </section>
      ) : null}

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openChat())}
          className={cx(
            'pointer-events-auto flex items-center gap-2 rounded-full bg-forest pl-1 pr-4 py-1 shadow-[0_12px_32px_rgba(31,61,43,0.35)] transition duration-200 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-harvest',
            open ? '' : 'kisan-bounce',
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t('kisan.closeLabel') : t('kisan.openLabel')}
        >
          <FarmerMascot size={52} />
          <span className="text-sm font-bold text-paper">{t('kisan.title')}</span>
        </button>
      </div>
    </div>
  );
}
