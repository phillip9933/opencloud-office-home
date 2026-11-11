# Development limits

No release is permitted while an applicable entry remains open. Current artifacts are local inspection/preview outputs only. Default release builds reject the incomplete adapter; opt-in spike artifacts use a separate directory. Marker text alone does not establish safety.

## DL-001: Unavailable native OpenCloud adapter

- **Type:** placeholder
- **Purpose:** Establish typed workflows and registration without inventing deployed APIs or credentials.
- **Location:** `src/adapters/opencloud/unconfigured.ts`, `vite.config.ts`.
- **Release behaviour:** Real authenticated catalog, capability, creation, copy, preview and native editor services, plus the administrator template folder (proposed `templateFolder` setting), tested against a pinned deployment.
- **Resolution:** Implement and verify the adapter; complete the source/deployment matrix, permissions, native return and file durability checks.
- **Verification:** Default `pnpm build` must fail. `build:spike` is explicit, writes `dist-spike/`, and cannot be mistaken for the default release output.
- **Tested build and result:** Preliminary 0.1.0 spike. Final command evidence is recorded in workspace outputs; no production behavior has been tested.
- **Status:** open

## DL-002: Synthetic preview services

- **Type:** placeholder
- **Purpose:** Exercise the shell and asynchronous workflows without contacting OpenCloud.
- **Location:** `src/fixtures/services.ts` and `src/fixtures/previews.ts` (locally drawn template preview images and seeded browser history), imported only through `src/preview.ts` and tests.
- **Release behaviour:** No synthetic resources, create results, editor acknowledgments or fixture capabilities in the native package.
- **Resolution:** Keep fixtures in the explicitly invoked preview/test graph; prove exclusion from every eventual release artifact.
- **Verification:** `check:artifacts` scans the native spike tree for distinctive fixture identities and requires its manifest. The preview displays a synthetic-only banner. This is a bounded artifact check, not proof of real service behavior.
- **Tested build and result:** Preliminary spike/preview builds and unit/browser workflows. Native release integration remains unverified.
- **Status:** open

## DL-003: Disconnected read-only SDK catalog candidate

- **Type:** functional / placeholder
- **Purpose:** Develop metadata discovery against the pinned SDK without assuming a live deployment or enabling writes.
- **Location:** `src/adapters/opencloud/catalog8.ts`; imported by its unit tests only.
- **Release behaviour:** Verified native catalog with authorized search (including the recent-changes query), personal/project/received-share identity handling, honest completeness and lifecycle integration.
- **Resolution:** Match the actual deployment, capture sanitized contract fixtures, verify authorization and SDK cancellation behavior, and complete unsupported discovery before connecting the native entry.
- **Verification:** The candidate must deny mutation access, reject unsupported search/cursors, discard responses on logout/account changes and reject path-shaped IDs. Its port exposes no mutation methods. Native app and preview entrypoints must not import it while deployment checks are pending.
- **Tested build and result:** SDK-shaped local tests and strict compilation; no live discovery has been performed.
- **Status:** open

## DL-005: Disconnected provider capability candidate

- **Type:** functional / placeholder
- **Purpose:** Derive creation formats from the 8.x app registry and app-provider capability without connecting native creation.
- **Location:** `src/adapters/opencloud/providers8.ts`; imported by its unit tests only.
- **Release behaviour:** Native creation formats come from the host's app registry, intersected with tested provider support, with distinct not-configured, unsupported-format and launch-failure states.
- **Resolution:** Wire the port to `useAppProviderService()` and `useCapabilityStore()` in the native entry together with a verified creation and editor gateway; verify against a deployment with a registered provider.
- **Verification:** Unknown or disabled capabilities and an empty registry must refuse creation; contradictory, unnamed and malformed registry entries must not be offered; a provider removed after loading must block creation. The observed deployment's empty registry is a captured test case. Native app and preview entrypoints must not import the candidate while deployment checks are pending.
- **Tested build and result:** Strict compilation and unit tests against the SDK 8.2.1 declarations matching the observed host. Not run inside a host.
- **Status:** open

## DL-004: Disposable local development server example

- **Type:** security relaxation
- **Purpose:** Preserve an explicitly selected form of the official starter's local development example.
- **Location:** `dev/docker-compose.yml`, development profile only.
- **Release behaviour:** No insecure/demo server configuration is shipped as production setup or enabled by default.
- **Resolution:** Exclude the example from release installation and verify the supported deployment separately.
- **Verification:** A required explicit image and disposable password, the development profile and loopback-only port binding make use deliberate. No Compose command runs during setup, checks or this migration. Release packaging must exclude the example.
- **Tested build and result:** Configuration inspected only; no server was installed, started or reconfigured.
- **Status:** open

Scan scope: source/configuration, native spike and preview output. Exclude dependency code, generated module-federation cache, tests and documentation from marker-based production findings only with their stated role. Native `src/index.ts` and its imports define the package graph; `index.html` belongs to the preview only. The disconnected catalog and provider candidates are test-imported only. The disposable server example is not a release install target. Old pre-gate `dist/` output is obsolete and must not be installed.
