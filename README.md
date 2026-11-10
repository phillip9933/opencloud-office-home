# OpenCloud Office Apps

Based on the official [OpenCloud app skeleton](https://github.com/opencloud-eu/web-app-skeleton), with upstream history and shared tooling preserved. See [upstream foundation](docs/upstream-skeleton.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Preliminary TypeScript/Vue application for three OpenCloud home screens: Docs, Sheets and Slides. Each shares navigation, file discovery, creation and editor services. The current implementation is a local compatibility spike with synthetic workflows; it is not ready for installation on a live instance.

## Supported platforms

Local tooling has been exercised on Linux with Node 26.12.1 and pnpm 11.27.0. The project declares Node >=24, but other Node versions and operating systems have not been tested. The build spike pins OpenCloud Web packages 8.0.0; no server/editor pairing is supported yet.

## Quick start

From this directory, in a disposable environment without user credentials:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the localhost URL printed by Vite. The explicit preview uses synthetic data, session-only recents and simulated create/open actions. No document bytes are created and no editor is embedded. Managed templates are represented by fixtures, not a verified server-side copy implementation.

For local agent execution on Linux, use the reviewed Bubblewrap wrapper:

```sh
OFFICE_PNPM_PACKAGE=/absolute/tooling/node_modules/pnpm \
  bash scripts/run-isolated.sh pnpm check
```

It mounts this source directory read/write, system tools read-only, and a fresh temporary home. It exposes neither host home directories nor credential sockets and unshares the network. Initial dependency installation needs a separately restricted environment with access to the public npm registry; the default runner deliberately has none.

## Development commands

| Command              | Purpose                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev`           | Explicit synthetic preview on localhost                                               |
| `pnpm test:unit`     | Unit and workflow boundary tests                                                      |
| `pnpm test:e2e`      | Local browser journeys, keyboard and narrow layout checks                             |
| `pnpm check:types`   | Strict TypeScript and Vue types                                                       |
| `pnpm lint`          | TypeScript and structural Vue lint                                                    |
| `pnpm format:check`  | Prettier style checks                                                                 |
| `pnpm check`         | Types, lint, formatting, unit tests, spike/preview builds and artifact boundary check |
| `pnpm build:spike`   | Explicit native inspection artifact in `dist-spike/`                                  |
| `pnpm build:preview` | Separate synthetic preview in `dist-preview/`                                         |
| `pnpm build`         | Release build gate; intentionally rejects the incomplete native adapter               |

Browser tests require a Playwright-compatible Chromium. An existing reviewed binary can be supplied with `OFFICE_BROWSER_EXECUTABLE`; the wrapper mounts only its directory read-only. Tests use a temporary profile, not an existing browser session.

```sh
OFFICE_BROWSER_EXECUTABLE=/absolute/test-browser/chrome \
OFFICE_PNPM_PACKAGE=/absolute/tooling/node_modules/pnpm \
  bash scripts/run-isolated.sh pnpm test:e2e
```

The aggregate check does not claim real OpenCloud, editor fidelity, authentication, accessibility conformance, clean dependency security or production readiness. See the compatibility note for missing evidence. No remote CI has been configured.

## Repository map

- `src/index.ts`: native application registration and app-switcher entries.
- `src/views/OfficeHome.vue`: shared Docs/Sheets/Slides home.
- `src/app/`: shared catalog and session navigation state.
- `src/services/`: asynchronous home workflow, cancellation and mutation recovery.
- `src/contracts/`: application-owned service contracts.
- `src/adapters/opencloud/`: unavailable native adapter and a disconnected read-only SDK 8.x catalog candidate, awaiting deployed API verification.
- `src/preferences/`: scoped, bounded recent references.
- `src/fixtures/` and `src/preview.ts`: separate synthetic preview, excluded from native entrypoint.
- `tests/`: unit boundaries and browser journeys.
- [Architecture](docs/architecture.md), [design](docs/design.md), [compatibility](docs/compatibility.md), [development limits](docs/dev-limits.md), [provisional decisions](docs/decisions/0001-preliminary-spike.md).

## Releases, security and support

No release, deployment, production configuration or support claim exists. The native adapter is deliberately unavailable, and the release build fails closed. OpenCloud must remain responsible for identity, authorization, storage and sharing; the configured native editor integration owns sessions and saving.

New-code license selection is pending review of the OpenCloud AGPL-3.0 packages and other dependencies. Dependency advisories remain a release blocker. A vulnerability-reporting channel has not yet been established. Do not include confidential findings or credentials in source or issue text.
