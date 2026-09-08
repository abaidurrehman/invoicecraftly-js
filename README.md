# @invoicecraftly/client

Official TypeScript client for the [InvoiceCraftly Developer Document API](https://invoicecraftly.com/developers/).

Use it to generate an invoice PDF, check EN16931-core readiness, or prepare the currently supported EN16931-core XML artifact. The SDK is intentionally thin: InvoiceCraftly's API remains authoritative for invoice validation, calculations, readiness and rendering.

## Status

Published beta client for InvoiceCraftly API `v1`. Current release: `0.1.0`.

## Install

```bash
npm install @invoicecraftly/client
```

The first npm release was bootstrapped on 8 September 2026. Full release acceptance also includes a clean registry-install smoke and a live PDF example against the real API. See [`RELEASE.md`](./RELEASE.md) for the release and Trusted Publishing process.

## Requirements

- Node.js 18 or newer
- an InvoiceCraftly Developer API key
- server-side code or another trusted environment where the API key can remain secret

Do **not** put an InvoiceCraftly API key in browser JavaScript, commit it to Git, or include it in public logs.

## Generate a PDF

```ts
import { writeFile } from 'node:fs/promises';
import { InvoiceCraftly } from '@invoicecraftly/client';

const client = new InvoiceCraftly({
  apiKey: process.env.INVOICECRAFTLY_API_KEY!,
});

const result = await client.documents.pdf({
  type: 'invoice',
  number: 'INV-1042',
  issueDate: '2026-09-05',
  dueDate: '2026-09-19',
  currency: 'USD',
  seller: {
    name: 'Fixture Seller Studio',
    addressLines: ['12 Render Way', 'Austin, TX 73301', 'United States'],
  },
  buyer: {
    name: 'Fixture Buyer Co',
    addressLines: ['400 Client Ave', 'Denver, CO 80202', 'United States'],
  },
  items: [
    {
      description: 'Brand design retainer',
      quantity: 2,
      unitPrice: 150,
      taxRate: 8.25,
      taxLabel: 'Sales Tax',
    },
  ],
  payment: {
    iban: 'DE89370400440532013000',
    reference: 'INV-1042',
    terms: 'Net 14',
  },
});

await writeFile('invoice.pdf', result.data);
console.log(result.renderDurationMs);
```

The fictional fixture above intentionally matches the canonical example in InvoiceCraftly's developer documentation.

## Check EN16931-core readiness

```ts
const readiness = await client.invoices.readiness({
  document: invoice,
  supplement: {
    version: 1,
    seller: {
      postalAddress: { countryCode: 'NO', city: 'Oslo', postalCode: '0154' },
      taxId: { role: 'legal-registration', schemeId: '0192' },
      vatIdentifier: 'NO123456785MVA',
    },
    lines: [{ sourceIndex: 0, unitCode: 'HUR', vatCategoryCode: 'S' }],
  },
});

if (!readiness.ready) {
  console.log(readiness.gaps);
}
```

This is the currently released **EN16931-core** readiness surface. It is not a Peppol BIS conformance or delivery claim.

## Generate the currently supported structured XML

```ts
const structured = await client.documents.structured({
  document: invoice,
  supplement,
});

if (structured.ready && structured.artifact) {
  console.log(structured.artifact.content);
}
```

`prepared` is not `sent`: this client does not submit invoices to Peppol or another delivery network.

## Error handling

```ts
import { InvoiceCraftlyError } from '@invoicecraftly/client';

try {
  await client.documents.pdf(invoice);
} catch (error) {
  if (error instanceof InvoiceCraftlyError) {
    console.error(error.status, error.code, error.requestId);
    if (error.retryAfterSeconds) console.error(`Retry after ${error.retryAfterSeconds}s`);
  } else {
    throw error;
  }
}
```

Public API errors preserve the HTTP status and public error code. Client-side transport failures use local codes such as `NETWORK_ERROR`, `REQUEST_ABORTED`, and `REQUEST_TIMEOUT`.

## Timeout and cancellation

The default timeout is 20 seconds. Override it per client or request:

```ts
const client = new InvoiceCraftly({
  apiKey: process.env.INVOICECRAFTLY_API_KEY!,
  timeoutMs: 15_000,
});

const controller = new AbortController();
await client.documents.pdf(invoice, { signal: controller.signal });
```

## Privacy and security

Calling the Developer Document API is remote processing initiated by your integration. The SDK itself has no telemetry and makes no tracking calls. It does not persist invoice bodies or PDFs.

Never post real invoice/customer/payment data in a public GitHub issue. For product privacy and security boundaries, see:

- https://invoicecraftly.com/privacy/
- https://invoicecraftly.com/security/

## API compatibility

The package version and API version are separate. `@invoicecraftly/client` `0.x` targets the released InvoiceCraftly API `v1` surface documented at https://invoicecraftly.com/developers/.

The SDK intentionally does not implement invoice totals, VAT rules, route decisions, EN16931 validation rules, Peppol logic, or delivery logic locally.

## Development

```bash
npm ci
npm test
npm run typecheck
npm run pack:check
```

The package has zero runtime dependencies. TypeScript is a development-only dependency.

## Support

Use this repository's Issues tab for SDK bugs or documentation problems that contain no sensitive invoice data. For account-specific or sensitive matters, use InvoiceCraftly's contact/security routes instead of a public issue.

## License

MIT
