import { z } from 'zod';

export const assistantTurnSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(800),
  })
  .strict();

export const queryAssistantBodySchema = z
  .object({
    message: z.string().trim().min(1).max(800),
    history: z.array(assistantTurnSchema).max(8).default([]),
  })
  .strict();

export type QueryAssistantBody = z.infer<typeof queryAssistantBodySchema>;
export type AssistantTurn = z.infer<typeof assistantTurnSchema>;
