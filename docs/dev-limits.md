# Development limits

No full release is permitted while an applicable entry remains open. An explicit native test-instance artifact may be installed for controlled acceptance with disclosed non-security limits. Default release builds reject the incomplete adapter; opt-in spike artifacts use a separate directory. Marker text alone does not establish safety.

## DL-001: Native integration acceptance incomplete

- **Type:** placeholder
- **Purpose:** Establish typed workflows and registration without inventing deployed APIs or credentials.
- **Location:** `src/adapters/opencloud/native8.ts`, `vite.config.ts`. The unavailable adapter remains test-only.
- **Release behaviour:** Real authenticated catalog, capability, creation, copy, preview, file-action (Show in Files, share, download) and native editor services, plus the administrator `templateFolder` setting, tested against a pinned deployment.
- **Resolution:** Verify the connected native adapter; complete the source/deployment matrix, permissions, native return and file durability checks.
- **Verification:** Default `pnpm build` must fail. `build:spike` writes `dist-spike/`; `build:test-instance` writes `dist-native-test/`. Neither enables the default release build.
- **Tested build and result:** Preliminary 0.1.0 spike. Final command evidence is recorded in workspace outputs; no production behavior has been tested.
- **Status:** open

## DL-007: Retired shared configuration console

- **Type:** functional
- **Purpose:** Previously tracked shared policy-file ACL and conditional-write acceptance.
- **Location:** Removed Administration view, policy-file adapter and synthetic store.
- **Release behaviour:** Deployment administrators edit static app configuration; Office has no shared settings read/write operation.
- **Resolution:** The console and its saving feature were removed from product scope. Its ordinary-user transport acceptance is no longer applicable; this does not claim that the old gate passed.
- **Verification:** Registration checks exclude an admin route, source removes policy storage and the native artifact check rejects former console/storage UI markers. Personal template policy and backend capability restrictions retain coverage.
- **Tested build and result:** Current static-configuration implementation; see compatibility for final checks.
- **Status:** verified

## DL-002: Synthetic preview services

- **Type:** placeholder
- **Purpose:** Exercise the shell and asynchronous workflows without contacting OpenCloud.
- **Location:** `src/fixtures/services.ts` and `src/fixtures/previews.ts` (locally drawn template preview images, seeded browser history, synthetic favorites, tags, shares, locks, links and activity, and simulated file actions), imported only through `src/preview.ts` and tests.
- **Release behaviour:** No synthetic resources, create results, editor acknowledgments or fixture capabilities in the native package.
- **Resolution:** Keep fixtures in the explicitly invoked preview/test graph; prove exclusion from every eventual release artifact.
- **Verification:** `check:artifacts` scans the native spike tree for distinctive fixture identities and requires its manifest. Preview creation/editor feedback identifies simulated actions. This is a bounded artifact check, not proof of real service behavior.
- **Tested build and result:** Preliminary spike/preview builds and unit/browser workflows. Native release integration remains unverified.
- **Status:** open

## DL-003: Partial native catalog coverage

- **Type:** functional / placeholder
- **Purpose:** Develop metadata discovery against the pinned SDK without assuming a live deployment or assuming permissions.
- **Location:** `src/adapters/opencloud/catalog8.ts`; connected by the native test adapter.
- **Release behaviour:** Verified native catalog with authorized search (recent changes, all-spaces name search, favorite/tag filters and the tag list), latest-activity lookup, personal/project/received-share identity handling, honest completeness and lifecycle integration.
- **Resolution:** Match the actual deployment, capture sanitized contract fixtures, verify authorization and SDK cancellation behavior, and complete unsupported discovery before a full release.
- **Verification:** The candidate must deny mutation access, refuse unsupported query characters/cursors, discard responses on logout/account changes and reject path-shaped IDs. Its read port exposes no mutations. The native test adapter supplies explicit DAV permission normalization; the default normalizer still denies writes. Received shares remain in Files.
- **Tested build and result:** SDK-shaped isolated tests and strict compilation; authenticated catalog acceptance is pending.
- **Status:** open

## DL-005: Provider acceptance incomplete

- **Type:** functional / placeholder
- **Purpose:** Derive creation formats from the 8.x app registry and app-provider capability with missing or changing providers handled explicitly.
- **Location:** `src/adapters/opencloud/providers8.ts`; connected by the native test adapter.
- **Release behaviour:** Native creation formats come from the host's app registry, intersected with tested provider support, with distinct not-configured, unsupported-format and launch-failure states.
- **Resolution:** The port is wired to host services; verify against a deployment with a registered provider.
- **Verification:** Unknown or disabled capabilities and an empty registry must refuse creation; contradictory, unnamed and malformed registry entries must not be offered; a provider removed after loading must block creation. The earlier empty registry is a captured test case; the current host advertises CollaboraOnline with 65 MIME types. Fixture preview services remain separate; real creation and editor saves still need acceptance.
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

Scan scope: source/configuration, native spike, native test and preview output. Exclude dependency code, generated module-federation cache, tests and documentation from marker-based production findings only with their stated role. Native `src/index.ts` and its imports define the package graph; `index.html` belongs to the preview only. Catalog/provider candidates are now in the native test graph; their acceptance remains incomplete. The disposable server example is not a release install target. Old pre-gate `dist/` output is obsolete and must not be installed.

## DL-006: Template-container conversion pending

- **Type:** functional
- **Purpose:** Refuse `.ott`, `.ots` and `.otp` creation until the native editor conversion flow can be verified without leaving an empty or mislabeled file.
- **Location:** `src/adapters/opencloud/native8.ts`.
- **Release behaviour:** A template container creates a complete independent editable document through the configured native integration.
- **Resolution:** Implement conversion with interrupted-operation recovery and test real content fidelity. Ordinary same-format document COPY is available for initial testing.
- **Verification:** A template-container request must refuse before dispatch; ordinary COPY must use overwrite false and preserve the source.
- **Tested build and result:** Isolated boundary tests pass. Native test commit `3d34f1a`: ordinary ODT/ODS/ODP copies downloaded byte-identical to their synthetic sources, with new copy identities and preserved source identities/bytes. Template-container conversion and editor rendering acceptance remain pending.
- **Status:** open
