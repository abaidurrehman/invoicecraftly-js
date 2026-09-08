# Releasing @invoicecraftly/client

This repository publishes the official TypeScript client for the InvoiceCraftly Developer Document API.

## Current release state

- package: `@invoicecraftly/client`
- first release: `0.1.0`
- npm scope: `@invoicecraftly`
- public repository: `abaidurrehman/invoicecraftly-js`
- API target: InvoiceCraftly API `v1`
- license: MIT

The first npm package creation was bootstrapped interactively on 8 September 2026. Future releases should use npm Trusted Publishing from GitHub Actions after the package-level Trusted Publisher relationship is configured.

## First-release bootstrap used for 0.1.0

A brand-new scoped npm package needs an owner-controlled npm organization/scope and publish authentication. The bootstrap sequence used for the first release was:

```bash
git clone https://github.com/abaidurrehman/invoicecraftly-js.git
cd invoicecraftly-js
npm ci
npm test
npm run typecheck
npm run pack:check
npm pack
```

Inspect the generated tarball before publication:

```bash
tar -tf invoicecraftly-client-0.1.0.tgz
```

Authenticate with npm using the owner account and 2FA:

```bash
npm login --auth-type=web
npm whoami
```

Then publish the reviewed tarball as a public scoped package:

```bash
npm publish ./invoicecraftly-client-0.1.0.tgz --access public
```

If npm returns `E403` saying that two-factor authentication or a granular token with bypass-2FA is required, do not weaken the release workflow or add a broad write token to GitHub. Enable/use npm 2FA and retry the interactive bootstrap publish.

## Trusted Publishing setup for future releases

After the package exists on npm, configure npm Trusted Publishing for this repository:

- GitHub owner: `abaidurrehman`
- repository: `invoicecraftly-js`
- workflow: `.github/workflows/publish.yml`

The workflow intentionally uses:

```yaml
permissions:
  contents: read
  id-token: write
```

No long-lived npm write token should be required once Trusted Publishing is configured and verified.

## Routine release process

For every later release:

1. update the package version and `CHANGELOG.md`;
2. run `npm ci`;
3. run `npm test`;
4. run `npm run typecheck`;
5. run `npm run pack:check`;
6. review the package contents;
7. merge the reviewed source to `main`;
8. create and push the matching release tag, for example `v0.1.1`;
9. let `.github/workflows/publish.yml` publish with npm Trusted Publishing;
10. verify the npm version and perform a clean registry install smoke.

## Registry-install smoke

After each release, test from a clean temporary directory:

```bash
npm init -y
npm install @invoicecraftly/client
```

Confirm the import resolves from the public registry rather than a local path or link. For release acceptance, also run the README PDF example with a valid test API key and confirm the real API returns a PDF without exposing the credential in logs or committed files.

## Release boundaries

The SDK remains a thin HTTP client. Release work must not add local invoice-total, VAT/tax, routing, readiness, structured-validation, Peppol transport, or delivery logic. Those remain owned by the InvoiceCraftly API.
