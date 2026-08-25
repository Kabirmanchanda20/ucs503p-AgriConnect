import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../common/app-error.js';
import { sendError } from '../common/response.js';
import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

function fromPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): AppError {
  if (error.code === 'P2002') {
    return new AppError(409, 'CONFLICT', 'Resource already exists', {
      cause: error,
    });
  }
  if (error.code === 'P2025') {
    return new AppError(404, 'NOT_FOUND', 'Resource not found', {
      cause: error,
    });
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error', {
    cause: error,
    isOperational: false,
  });
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = fromPrismaError(error);
  } else if (
    error instanceof SyntaxError &&
    'body' in error &&
    error.body !== undefined
  ) {
    appError = new AppError(400, 'INVALID_REQUEST', 'Malformed JSON body');
  } else {
    appError = new AppError(500, 'INTERNAL_ERROR', 'Internal server error', {
      cause: error,
      isOperational: false,
    });
  }

  const logContext = {
    err: error,
    code: appError.code,
    method: request.method,
    path: request.originalUrl,
    userId: request.user?.id,
  };

  if (appError.statusCode >= 500) {
    logger.error(logContext, 'Request failed');
  } else {
    logger.warn(logContext, 'Request rejected');
  }

  const message =
    getEnv().NODE_ENV === 'production' && !appError.isOperational
      ? 'Internal server error'
      : appError.message;

  sendError(
    response,
    appError.statusCode,
    appError.code,
    message,
    appError.fields,
  );
};
