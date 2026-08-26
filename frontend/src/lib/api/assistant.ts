import { apiRequest } from './client';

export type AssistantChatRole = 'user' | 'assistant';

export interface AssistantTurn {
  role: AssistantChatRole;
  content: string;
}

export interface AssistantReply {
  reply: string;
  source: 'gemini' | 'local';
}

export function queryAssistant(input: {
  message: string;
  history?: AssistantTurn[];
}) {
  return apiRequest<AssistantReply>('/api/v1/assistant/query', {
    method: 'POST',
    body: {
      message: input.message,
      history: input.history ?? [],
    },
  });
}
