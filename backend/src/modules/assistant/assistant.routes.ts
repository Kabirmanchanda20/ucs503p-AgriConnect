import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireActiveAccount } from '../../middleware/require-active-account.js';
import { validate } from '../../middleware/validate.js';
import { queryAssistantController, getAssistantStatusController } from './assistant.controller.js';
import { queryAssistantBodySchema } from './assistant.schema.js';

export const assistantRouter = Router();

assistantRouter.use(requireAuth);
assistantRouter.get('/status', getAssistantStatusController);
assistantRouter.post(
  '/query',
  requireActiveAccount,
  validate({ body: queryAssistantBodySchema }),
  queryAssistantController,
);
