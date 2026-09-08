import { InvoiceCraftlyError } from './errors.js';
import type {
  FetchLike,
  InvoiceCraftlyClientOptions,
  PdfResult,
  PublicDocumentV1,
  PublicStructuredRequestV1,
  ReadinessResultV1,
  RequestOptions,
  StructuredResultV1
} from './types.js';

export { InvoiceCraftlyError } from './errors.js';
export type * from './types.js';

export const INVOICECRAFTLY_API_VERSION = 'v1' as const;
export const INVOICECRAFTLY_SDK_VERSION = '0.1.0' as const;
export const DEFAULT_BASE_URL = 'https://invoicecraftly.com';
export const DEFAULT_TIMEOUT_MS = 20_000;

interface PublicErrorPayload {
  error?: {
    code?: unknown;
    message?: unknown;
    requestId?: unknown;
    details?: unknown;
  };
}

interface InternalRequestOptions extends RequestOptions {
  accept: string;
}

function normalizeBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError('InvoiceCraftly baseUrl must be an absolute http(s) URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new TypeError('InvoiceCraftly baseUrl must use http or https.');
  }
  if (parsed.search || parsed.hash) {
    throw new TypeError('InvoiceCraftly baseUrl must not contain a query string or fragment.');
  }
  return parsed.toString().replace(/\/+$/, '');
}

function normalizeTimeout(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError('InvoiceCraftly timeoutMs must be a positive finite number.');
  }
  return Math.round(value);
}

function parseHeaderNumber(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function requestIdFrom(response: Response, payload?: PublicErrorPayload | null): string | null {
  const bodyValue = payload?.error?.requestId;
  if (typeof bodyValue === 'string' && bodyValue) return bodyValue;
  return response.headers.get('x-request-id');
}

async function parsePublicError(response: Response): Promise<InvoiceCraftlyError> {
  let payload: PublicErrorPayload | null = null;
  try {
    payload = await response.clone().json() as PublicErrorPayload;
  } catch {
    payload = null;
  }

  const rawCode = payload?.error?.code;
  const rawMessage = payload?.error?.message;
  const rawDetails = payload?.error?.details;
  const retryAfter = parseHeaderNumber(response.headers, 'retry-after');

  return new InvoiceCraftlyError(
    typeof rawMessage === 'string' && rawMessage ? rawMessage : `InvoiceCraftly API request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: typeof rawCode === 'string' && rawCode ? rawCode : 'HTTP_ERROR',
      requestId: requestIdFrom(response, payload),
      details: Array.isArray(rawDetails) ? rawDetails : [],
      retryAfterSeconds: retryAfter
    }
  );
}

function timeoutSignal(callerSignal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;

  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) {
    controller.abort(callerSignal.reason);
  } else if (callerSignal) {
    callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('InvoiceCraftly request timed out.'));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    },
    didTimeout: () => timedOut
  };
}

export class InvoiceCraftly {
  readonly documents: {
    pdf: (document: PublicDocumentV1, options?: RequestOptions) => Promise<PdfResult>;
    structured: (request: PublicStructuredRequestV1, options?: RequestOptions) => Promise<StructuredResultV1>;
  };

  readonly invoices: {
    readiness: (request: PublicStructuredRequestV1, options?: RequestOptions) => Promise<ReadinessResultV1>;
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: InvoiceCraftlyClientOptions) {
    if (!options || typeof options !== 'object') {
      throw new TypeError('InvoiceCraftly client options are required.');
    }
    if (typeof options.apiKey !== 'string' || options.apiKey.trim() === '') {
      throw new TypeError('InvoiceCraftly apiKey must be a non-empty string.');
    }

    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new TypeError('A fetch implementation is required in this runtime.');
    }

    this.apiKey = options.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = normalizeTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    this.fetchImpl = fetchImpl;

    this.documents = Object.freeze({
      pdf: (document, requestOptions) => this.pdf(document, requestOptions),
      structured: (request, requestOptions) => this.structured(request, requestOptions)
    });
    this.invoices = Object.freeze({
      readiness: (request, requestOptions) => this.readiness(request, requestOptions)
    });
  }

  private async post(path: string, body: unknown, options: InternalRequestOptions): Promise<Response> {
    const timeoutMs = normalizeTimeout(options.timeoutMs ?? this.timeoutMs);
    const boundedSignal = timeoutSignal(options.signal, timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: options.accept
        },
        body: JSON.stringify(body),
        signal: boundedSignal.signal
      });
      if (!response.ok) throw await parsePublicError(response);
      return response;
    } catch (error) {
      if (error instanceof InvoiceCraftlyError) throw error;
      if (boundedSignal.didTimeout()) {
        throw new InvoiceCraftlyError(`InvoiceCraftly request timed out after ${timeoutMs} ms.`, {
          code: 'REQUEST_TIMEOUT',
          cause: error
        });
      }
      if (options.signal?.aborted || boundedSignal.signal.aborted) {
        throw new InvoiceCraftlyError('InvoiceCraftly request was aborted.', {
          code: 'REQUEST_ABORTED',
          cause: error
        });
      }
      throw new InvoiceCraftlyError('InvoiceCraftly request failed before a response was received.', {
        code: 'NETWORK_ERROR',
        cause: error
      });
    } finally {
      boundedSignal.cleanup();
    }
  }

  private async pdf(document: PublicDocumentV1, options: RequestOptions = {}): Promise<PdfResult> {
    const response = await this.post('/api/v1/documents/pdf', document, {
      ...options,
      accept: 'application/pdf'
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/pdf')) {
      throw new InvoiceCraftlyError('InvoiceCraftly returned an unexpected response type for PDF generation.', {
        status: response.status,
        code: 'UNEXPECTED_RESPONSE',
        requestId: requestIdFrom(response)
      });
    }
    return {
      data: new Uint8Array(await response.arrayBuffer()),
      renderDurationMs: parseHeaderNumber(response.headers, 'x-render-duration-ms'),
      requestId: requestIdFrom(response)
    };
  }

  private async readiness(request: PublicStructuredRequestV1, options: RequestOptions = {}): Promise<ReadinessResultV1> {
    const response = await this.post('/api/v1/invoices/readiness', request, {
      ...options,
      accept: 'application/json'
    });
    return await response.json() as ReadinessResultV1;
  }

  private async structured(request: PublicStructuredRequestV1, options: RequestOptions = {}): Promise<StructuredResultV1> {
    const response = await this.post('/api/v1/documents/structured', request, {
      ...options,
      accept: 'application/json'
    });
    return await response.json() as StructuredResultV1;
  }
}
