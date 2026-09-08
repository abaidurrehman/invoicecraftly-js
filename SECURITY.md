# Security policy

## Supported versions

Security fixes are applied to the current released `0.x` line while the SDK remains in beta.

## Reporting a vulnerability

Do not open a public GitHub issue for a vulnerability, API key, invoice payload, customer data, payment data, or other sensitive material.

Use InvoiceCraftly's security/contact route instead:

- https://invoicecraftly.com/security/
- https://invoicecraftly.com/contact/

Include only the minimum information needed to reproduce the problem. Never send a live API key; rotate any credential you believe may have been exposed.

## SDK boundary

This package is a thin HTTP client. It must not log Authorization headers or complete invoice payloads by default, persist invoice content, or introduce package telemetry.
