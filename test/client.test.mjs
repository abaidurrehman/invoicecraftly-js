import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceCraftly, InvoiceCraftlyError } from '../dist/index.js';

const fixture = {
  type: 'invoice',
  number: 'INV-1042',
  issueDate: '2026-09-05',
  dueDate: '2026-09-19',
  currency: 'USD',
  seller: { name: 'Fixture Seller Studio', addressLines: ['12 Render Way', 'Austin, TX 73301', 'United States'] },
  buyer: { name: 'Fixture Buyer Co', addressLines: ['400 Client Ave', 'Denver, CO 80202', 'United States'] },
  items: [{ description: 'Brand design retainer', quantity: 2, unitPrice: 150, taxRate: 8.25, taxLabel: 'Sales Tax' }],
  payment: { iban: 'DE89370400440532013000', reference: 'INV-1042', terms: 'Net 14' }
};

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
  });
}

test('documents.pdf sends the exact public v1 request semantics and returns bytes', async () => {
  let seen;
  const client = new InvoiceCraftly({
    apiKey: 'dk_live_test',
    fetch: async (url, init) => {
      seen = { url: String(url), init };
      return new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'x-render-duration-ms': '321' }
      });
    }
  });

  const result = await client.documents.pdf(fixture);
  assert.equal(seen.url, 'https://invoicecraftly.com/api/v1/documents/pdf');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers.Authorization, 'Bearer dk_live_test');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(seen.init.body), fixture);
  assert.deepEqual([...result.data], [37, 80, 68, 70]);
  assert.equal(result.renderDurationMs, 321);
});

test('readiness targets the released readiness endpoint', async () => {
  let seenUrl;
  const client = new InvoiceCraftly({
    apiKey: 'dk_live_test',
    fetch: async (url) => {
      seenUrl = String(url);
      return jsonResponse({ apiVersion: 'v1', profileId: 'EN16931_CORE', specificationIdentifier: 'urn:test', ready: false, gaps: [{ id: 'X', message: 'Missing field' }] });
    }
  });
  const result = await client.invoices.readiness({ document: fixture });
  assert.equal(seenUrl, 'https://invoicecraftly.com/api/v1/invoices/readiness');
  assert.equal(result.ready, false);
  assert.equal(result.gaps[0].id, 'X');
});

test('structured targets the released structured endpoint', async () => {
  let seenUrl;
  const client = new InvoiceCraftly({
    apiKey: 'dk_live_test',
    fetch: async (url) => {
      seenUrl = String(url);
      return jsonResponse({ apiVersion: 'v1', profileId: 'EN16931_CORE', specificationIdentifier: 'urn:test', ready: true, gaps: [], artifact: { mediaType: 'application/xml', content: '<Invoice />' } });
    }
  });
  const result = await client.documents.structured({ document: fixture });
  assert.equal(seenUrl, 'https://invoicecraftly.com/api/v1/documents/structured');
  assert.equal(result.artifact.content, '<Invoice />');
});

test('public API errors preserve status, code, request id, details and retry-after', async () => {
  const client = new InvoiceCraftly({
    apiKey: 'dk_live_test',
    fetch: async () => jsonResponse({ error: { code: 'RATE_LIMITED', message: 'Slow down.', requestId: 'req_123', details: [{ field: 'items' }] } }, { status: 429, headers: { 'retry-after': '7' } })
  });

  await assert.rejects(client.documents.pdf(fixture), (error) => {
    assert.ok(error instanceof InvoiceCraftlyError);
    assert.equal(error.status, 429);
    assert.equal(error.code, 'RATE_LIMITED');
    assert.equal(error.requestId, 'req_123');
    assert.equal(error.retryAfterSeconds, 7);
    assert.deepEqual(error.details, [{ field: 'items' }]);
    return true;
  });
});

test('authentication failures remain distinguishable', async () => {
  const client = new InvoiceCraftly({
    apiKey: 'bad',
    fetch: async () => jsonResponse({ error: { code: 'AUTHENTICATION_FAILED', message: 'Missing or incorrect API key.', requestId: null, details: [] } }, { status: 401 })
  });

  await assert.rejects(client.documents.pdf(fixture), (error) => error instanceof InvoiceCraftlyError && error.status === 401 && error.code === 'AUTHENTICATION_FAILED');
});

test('malformed 5xx responses fail closed without inventing server details', async () => {
  const client = new InvoiceCraftly({ apiKey: 'dk_live_test', fetch: async () => new Response('bad gateway', { status: 503 }) });
  await assert.rejects(client.documents.pdf(fixture), (error) => error instanceof InvoiceCraftlyError && error.status === 503 && error.code === 'HTTP_ERROR');
});

test('caller abort maps to REQUEST_ABORTED', async () => {
  const controller = new AbortController();
  const client = new InvoiceCraftly({
    apiKey: 'dk_live_test',
    fetch: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    })
  });
  const pending = client.documents.pdf(fixture, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => error instanceof InvoiceCraftlyError && error.code === 'REQUEST_ABORTED');
});

test('timeout maps to REQUEST_TIMEOUT', async () => {
  const client = new InvoiceCraftly({
    apiKey: 'dk_live_test',
    timeoutMs: 10,
    fetch: async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    })
  });
  await assert.rejects(client.documents.pdf(fixture), (error) => error instanceof InvoiceCraftlyError && error.code === 'REQUEST_TIMEOUT');
});

test('constructor rejects empty credentials', () => {
  assert.throws(() => new InvoiceCraftly({ apiKey: '' }), /apiKey/);
});
