# Architecture

The intended product is one native OpenCloud Web package with three home routes and one declarative app menu. This implementation establishes the shell and application workflow boundaries; the live OpenCloud adapter remains unavailable. The project tier and eventual audience/distribution are unconfirmed. Apply the web application profile; use OWASP ASVS 5.0 as a security review reference, without claiming conformance.

## System and feature map

| Feature               | Entry point                                             | Responsibility                                                                               |
| --------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Native registration   | `src/index.ts`                                          | Three authenticated routes and native app-menu extensions                                    |
| Shared menu           | `src/app/registry.ts`, `src/components/AppSwitcher.vue` | Validate reviewed descriptors against installed route names; reject executable/remote fields |
| Session navigation    | `src/app/context.ts`                                    | Per-family models and at most 100 session view snapshots, referenced by opaque URL keys      |
| Home screens          | `src/views/OfficeHome.vue`                              | Search, destination, creation form, template selector, recents and folder browsing           |
| Workflow              | `src/services/home.ts`                                  | Request generations, cancellation, permission refresh, create/open guards and recovery       |
| Integration contracts | `src/contracts/office.ts`                               | Typed, app-owned catalog, capability, creation and gateway boundaries                        |
| Native adapter        | `src/adapters/opencloud/unconfigured.ts`, `catalog8.ts` | Fail-closed app entry plus a disconnected read-only SDK candidate                            |
| Provider capabilities | `src/adapters/opencloud/providers8.ts`                  | Disconnected creation-format candidate from the app registry and app-provider capability     |
| Recent history        | `src/preferences/recents.ts`                            | References only, instance/user scope, 100 entries and 90-day retention                       |
| Preview               | `src/preview.ts`, `src/fixtures/services.ts`            | Explicit synthetic, session-only testing without OpenCloud calls                             |

Dependency direction is views → workflow → typed ports → release-specific adapter. Only native registration and future native adapters depend on Web APIs; provider names do not appear in UI workflows. Vue and OpenCloud packages are mandatory for the native package. Fixture and unavailable adapters exist to test the boundary while deployment access is absent.

The larger home loading function intentionally keeps one request generation across spaces, capabilities, destination, catalog and recents. This makes late-response rejection visible in one lifecycle. Mutation and editor workflows are separate functions; further decomposition should follow behavior, not line counts alone.

The disconnected `createCatalog8` candidate accepts only the installed SDK's normal-user space discovery and metadata methods. Its injected session-generation key must include instance, user and authentication generation; changing it clears discovered roots and discards pending responses. Metadata display is separate from content authorization, and every normalized record denies writes/child creation. This module is not imported by the native app or preview and cannot be activated through configuration. Received-share aliases, search and pagination remain unsupported; folder results are labeled partial until deployment behavior is proven. See DL-003.

The disconnected `createProviderCapabilities8` candidate reads the host's app-provider registry and capability on every call, so a provider removed after a screen loaded blocks creation at submit time. The registry is server-wide metadata loaded without authentication; it describes which editors exist, not what the user may do. Creation formats are the intersection of explicitly enabled creation, `allow_creation` from a named provider and the family descriptor. "No provider for this family" and "provider cannot create this family" are separate states. See DL-005 and the observed deployment in [compatibility](compatibility.md).

## Data flows and trust boundaries

Live resource reads, copy/create and editor launches will use the host's authenticated services, with upstream authorization on every operation. No live implementation is currently connected. Server responses must be normalized and validated in the release adapter. File names and labels are rendered as text, not HTML. IDs remain opaque tuples rather than parsed paths.

The native host owns authentication, tokens, sharing, resource lifecycle, editor credentials and save state. This app must not introduce an identity system, WOPI protocol, private document store or token storage. Native editor launch acceptance is distinct from durable saving. The current fixture gateway only simulates acceptance.

Search and folder changes abort previous requests and reject late responses even when cancellation is ignored. Loading and failed refreshes remove previous private metadata. A selected space that becomes unavailable is an error; the workflow does not silently switch to another space.

Creation resolves destination permissions and capabilities immediately before mutation; template operations also resolve source access. Repeated submissions are locked. An uncertain mutation outcome blocks retries pending reconciliation. A successful created resource remains recoverable even when open fails or the user navigates away; it is not inserted into an unrelated folder's list. Real template revision, overwrite and copied-share behavior remain unverified.

Opening re-resolves the resource, selects view mode for read-only access, guards repeated launches, and records history only after gateway acceptance. This does not prove editor readiness or saving. A late resolution after navigation does not launch an obsolete file.

## Storage, privacy and deletion

The optional browser recent store contains only resource IDs, family and opened timestamp. Its key includes instance and authenticated user; data is pruned to 100 entries/90 days. Entries are resolved again before display. Clear history removes them. The native adapter must wire logout/account-change cleanup before enabling persistence. Until then only the synthetic preview uses session memory. Cross-device recents are not implemented.

Session navigation snapshots contain query/folder/scroll state in memory, at most 100 entries. URLs carry only a session key, not search strings or names. Reloading loses this state and safely returns to the app root. Cross-user lifecycle cleanup and native editor return need real integration tests before release.

No telemetry, analytics, external image proxy, document contents, credentials or real user data are sent by the preview. Dependency tooling contacts the public npm registry with package metadata during authorized setup/advisory checks; this is separate from product behavior.

## Extension boundary

Approved menu entries refer only to installed route names. The registry is not a sandbox and cannot authorize file access. A fourth reviewed route/descriptor can be supplied through `createOfficeContext` without changing office screens. This proves menu extensibility only; a fourth editor's actual storage/save integration is a later acceptance gate. Administrator configuration parsing and capability filtering are not implemented.

## Errors and configuration

Stable error categories map to safe UI messages. Raw server responses and launch credentials must never enter UI diagnostics. No deployment settings, domain aliases, provider URLs or credentials are assumed. The only current build flag, `OFFICE_SPIKE_BUILD=1`, explicitly produces an inspection artifact; default release builds are blocked. See [development limits](dev-limits.md) and [compatibility](compatibility.md).
