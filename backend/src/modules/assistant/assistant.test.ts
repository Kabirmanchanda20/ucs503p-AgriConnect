import { describe, expect, it } from 'vitest';
import { queryAssistantBodySchema } from './assistant.schema.js';
import {
  MISSING_KEY_REPLY,
  buildSystemPrompt,
  resolveGeminiModel,
  toGeminiContents,
} from './assistant.service.js';

describe('assistant query schema', () => {
  it('accepts a short question with optional history', () => {
    const parsed = queryAssistantBodySchema.parse({
      message: 'How do I list wheat?',
      history: [{ role: 'assistant', content: 'Namaste!' }],
    });
    expect(parsed.message).toBe('How do I list wheat?');
    expect(parsed.history).toHaveLength(1);
  });

  it('defaults missing history and rejects empty messages', () => {
    expect(queryAssistantBodySchema.parse({ message: '  hello  ' }).history).toEqual(
      [],
    );
    expect(queryAssistantBodySchema.safeParse({ message: '   ' }).success).toBe(
      false,
    );
  });

  it('caps conversation history at eight turns', () => {
    const history = Array.from({ length: 9 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `turn ${String(index)}`,
    }));
    expect(
      queryAssistantBodySchema.safeParse({ message: 'next', history }).success,
    ).toBe(false);
  });
});

describe('assistant prompt mapping', () => {
  it('keeps Kisan grounded for each signed-in role', () => {
    expect(buildSystemPrompt('FARMER')).toMatch(/farmer on AgriConnect/i);
    expect(buildSystemPrompt('BUYER')).toMatch(/buyer on AgriConnect/i);
    expect(buildSystemPrompt('ADMIN')).toContain('admin');
    expect(MISSING_KEY_REPLY).toMatch(/GEMINI_API_KEY/);
  });

  it('maps retired Gemini model ids to the current default', () => {
    expect(resolveGeminiModel('gemini-2.0-flash')).toBe('gemini-3.6-flash');
    expect(resolveGeminiModel('models/gemini-2.0-flash')).toBe('gemini-3.6-flash');
    expect(resolveGeminiModel('gemini-3.6-flash')).toBe('gemini-3.6-flash');
  });

  it('maps assistant history to Gemini model turns', () => {
    const contents = toGeminiContents('What is a quintal?', [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Namaste!' },
    ]);
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'Hi' }] },
      { role: 'model', parts: [{ text: 'Namaste!' }] },
      { role: 'user', parts: [{ text: 'What is a quintal?' }] },
    ]);
  });
});
