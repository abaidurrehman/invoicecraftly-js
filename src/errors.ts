export interface InvoiceCraftlyErrorOptions {
  status?: number | null;
  code: string;
  requestId?: string | null;
  details?: unknown[];
  retryAfterSeconds?: number | null;
  cause?: unknown;
}

export class InvoiceCraftlyError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: unknown[];
  readonly retryAfterSeconds: number | null;

  constructor(message: string, options: InvoiceCraftlyErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'InvoiceCraftlyError';
    this.status = options.status ?? null;
    this.code = options.code;
    this.requestId = options.requestId ?? null;
    this.details = options.details ?? [];
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}
