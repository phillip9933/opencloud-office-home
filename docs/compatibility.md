# Compatibility and foundation

This is local source/build evidence, not certification for a deployed OpenCloud system. The native integration is still unavailable and default release builds remain blocked.

## Recorded baseline

| Component          | Verified observation                                                                                      | Limit                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Foundation         | Full clone of opencloud-eu/web-app-skeleton, commit 77f3194743046cf36ac567f7f241b5f33450df14              | Upstream history retained; no upstream submission                                  |
| Tooling            | pnpm 11.27.0 and the upstream lockfile/configuration, extended for office testing                         | Local Linux verification only                                                      |
| OpenCloud packages | Web client, Web package, design system, extension SDK and shared configs resolve to 8.0.0 in the lockfile | Build baseline, not a verified deployment                                          |
| Types              | Shared OpenCloud tsconfig with strict null checks, unknown catch variables and Vite client types          | Vite types address the stock starter's TypeScript 6 CSS side-effect import failure |
| Lint/format        | Shared OpenCloud ESLint and Prettier configurations                                                       | Strict application checks retained                                                 |
| Package manager    | Local store, install scripts disabled and stale dependencies rejected                                     | Setup needs registry access; checks run without it                                 |
| Server/editor      | No verified server/Web/editor pairing                                                                     | Collabora remains a provisional reference                                          |
| Packaging          | SDK native inspection package and separate synthetic preview                                              | No installable release claim                                                       |

The earlier scratch spike investigated SDK 7.2 interfaces. Its useful application code and tests were ported onto the official starter. The disconnected catalog candidate now compiles against the installed SDK 8.0.0 declarations. This does not require a deployment to adopt that baseline.

## SDK contract candidates

The disconnected catalog uses the SDK's normal-user listMyDrives, listFiles and getFileInfo methods. Its port exposes no mutations or credential handling. Synthetic tests cover identities, malformed data, path-shaped references, family filtering, cancellation, account changes and safe error categories.

| Seam           | Current evidence                                                                           | Required deployment evidence                                                    |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Registration   | Authenticated routes and matching native menu entries compile and have a registration test | Host injection, switcher, base path, login and editor return                    |
| Spaces         | Personal/project roots through normal-user discovery                                       | Real personal/team/received-share identities and access                         |
| Folder listing | Depth-one requests with opaque IDs; explicit partial results                               | Completeness, limits and transport cancellation                                 |
| Metadata       | Identity match and account-generation guard                                                | Real unauthorized/revoked access tests                                          |
| Search/cursors | Explicitly unavailable; no recursive crawling or fabricated cursors                        | Authorized query grammar, scope, escaping and pagination                        |
| Copy/create    | Unavailable                                                                                | ACLs, template copy/revision/share behavior and uncertain-result reconciliation |
| Editor         | Unavailable                                                                                | Native launch, view/edit authorization, return state and file durability        |

The catalog is imported only by tests. The native entry still uses the unavailable adapter; configuration cannot activate it. Candidate records deny write/child-create access. Metadata display does not authorize content access.

## Remaining evidence

No live contract fixture has been captured. Server-side permission enforcement, received shares, provider capabilities, file fidelity, collaboration, native sharing and save durability are **not verified**. Cross-device history/preferences are unverified.

The SDK 8.x toolchain requires fresh security and license review before release. A successful build is not a clean advisory scan. Accessibility, screen readers, host themes/lifecycle, user usability, secret/SAST scans, CI, deployment and release reproducibility remain separate gates.

No domain, proxy, DNS, TLS, identity, server installation or deployment changes have been made. The optional development Compose example is manually selected and disposable; it is not production setup or an office-server installer.

See [upstream foundation](upstream-skeleton.md), [development limits](dev-limits.md), [architecture](architecture.md) and [provisional decisions](decisions/0001-preliminary-spike.md).
