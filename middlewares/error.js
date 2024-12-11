/* eslint-disable no-unused-vars */
import { Request, Response, NextFunction } from 'express';

export class APIError extends Error {
  constructor(code, message) {
    super();
    this.code = code || 500;
    this.message = message;
  }
}

/**
 * Handles error responses in the middleware.
 *
 * @param {Error} err - The error object.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export const errorResponse = (err, req, res, next) => {
  const defaultMsg = `Failed to process ${req.url}`;

  if (err instanceof APIError) {
    res.status(err.code).json({ error: err.message || defaultMsg });
    return;
  }
  res.status(500).json({
    error: err ? err.message || err.toString() : defaultMsg,
  });
};
