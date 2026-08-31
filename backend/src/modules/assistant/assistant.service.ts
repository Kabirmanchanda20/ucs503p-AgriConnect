import type { Role } from '../../generated/prisma/client.js';
import { AppError } from '../../common/app-error.js';
import { getEnv } from '../../config/env.js';
import type { AssistantTurn } from './assistant.schema.js';

export const MISSING_KEY_REPLY =
  "I'm ready to chat, but my field notes aren't connected yet. Ask the AgriConnect admin to add GEMINI_API_KEY to the backend .env file (from Google AI Studio), then try again.";

const DEPRECATED_GEMINI_MODELS: Record<string, string> = {
  'gemini-2.0-flash': 'gemini-3.6-flash',
  'gemini-2.0-flash-exp': 'gemini-3.6-flash',
  'gemini-2.0-flash-lite': 'gemini-3.6-flash',
  'gemini-1.5-flash': 'gemini-3.6-flash',
  'gemini-1.5-flash-8b': 'gemini-3.6-flash',
};

/** Maps retired model ids to a current default (also used when .env still names an old model). */
export function resolveGeminiModel(model: string): string {
  const normalized = model.trim().replace(/^models\//, '');
  return DEPRECATED_GEMINI_MODELS[normalized] ?? normalized;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
  }[];
  error?: { message?: string; status?: string; code?: number };
}

export function buildSystemPrompt(role: Role): string {
  const roleLine =
    role === 'FARMER'
      ? 'The user is a farmer on AgriConnect. Help them list produce, set fair prices, manage orders, and care for crops.'
      : role === 'BUYER'
        ? 'The user is a buyer on AgriConnect. Help them browse listings, place orders, and understand fair farm prices.'
        : 'The user is an AgriConnect admin. Help them understand how farmers and buyers use the marketplace.';

  return [
    'You are Kisan, a friendly farm helper mascot for AgriConnect, a farm-to-market marketplace in India.',
    roleLine,
    'Answer clearly in plain language. Prefer short paragraphs or a few bullets.',
    'You can explain: listing produce, marketplace browsing, orders, notifications, fair pricing vs opaque mandi chains, general crop care, pests, harvest timing, and government-scheme awareness at a high level.',
    'Never invent listing prices, order statuses, or live mandi rates. If you do not know a current figure, say so and suggest checking listings or local mandi data.',
    'Do not give medical advice or prescribe specific pesticides/chemicals as if you were a licensed agronomist. For high-stakes crop disease or chemical use, tell the user to confirm with a local agronomist or Krishi Vigyan Kendra.',
    'Stay on farming, food markets, and AgriConnect. Politely decline unrelated topics.',
  ].join(' ');
}

export function toGeminiContents(message: string, history: AssistantTurn[]) {
  const contents = history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });
  return contents;
}

function extractReply(payload: GeminiResponse): string {
  const text = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    throw new AppError(
      502,
      'ASSISTANT_UNAVAILABLE',
      'Kisan could not prepare an answer. Please try again.',
    );
  }
  return text;
}

export async function queryAssistant(input: {
  message: string;
  history: AssistantTurn[];
  role: Role;
}): Promise<{ reply: string; source: 'gemini' | 'local' }> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY) {
    return { reply: MISSING_KEY_REPLY, source: 'local' };
  }

  const model = resolveGeminiModel(env.GEMINI_MODEL);
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  );
  url.searchParams.set('key', env.GEMINI_API_KEY);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt(input.role) }],
        },
        contents: toGeminiContents(input.message, input.history),
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 2048,
        },
      }),
    });
  } catch (error) {
    throw new AppError(
      502,
      'ASSISTANT_UNAVAILABLE',
      'Could not reach the farm assistant right now.',
      { cause: error },
    );
  }

  const payload = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    const apiMessage = payload.error?.message ?? '';
    const userMessage =
      apiMessage.includes('no longer available') || apiMessage.includes('not found')
        ? 'Kisan is updating to a newer AI model. Restart the API after setting GEMINI_MODEL=gemini-3.6-flash in backend/.env.'
        : apiMessage || 'The farm assistant is busy. Please try again shortly.';
    throw new AppError(
      status,
      status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'ASSISTANT_UNAVAILABLE',
      userMessage,
    );
  }

  return { reply: extractReply(payload), source: 'gemini' };
}

export async function getAssistantStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  model: string;
  source: 'gemini' | 'local';
}> {
  const env = getEnv();
  const model = resolveGeminiModel(env.GEMINI_MODEL);
  if (!env.GEMINI_API_KEY) {
    return {
      configured: false,
      connected: false,
      model,
      source: 'local',
    };
  }

  try {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
    );
    url.searchParams.set('key', env.GEMINI_API_KEY);
    const response = await fetch(url, { method: 'GET' });
    return {
      configured: true,
      connected: response.ok,
      model,
      source: response.ok ? 'gemini' : 'local',
    };
  } catch {
    return {
      configured: true,
      connected: false,
      model,
      source: 'local',
    };
  }
}
