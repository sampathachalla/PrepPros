import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ detail: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      detail: error.issues[0]?.message ?? 'Invalid request',
      errors: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ detail: error.message });
    return;
  }

  // Client errors raised by Express itself, e.g. malformed JSON or an oversized body
  if (typeof error?.status === 'number' && error.status < 500 && error.expose) {
    res.status(error.status).json({ detail: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ detail: 'Internal server error' });
};
