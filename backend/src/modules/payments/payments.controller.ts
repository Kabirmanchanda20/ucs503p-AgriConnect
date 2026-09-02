import type { Request } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/app-error.js';
import { sendSuccess } from '../../common/response.js';
import { initOrderPayment, markPaymentHeld } from './payments.service.js';

function authenticatedUser(request: Request) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.user;
}

function stringParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', `Invalid ${name}`);
  }
  return value;
}

export const initOrderPaymentController = asyncHandler(async (request, response) => {
  const user = authenticatedUser(request);
  sendSuccess(
    response,
    await initOrderPayment(stringParam(request, 'id'), user.id),
    201,
  );
});

export const confirmPaymentHeldController = asyncHandler(async (request, response) => {
  const user = authenticatedUser(request);
  sendSuccess(response, await markPaymentHeld(stringParam(request, 'id'), user.id));
});
