import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { queryAssistantController } from './assistant.controller.js';
import { queryAssistantBodySchema } from './assistant.schema.js';

export const assistantRouter = Router();

assistantRouter.use(requireAuth);
assistantRouter.post(
  '/query',
  validate({ body: queryAssistantBodySchema }),
  queryAssistantController,
);
