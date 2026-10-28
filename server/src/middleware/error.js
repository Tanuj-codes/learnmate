import { Prisma } from '@prisma/client';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No API route matches ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, _next) {
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Something went wrong on our side';
  let details = error.details;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      message = 'That record already exists.';
      details = error.meta?.target;
    } else if (error.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'The requested record could not be found.';
    } else if (error.code === 'P2003') {
      status = 400;
      code = 'INVALID_REFERENCE';
      message = 'A referenced record does not exist.';
    }
  }

  if (error.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON.';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
    if (config.isProduction) message = 'Something went wrong on our side. Please try again.';
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(config.isProduction ? {} : { requestId: req.id }),
    },
  });
}

export default errorHandler;
