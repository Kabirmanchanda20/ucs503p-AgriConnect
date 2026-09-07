import { apiRequest } from './client';
import type { Locale } from '@/lib/i18n/locales';

export type AssistantChatRole = 'user' | 'assistant';

export interface AssistantTurn {
  role: AssistantChatRole;
  content: string;
}

export interface AssistantReply {
  reply: string;
  source: 'gemini' | 'local';
}

export interface AssistantStatus {
  configured: boolean;
  connected: boolean;
  model: string;
  source: 'gemini' | 'local';
}

export function getAssistantStatus() {
  return apiRequest<AssistantStatus>('/api/v1/assistant/status');
}

export function queryAssistant(input: {
  message: string;
  history?: AssistantTurn[];
  language?: Locale;
}) {
  return apiRequest<AssistantReply>('/api/v1/assistant/query', {
    method: 'POST',
    body: {
      message: input.message,
      history: input.history ?? [],
      language: input.language,
    },
  });
}
