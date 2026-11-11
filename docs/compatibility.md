# Compatibility and foundation

This is local source/build evidence, not certification for a deployed OpenCloud system. The native adapter is connected for explicit integration-test builds; default release builds remain blocked.

## Current native test status (2026-11-11)

A later public registry read reports **65 MIME types** under **CollaboraOnline**, replacing the earlier empty-registry observation below. The existing server remains OpenCloud 9.0.0 / Web 8.2.1. The official Web v8.2.1 source was inspected at `6816e1d4e3eb9d376f639ad392e74e3c438c4bca` for native creation, editor return context, explicit `view_mode`, Files selection/sharing routes, downloads, previews and DAV permission methods.

`host8.ts` now binds those host composables to `native8.ts`; the original read catalog is connected with a native permission normalizer, and provider formats are connected to the real registry. Isolated tests cover canonical identities, duplicate dispatch prevention, read-only destinations, same-origin creation, ordinary template COPY without overwrite, refusal to rename ODF template containers, account changes and late responses. A build is not proof of live create/save or permission correctness.

Controlled live testing now verifies one native Office menu entry, the three family routes, personal settings, the administration route, authorized recent metadata, writable personal destination selection, inline picker cancellation, native editor launch/return and app disable/re-enable rollback. Exactly one blank file of each ODT, ODS, ODP, DOCX, XLSX and PPTX type was created in a dedicated test folder. The provider remains responsible for populating and saving file content; content save/reopen has not been verified because the supported browser could not operate the editor’s nested welcome controls. Blank creation is not evidence of durable document content.

The current administration implementation has 124 passing isolated unit tests and 13 passing synthetic browser journeys in the aggregate application suites. Its 24-file native test artifact was installed with every served hash checked. The live administrator sees the form, and Save is correctly disabled without a configured policy file. Shared-file ACL provisioning, ordinary-user server denial, conditional saves and real additional-format/handler behavior remain DL-007 acceptance work. Local permission mocks are not live authorization evidence.

The following historical spike matrix records what was known before the native adapter. Live installation and acceptance results belong in the test-installation record; unsupported share aliases, pagination, template-container conversion, real logout cleanup, collaboration and durability remain release gates.

## Historical spike baseline

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

## Earlier unauthenticated observation (2026-11-11)

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
| Theme                 | Stock OpenCloud theme primary is `#e2baff` with on-primary `#20434f`; the app uses on-primary text and secondary links                                                                    | Public `themes/opencloud/theme.json`                                                                                                  |
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

## Historical SDK contract candidates

The disconnected catalog uses the SDK's normal-user listMyDrives, listFiles and getFileInfo methods. Its port exposes no mutations or credential handling. Synthetic tests cover identities, malformed data, path-shaped references, family filtering, cancellation, account changes and safe error categories.

The disconnected provider candidate reads `AppProviderService.mimeTypes` and the app-provider capability. It offers a family format for creation only when the capability is explicitly enabled with a creation endpoint and a named provider allows creating that MIME type. An empty registry reports "not configured"; a provider that opens but cannot create a family reports no creatable format. Its tests include the captured empty registry from the observed deployment.

| Seam                      | Current evidence                                                                                                                                 | Required deployment evidence                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Registration              | Authenticated routes and matching native menu entries compile and have a registration test                                                       | Host injection, switcher, base path, login and editor return                    |
| Spaces                    | Personal/project roots through normal-user discovery                                                                                             | Real personal/team/received-share identities and access                         |
| Folder listing            | Depth-one requests with opaque IDs; explicit partial results                                                                                     | Completeness, limits and transport cancellation                                 |
| Metadata                  | Identity match and account-generation guard                                                                                                      | Real unauthorized/revoked access tests                                          |
| All-spaces search         | Candidate `name:"*…*" AND mediatype:(…)` with sanitized text                                                                                     | Live results, ranking and share hits                                            |
| File actions and activity | `FileActions` port (unconnected); Graph `listActivities` with the Files panel query; private links, share types and locks from resource metadata | Native Show in Files/share/download routing, activity content, link format      |
| Recent filters            | Candidate `is:favorite` and `tag:(…)` clauses and Graph `listTags`; test deployment advertises `files.favorites: false`, `files.tags: true`      | Live tag list, favorite/tag search results and share hits                       |
| Recent changes            | Candidate search `mtime:"last 30 days" AND mediatype:(…)`, grammar checked in v9.0.0 KQL source                                                  | Live results, ranking/truncation, share hits and modifier semantics             |
| Search/cursors            | Folder text search explicitly unavailable; no recursive crawling or fabricated cursors                                                           | Authorized query grammar, scope, escaping and pagination                        |
| Providers                 | Creation-format candidate; captured empty registry reports not configured                                                                        | A registered provider, its MIME/creation policy and launch results              |
| Copy/create               | Unavailable                                                                                                                                      | ACLs, template copy/revision/share behavior and uncertain-result reconciliation |
| Editor                    | Unavailable                                                                                                                                      | Native launch, view/edit authorization, return state and file durability        |

The catalog is imported only by tests. The native entry still uses the unavailable adapter; configuration cannot activate it. Candidate records deny write/child-create access. Metadata display does not authorize content access.

## Remaining evidence

Public registry metadata and controlled authenticated UI observations support the current status above. No private authenticated API payloads are stored as repository fixtures. Revoked/ordinary-user permission denial, received shares, template copy/conversion fidelity, collaboration, native sharing and content save durability remain **not verified**. Recently opened history and preferences are browser-scoped; cross-device synchronization is not implemented.

The SDK 8.x toolchain requires fresh security and license review before release. A successful build is not a clean advisory scan. Accessibility, screen readers, host themes/lifecycle, user usability, secret/SAST scans, CI, deployment and release reproducibility remain separate gates.

The controlled installation changed only custom app assets and the existing app registry’s Microsoft creation flags, with OpenCloud-only restarts. No domain, proxy, DNS, TLS, identity or office-server installation changes were made. The optional development Compose example is manually selected and disposable; it is not production setup or an office-server installer.

See [upstream foundation](upstream-skeleton.md), [development limits](dev-limits.md), [architecture](architecture.md) and [provisional decisions](decisions/0001-preliminary-spike.md).

The DAV `Z` flag describes the ability to deny grants to other users; it does not indicate that the current user's access is denied. This is defined by [Reva's role serializer](https://github.com/opencloud-eu/reva/blob/5b77843d7cdc8ab182b9452b5ba252334e989e35/pkg/conversions/role.go#L162). The native adapter uses nonempty permission metadata plus the SDK's read/create helpers and explicit edit flags, while the server remains authoritative. Missing permission metadata and vaults still fail closed. Personal spaces precede project spaces for a fresh home; explicit saved locations take precedence.

An ID-addressed DAV response can carry a path of `/` for a nested folder: the SDK derives `Resource.path` from the request href. Creation therefore resolves the selected folder through the native `getPathForFileId` metadata method and revalidates its identity and create permission through that path before checking names or dispatching. This avoids creating successfully in a subfolder and then looking for the result at the space root. An acknowledged mutation with unreadable result metadata still pauses further creation instead of submitting another copy.
