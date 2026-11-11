# Compatibility and foundation

This is local source/build evidence, not certification for a deployed OpenCloud system. The native integration is still unavailable and default release builds remain blocked.

## Recorded baseline

| Component          | Verified observation                                                                                      | Limit                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Foundation         | Full clone of opencloud-eu/web-app-skeleton, commit 77f3194743046cf36ac567f7f241b5f33450df14              | Upstream history retained; no upstream submission                                  |
| Tooling            | pnpm 11.27.0 and the upstream lockfile/configuration, extended for office testing                         | Local Linux verification only                                                      |
| OpenCloud packages | Web client, Web package, design system, extension SDK and shared configs resolve to 8.2.1 in the lockfile | Matches the observed host's Web release; not a verified deployment                 |
| Types              | Shared OpenCloud tsconfig with strict null checks, unknown catch variables and Vite client types          | Vite types address the stock starter's TypeScript 6 CSS side-effect import failure |
| Lint/format        | Shared OpenCloud ESLint and Prettier configurations                                                       | Strict application checks retained                                                 |
| Package manager    | Local store, install scripts disabled and stale dependencies rejected                                     | Setup needs registry access; checks run without it                                 |
| Server/editor      | Test deployment observed as OpenCloud 9.0.0 with Web 8.2.1 and no registered office provider (below)      | No editor pairing exists to verify; Collabora remains a provisional reference      |
| Packaging          | SDK native inspection package and separate synthetic preview                                              | No installable release claim                                                       |

The earlier scratch spike investigated SDK 7.2 interfaces. Its useful application code and tests were ported onto the official starter. The disconnected candidates compile against the installed SDK 8.2.1 declarations, the Web release of the observed test deployment. Another deployment would need its own Web release matched.

## Observed test deployment (2026-11-11)

Read-only, unauthenticated observations of the authorized test deployment. Authenticated discovery is still blocked because no session for the intended test account was available; nothing below establishes user permissions, spaces, shares or search results.

| Component             | Verified observation                                                                                                                                                                      | Method                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Server                | OpenCloud `productversion` 9.0.0, edition `rolling`                                                                                                                                       | Public `status.php` and capabilities response                                                                                         |
| Web                   | Official Web v8.2.1, the release pinned by OpenCloud v9.0.0 (`WEB_ASSETS_VERSION`)                                                                                                        | Entry and `web-client` bundles byte-identical to the v8.2.1 release tarball, whose SHA-256 matches the published release digest       |
| Shared SDK at runtime | Host shares `vue`, `@opencloud-eu/web-client` and `@opencloud-eu/web-pkg` singletons with extensions                                                                                      | Host module-federation share map in the deployed bundle                                                                               |
| App providers         | Capability `files.app_providers[0]`: enabled, version 1.1.0, `apps_url`, `open_url`, `open_web_url`, `new_url`                                                                            | Public capabilities response                                                                                                          |
| Office editor         | `/app/list` returns `{"mime-types":[]}`: no provider is registered for any MIME type                                                                                                      | Public endpoint; in 9.0.0 it is unprotected and filtered only by user agent, not by user                                              |
| Search                | `dav.reports` includes `search-files`; name, mtime, mediatype (`document`, `spreadsheet`, `presentation`, …), type, tag and scope enabled; content search and `full_text_search` disabled | Public capabilities response; query grammar and pagination not exercised                                                              |
| Spaces/sharing        | Spaces and project spaces enabled; share jail enabled; favorites disabled                                                                                                                 | Public capabilities response                                                                                                          |
| Previews              | The 9.0.0 preview pipeline converts images, `text/plain`, FLAC/MP3/Ogg audio and GeoGebra files only; ODF and OOXML have no converter                                                     | v9.0.0 source (`services/webdav` source types and preprocessors); `additional_source_types` only adds types the image generator reads |
| Web apps              | `external` is enabled; `office-settings` (admin font list) ships with Web 8.2.1                                                                                                           | Public `config.json` and release contents                                                                                             |

Consequences:

- No create, open, edit, save, template or collaboration test is possible on this deployment until an administrator registers an office provider. The app must show "not configured", not a broken launch.
- The lockfile now resolves the OpenCloud packages to 8.2.1, matching the host. Between the earlier 8.0.0 baseline and 8.2.1, the declarations for every SDK symbol this app uses (`listMyDrives`, `listFiles`, `getFileInfo`, `search`, `AppProviderService`, app-provider schemas, `AppMenuItemExtension`, `Resource`) are unchanged or widened; `icon` also accepts named/image icon objects. Running the package inside the host has not been tested.
- The 8.2.1 resolution leaves `@tiptap/extension-table-of-contents` 3.33.0 beside other tiptap packages at 3.31.3, an unmet exact peer range. Official Web 8.2.1 locks tiptap 3.32.0. This app neither imports tiptap nor bundles it: the host supplies `web-pkg` at runtime.

### Native seams confirmed in Web 8.2.1 source

These are upstream facts for the observed release, recorded for the adapter design. They are not yet exercised through this app.

| Seam            | Web 8.2.1 behavior                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider list   | `AppProviderService.loadData()` fetches `app/list` unauthenticated at boot; `useAppProviderService().mimeTypes` exposes the validated result                                                                                                                    |
| Native creation | The external app registers `newFileMenu` only for MIME types with `allow_creation`; it POSTs `parent_container_id` and `filename` to `filesAppProviders[0].new_url`, then resolves the new file by path                                                         |
| Editor launch   | Each provider becomes app `external-<name>` with route `external-<name>-apps`; `useFileActions().getEditorRouteOpts(...)` builds the route                                                                                                                      |
| Return routing  | `contextRouteNameKey`, `contextRouteParamsKey` and `contextRouteQueryKey` query entries carry the return location through the editor route                                                                                                                      |
| Templates       | Providers advertise template MIME types with `target_ext`; native "create from template" creates a blank target file in the personal space and opens the editor with the template file ID. The app-registry `template` parameter remains unimplemented in 9.0.0 |

## SDK contract candidates

The disconnected catalog uses the SDK's normal-user listMyDrives, listFiles and getFileInfo methods. Its port exposes no mutations or credential handling. Synthetic tests cover identities, malformed data, path-shaped references, family filtering, cancellation, account changes and safe error categories.

The disconnected provider candidate reads `AppProviderService.mimeTypes` and the app-provider capability. It offers a family format for creation only when the capability is explicitly enabled with a creation endpoint and a named provider allows creating that MIME type. An empty registry reports "not configured"; a provider that opens but cannot create a family reports no creatable format. Its tests include the captured empty registry from the observed deployment.

| Seam           | Current evidence                                                                                                                            | Required deployment evidence                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Registration   | Authenticated routes and matching native menu entries compile and have a registration test                                                  | Host injection, switcher, base path, login and editor return                    |
| Spaces         | Personal/project roots through normal-user discovery                                                                                        | Real personal/team/received-share identities and access                         |
| Folder listing | Depth-one requests with opaque IDs; explicit partial results                                                                                | Completeness, limits and transport cancellation                                 |
| Metadata       | Identity match and account-generation guard                                                                                                 | Real unauthorized/revoked access tests                                          |
| Recent filters | Candidate `is:favorite` and `tag:(…)` clauses and Graph `listTags`; test deployment advertises `files.favorites: false`, `files.tags: true` | Live tag list, favorite/tag search results and share hits                       |
| Recent changes | Candidate search `mtime:"last 30 days" AND mediatype:(…)`, grammar checked in v9.0.0 KQL source                                             | Live results, ranking/truncation, share hits and modifier semantics             |
| Search/cursors | Folder text search explicitly unavailable; no recursive crawling or fabricated cursors                                                      | Authorized query grammar, scope, escaping and pagination                        |
| Providers      | Creation-format candidate; captured empty registry reports not configured                                                                   | A registered provider, its MIME/creation policy and launch results              |
| Copy/create    | Unavailable                                                                                                                                 | ACLs, template copy/revision/share behavior and uncertain-result reconciliation |
| Editor         | Unavailable                                                                                                                                 | Native launch, view/edit authorization, return state and file durability        |

The catalog is imported only by tests. The native entry still uses the unavailable adapter; configuration cannot activate it. Candidate records deny write/child-create access. Metadata display does not authorize content access.

## Remaining evidence

The only live contract fixture is the public, user-independent empty provider registry. No authenticated response has been captured. Server-side permission enforcement, received shares, provider capabilities, file fidelity, collaboration, native sharing and save durability are **not verified**. Cross-device history/preferences are unverified.

The SDK 8.x toolchain requires fresh security and license review before release. A successful build is not a clean advisory scan. Accessibility, screen readers, host themes/lifecycle, user usability, secret/SAST scans, CI, deployment and release reproducibility remain separate gates.

No domain, proxy, DNS, TLS, identity, server installation or deployment changes have been made. The optional development Compose example is manually selected and disposable; it is not production setup or an office-server installer.

See [upstream foundation](upstream-skeleton.md), [development limits](dev-limits.md), [architecture](architecture.md) and [provisional decisions](decisions/0001-preliminary-spike.md).
