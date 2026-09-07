'use client';

import type { Locale } from '@/lib/i18n/locales';
import { SPEECH_LOCALE_TAGS } from '@/lib/i18n/locales';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
}

export function speakText(text: string, locale: Locale): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LOCALE_TAGS[locale];
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function startListening(options: {
  locale: Locale;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): { stop: () => void } | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = SPEECH_LOCALE_TAGS[options.locale];
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const transcript = last?.[0]?.transcript?.trim() ?? '';
    if (!transcript) return;
    const isFinal = Boolean((last as { isFinal?: boolean } | undefined)?.isFinal ?? true);
    options.onResult(transcript, isFinal);
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    options.onError?.(event.error ?? 'speech-error');
  };

  recognition.onend = () => {
    options.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    options.onError?.('start-failed');
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    },
  };
}
