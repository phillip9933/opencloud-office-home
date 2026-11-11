# Office Home for OpenCloud

Based on the official [OpenCloud app skeleton](https://github.com/opencloud-eu/web-app-skeleton),
with upstream history and shared tooling preserved. See [upstream
foundation](docs/upstream-skeleton.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Preliminary TypeScript/Vue application for three OpenCloud home screens: Docs, Sheets and Slides.
Each shares navigation, file discovery, creation and editor services. The native adapter now uses
OpenCloud Web 8.2.1 services. An explicit test-instance build is available for controlled
integration testing; full releases remain blocked pending live acceptance and security review.

## Supported platforms

Local tooling has been exercised on Linux with Node 26.12.1 and pnpm 11.27.0. Hosted CI validation
also passed on Node 24 and 26; other operating systems have not been tested. The lockfile pins
OpenCloud Web packages 8.2.1, matching the Web release observed on the test deployment; no
server/editor pairing is supported yet.

## Quick start

From this directory, in a disposable environment without user credentials:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the localhost URL printed by Vite. The explicit preview uses synthetic data, session-only
recents and simulated create/open actions. No document bytes are created and no editor is embedded.
In this preview, templates come from synthetic folders with drawn images. Native test installations
use OpenCloud COPY for ordinary document templates; see [compatibility](docs/compatibility.md) for
verified behavior and the unsupported template-container formats.

For local agent execution on Linux, use the reviewed Bubblewrap wrapper:

```sh
OFFICE_PNPM_PACKAGE=/absolute/tooling/node_modules/pnpm \
  bash scripts/run-isolated.sh pnpm check
```

It mounts this source directory read/write, system tools read-only, and a fresh temporary home. It
exposes neither host home directories nor credential sockets and unshares the network. Initial
dependency installation needs a separately restricted environment with access to the public npm
registry; the default runner deliberately has none.

## Development commands

| Command                    | Purpose                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm dev`                 | Explicit synthetic preview on localhost                                                         |
| `pnpm test:unit`           | Unit and workflow boundary tests                                                                |
| `pnpm test:e2e`            | Local browser journeys, keyboard and narrow layout checks                                       |
| `pnpm check:types`         | Strict TypeScript and Vue types                                                                 |
| `pnpm lint`                | TypeScript and structural Vue lint                                                              |
| `pnpm format:check`        | Prettier style checks                                                                           |
| `pnpm check`               | Types, lint, formatting, unit tests, spike/preview builds and artifact boundary check           |
| `pnpm build:test-instance` | Native test artifact in `dist-native-test/`; see [test installation](docs/test-installation.md) |
| `pnpm build:spike`         | Explicit native inspection artifact in `dist-spike/`                                            |
| `pnpm build:preview`       | Separate synthetic preview in `dist-preview/`                                                   |
| `pnpm build`               | Release build gate; intentionally rejects the incomplete native adapter                         |

Browser tests require a Playwright-compatible Chromium. An existing reviewed binary can be supplied
with `OFFICE_BROWSER_EXECUTABLE`; the wrapper mounts only its directory read-only. Tests use a
temporary profile, not an existing browser session.

```sh
OFFICE_BROWSER_EXECUTABLE=/absolute/test-browser/chrome \
OFFICE_PNPM_PACKAGE=/absolute/tooling/node_modules/pnpm \
  bash scripts/run-isolated.sh pnpm test:e2e
```

The aggregate check does not claim real OpenCloud, editor fidelity, authentication, accessibility
conformance, clean dependency security or production readiness. See the compatibility note for
missing evidence. The validation workflow runs these checks plus native packaging and browser journeys on Node 24/26; see [validation](docs/validation.md) for its scope and remaining evidence.

## Repository map

- `src/index.ts`: native application registration and the single Office app-switcher entry.
- `src/views/OfficeHome.vue` and `src/components/`: shared Docs/Sheets/Slides home, template gallery, inline creation, recent list/grid and destination/template-folder pickers.
- `src/views/OfficeSettings.vue`: template-folder preferences and start-section display.
- `src/components/ColumnMenu.vue`: in-place optional file columns and ordering.
- `src/app/`: shared catalog and session navigation state.
- `src/services/`: home lifecycle, creation/reconciliation, recent loading, shared errors and file presentation.
- `src/contracts/`: leaf file/preference types and application-owned service contracts.
- `src/adapters/opencloud/`: session-scoped Web 8.2.1 host binding, catalog, DAV permissions, creation/copy, native editor/file actions and previews.
- `src/preferences/`: scoped, bounded recent references and view choices.
- `src/fixtures/` and `src/preview.ts`: separate synthetic preview, excluded from native entrypoint.
- `tests/`: unit boundaries and browser journeys.
- [Architecture](docs/architecture.md), [design](docs/design.md), [compatibility](docs/compatibility.md), [development limits](docs/dev-limits.md), [provisional decisions](docs/decisions/0001-preliminary-spike.md), [template folder](docs/templates.md).

## Releases, security and support

No production release or support claim exists. The default release build fails closed; opt-in native
test artifacts have disclosed functional limits. Installation and rollback are documented separately
from production configuration. OpenCloud must remain responsible for identity, authorization,
storage and sharing; the configured native editor integration owns sessions and saving.

Office Home application code is licensed under **AGPL-3.0-only**; see
[LICENSE-AGPL-3.0](LICENSE-AGPL-3.0). The inherited [LICENSE](LICENSE) preserves the skeleton's
Apache-2.0 terms. [Third-party notices](THIRD_PARTY_NOTICES.md) describe the scope and retained
attribution; dependencies retain their own licenses. See [licensing and source availability](docs/licensing.md)
before distributing or operating a modified version for other users.

Dependency advisories remain a release blocker. A vulnerability-reporting channel has not yet been
established. Do not include confidential findings or credentials in source or issue text.

Installation-wide template and creation defaults are configured in the app's administrator-owned
configuration file. See [installation configuration](docs/configuration.md) and its minimal JSON
example. Office has no administration console or configuration-saving service.
