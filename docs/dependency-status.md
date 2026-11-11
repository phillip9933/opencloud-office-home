# Dependency status

Reviewed 2026-11-11 against the complete pnpm lockfile using npm audit. Package metadata goes to the
public npm registry; application source does not. This is advisory matching, not a proof of reachable
exploitation or a penetration test. No findings have been suppressed or accepted as risk.

## Applied maintenance

- Vite 8.3.7 with Rolldown 1.2.18 addresses the reviewed Vite advisory. Preview remains bound to
  loopback; local execution is isolated from credentials and external network.
- Vitest 5.0.3, Node 24 types, Axios 1.20.0 and patched compatible transitive dependencies replace
  vulnerable earlier resolutions. DOMPurify now resolves to 3.4.17 locally.
- Explicit federation-tool overrides replace its old Axios and WebSocket pins. They are recorded in
  `pnpm-workspace.yaml`; remove an override once the parent supplies a patched compatible version.
- OpenCloud packages are exactly 8.2.1, keeping the host contract explicit. The host supplies shared
  runtime modules; local dependency changes do not update a running OpenCloud server.
- Official Deque `@axe-core/playwright` 4.11.1 is a test-only addition for automated accessibility;
  its license is MPL-2.0 and it is excluded from the native app entrypoint.

The current lockfile audit reports one low-severity finding in `deepmerge` (down from the
original 68 findings). No critical, high or moderate lockfile advisories remain. The audit still
fails; no finding is suppressed or accepted as risk.

## Transitive compatibility checks

`pnpm-workspace.yaml` pins federation's `adm-zip` to 0.6.1, gettext and js-beautify's `glob` to
14.0.4, and `minimatch` to 11.0.5. The latter meets the package-age policy; no age exemption is used.
The changes add no runtime service or application dependency. Remove each override when its parent
resolves an equivalent patched version, after repeating the compatibility checks.

The upstream changelogs were reviewed. Adm-zip changed flattened-directory extraction; federation
uses `Buffer` input with `extractAllTo`. Minimatch 11 removes regexp/AST APIs; the inspected parents
use `Minimatch.match`, `escape`, or `minimatch`. Glob 14 retains `globSync` and `hasMagic`, used by
the inspected tooling. `check:dependencies` exercises nested type-archive extraction, symlink
escape refusal, ignored glob results and normal/partial/base-name matching. Full lint, formatting,
compilation, builds and browser tests additionally exercise the actual parent consumers. These
checks do not prove every upstream option is compatible.

## Unresolved upstream dependencies

- `deepmerge` 4.3.1 has no published patched version in the reviewed advisory. Web 8.2.1 uses it to
  combine installation theme configuration. Office does not call it or supply theme configuration;
  the host supplies `web-pkg` as a shared singleton. Patching a local copy would not repair that
  running host. Keep this finding visible pending an upstream host fix or separately reviewed
  disposition; this is not a claim of an exploitable Office data path or an accepted risk.
- `vue3-gettext` 4.0.1 also bundles older glob/matcher implementation code inside its extraction CLI.
  A lockfile override cannot replace bundled code, and npm's advisory count does not cover it.
  Office has no translation extraction command or translated catalogs. Do not process untrusted
  inputs with that CLI; a rebuilt/fixed upstream package is still needed before enabling it.

`pnpm peers check` also reports inherited focus-trap 8 versus focus-trap-vue's 7 range, TypeScript 6
versus federation DTS's 4/5 range, and Tiptap table-of-contents 3.33 versus host core/pm 3.31.3. Builds
pass, but that does not establish full compatibility. Changing the host SDK or forcing runtime
versions just to silence peer warnings would exceed the verified baseline. Resolve these upstream
and repeat real-host acceptance before release.

## Recheck on 2026-11-12

The npm registry still lists `deepmerge` 4.3.1 and `vue3-gettext` 4.0.1 as latest. The
[reviewed deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) still lists no
patched version and rates the finding low. The bundled gettext CLI finding remains outside the
lockfile advisory count. Neither finding is fixed or accepted by documenting its limited use here.

The latest federation DTS plugin (2.9.3) now declares TypeScript 6 support, but the pinned
OpenCloud extension SDK's federation plugin resolves DTS 2.3.1. Replacing only that internal plugin
would need a separate parent/child compatibility check; it is not a verified drop-in repair.
The latest focus-trap-vue 4.1.0 still declares focus-trap 7. The host-owned focus-trap and Tiptap
mismatches remain pending an aligned host baseline. Do not upgrade the live server merely to
silence local peer diagnostics.

Office Home code is now AGPL-3.0-only and the inherited Apache-2.0 skeleton notices remain intact.
See [licensing and source availability](licensing.md). License selection is resolved; release
packaging, source availability for installation users and outstanding dependency findings still
need to satisfy their respective checks before a public release.
