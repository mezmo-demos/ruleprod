import type { ErrorCode } from '@ruleprod/contracts';

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  not_found: 404,
  invalid_request: 422,
  conflict: 409,
  upstream_error: 502,
  upstream_timeout: 504,
};

/** Contract-shaped error: serialized as { error: { code, message } } with a matching HTTP status. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 500;
  }
}
