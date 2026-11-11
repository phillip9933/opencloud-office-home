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

The full audit decreased from 68 findings (1 critical, 26 high, 34 moderate, 7 low) to 11
(0 critical, 5 high, 5 moderate, 1 low). The final audit still exits unsuccessfully.

## Unresolved upstream dependencies

| Dependency                                  | Remaining advisory scope                        | Required follow-up                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adm-zip` 0.5.18 via federation DTS tooling | Eight findings; highest severity high           | Parent pins this pre-1.0 release. Review and exercise its archive/type-download behavior before moving across the 0.6 API boundary; no untested override applied. |
| `glob` 13.0.6 via gettext tooling           | One moderate finding; patch line 14.0.2         | Requires a major parent/tooling migration and affected extraction tests.                                                                                          |
| `minimatch` 9.0.9 / 10.2.6 via tooling      | One moderate finding; patch line 11.0.1         | Requires major-version compatibility work across its parents.                                                                                                     |
| `deepmerge` 4.3.1 via web-pkg               | One low finding; audit lists no patched version | Requires an upstream fix or separately reviewed replacement; host runtime ownership must be considered.                                                           |

The first three are development-tool paths in the inspected graph. Do not expose development servers
or process untrusted remote type archives with these tools. The runtime reachability of deepmerge's
reported issue is not established by this audit. These remain release blockers, not exceptions.

`pnpm peers check` also reports inherited focus-trap 8 versus focus-trap-vue's 7 range, TypeScript 6
versus federation DTS's 4/5 range, and Tiptap table-of-contents 3.33 versus host core/pm 3.31.3. Builds
pass, but that does not establish full compatibility. Changing the host SDK or forcing runtime
versions just to silence peer warnings would exceed the verified baseline. Resolve these upstream
and repeat real-host acceptance before release.

The inherited Apache-2.0 skeleton notices remain intact. New application-code licensing and the
OpenCloud AGPL dependency/contribution requirements still need a release decision. No public license
or support claim is introduced by this maintenance.
