# Office Home for OpenCloud

**Developer prototype — feedback and contributions welcome.**

Office Home adds Docs, Sheets and Slides landing pages inside OpenCloud: recent files, favorites,
managed templates and an inline creation flow that opens the new file in the configured editor.
Each family has a direct route for optional friendly-domain redirects to the canonical OpenCloud host.

It is one TypeScript/Vue Web app, using OpenCloud's existing storage, permissions and office
integration. No additional backend or container is needed. It is based on the official
[OpenCloud app skeleton](https://github.com/opencloud-eu/web-app-skeleton), with upstream history
and [original notices](THIRD_PARTY_NOTICES.md) preserved.

Controlled testing has covered OpenCloud 9.0.0 / Web 8.2.1 with Collabora. Production releases remain
blocked by outstanding compatibility, accessibility and dependency checks. Start with the synthetic
preview below, or read [test installation](docs/test-installation.md) for an isolated integration
evaluation. [Compatibility](docs/compatibility.md) distinguishes verified behavior from remaining
work; [contributing](CONTRIBUTING.md) explains how to review or propose changes.

## Supported platforms

Local tooling has been exercised on Linux with Node 26.12.1 and pnpm 11.27.0. Hosted CI validation
also passed on Node 24 and 26; other operating systems have not been tested. The lockfile pins
OpenCloud Web packages 8.2.1, matching the Web release observed on the test deployment; no
server/editor pairing is supported yet.

## Quick start

Use Node >=24 and pnpm 11.27.0. Clone the repository, then run the preview in a disposable
environment without production credentials:

```sh
git clone https://github.com/phillip9933/opencloud-office-home.git
cd opencloud-office-home
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the localhost URL printed by Vite. The explicit preview uses synthetic data, session-only
recents and simulated create/open actions. No document bytes are created and no editor is embedded.
In this preview, templates come from synthetic folders with drawn images. Native test installations
use OpenCloud COPY for ordinary document templates; see [compatibility](docs/compatibility.md) for
verified behavior and the unsupported template-container formats.

For isolated local execution on Linux, the repository includes a Bubblewrap wrapper:

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

Dependency advisories remain a release blocker; see [dependency status](docs/dependency-status.md).
Use [SECURITY.md](SECURITY.md) to report vulnerabilities privately. General feedback and reproducible
non-security bugs belong in [Issues](https://github.com/phillip9933/opencloud-office-home/issues).

Installation-wide template and creation defaults are configured in the app's administrator-owned
configuration file. See [installation configuration](docs/configuration.md) and its minimal JSON
example. Office has no administration console or configuration-saving service.
