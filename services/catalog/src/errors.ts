import type { ErrorCode } from '@ruleprod/contracts';

/** An error that maps directly onto the contract's `{ error: { code, message } }` shape. */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFound = (message: string): HttpError => new HttpError(404, 'not_found', message);

export const invalidRequest = (statusCode: number, message: string): HttpError =>
  new HttpError(statusCode, 'invalid_request', message);
