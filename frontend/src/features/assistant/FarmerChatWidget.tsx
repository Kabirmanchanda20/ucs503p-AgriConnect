'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { queryAssistant } from '@/lib/api/assistant';
import { getErrorMessage } from '@/lib/api/errors';
import type { Role } from '@/lib/api/types';
import { Button, cx } from '@/components/ui';
import { FarmerMascot } from './FarmerMascot';

const HINT_KEY = 'agriconnect.kisan.hintDismissed';

const QUICK_CHIPS = [
  'How do I list produce?',
  'Fair price tips',
  'Crop care',
  'How orders work',
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function greetingFor(role: Role, firstName: string) {
  if (role === 'FARMER') {
    return `Namaste${firstName ? `, ${firstName}` : ''}! I'm Kisan. Ask me about listing produce, fair prices, crop care, or how AgriConnect works.`;
  }
  if (role === 'BUYER') {
    return `Namaste${firstName ? `, ${firstName}` : ''}! I'm Kisan. I can help you browse produce, place orders, or understand fair farm prices.`;
  }
  return `Hello${firstName ? `, ${firstName}` : ''}! I'm Kisan. I can explain AgriConnect for farmers and buyers, plus general crop and market questions.`;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FarmerChatWidget({
  role,
  name,
}: {
  role: Role;
  name: string;
}) {
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();
  const firstName = name.split(' ')[0] ?? '';
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'welcome', role: 'assistant', content: greetingFor(role, firstName) },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setShowHint(window.localStorage.getItem(HINT_KEY) !== '1');
    } catch {
      setShowHint(true);
    }
  }, []);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function dismissHint() {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  function openChat() {
    setOpen(true);
    dismissHint();
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
        .filter((item) => item.id !== 'welcome')
        .slice(0, -1)
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.content }));
      const { data } = await queryAssistant({ message, history });
      setMessages((current) => [
        ...current,
        { id: newId(), role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: getErrorMessage(
            error,
            "I couldn't reach the fields just now. Please try again in a moment.",
          ),
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
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
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
                Ask Kisan
              </h2>
              <p className="text-xs text-paper/75">Farm advisor</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-paper/80 hover:bg-paper/10 hover:text-paper"
              aria-label="Close Kisan chat"
            >
              Close
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((item) => (
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
                  Kisan is thinking
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-forest/10 px-3 py-2">
            {QUICK_CHIPS.map((chip) => (
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
              Ask Kisan a farm question
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
              placeholder="Ask about crops, prices, or AgriConnect…"
              className="min-h-12 flex-1 resize-none rounded-xl border border-forest/15 bg-field px-3 py-2 text-sm text-ink outline-none ring-harvest/40 focus:border-leaf focus:ring-2"
            />
            <Button type="submit" disabled={pending || !draft.trim()} className="self-end px-4">
              Ask
            </Button>
          </form>
        </section>
      ) : null}

      <div className="relative flex justify-end">
        {showHint && !open ? (
          <p className="kisan-hint pointer-events-auto absolute right-full bottom-7 mr-3 whitespace-nowrap rounded-xl bg-forest px-3 py-2 text-sm font-medium tracking-wide text-paper shadow-[0_10px_24px_rgba(31,61,43,0.28)]">
            Ask Kisan
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openChat())}
          className={cx(
            'pointer-events-auto kisan-glow rounded-full transition duration-200 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-harvest',
            open ? '' : 'kisan-bounce',
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close Kisan chat' : 'Ask Kisan, farm assistant'}
        >
          <FarmerMascot size={92} />
        </button>
      </div>
    </div>
  );
}
