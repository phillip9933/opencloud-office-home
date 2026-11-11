# Compatibility

Office Home is an integration-test application, not a supported production release. The current
source uses one native OpenCloud Web package. It needs static app assets and the existing native
editor integration; it does not introduce a backend, container, authentication system or WOPI host.

## Baseline

| Component              | Current baseline                                                                       | Evidence and limitation                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Foundation             | Official `opencloud-eu/web-app-skeleton` at `77f3194743046cf36ac567f7f241b5f33450df14` | Upstream history retained; no upstream submission                                                |
| OpenCloud Web packages | Exactly 8.2.1                                                                          | Pinned declarations and installed test host agree; other Web releases need contract verification |
| Test server            | OpenCloud 9.0.0, Web 8.2.1                                                             | Observed 2026-11-11; host entry/client bundles matched the official release                      |
| Editor registration    | CollaboraOnline, 65 MIME registrations                                                 | ODF and Microsoft creation enabled in the tested registry; no exact editor-version support claim |
| Tooling                | Node >=24, pnpm 11.27.0, Node 24 types                                                 | Local Linux uses Node 26.12.1; hosted Node 24/26 validation passed (run 43043288983)             |
| Packaging              | Native test, spike and synthetic preview builds                                        | Default release build deliberately fails under DL-001                                            |

The host supplies the Vue, web-client and web-pkg federation singletons. Updating local tooling or
transitive packages does not patch those packages in an already deployed host. Match the host Web
release before changing SDK versions. See [dependency status](dependency-status.md).

## Verified boundaries

Isolated tests exercise authorization-shaped SDK results, canonical file identities, same-origin
creation endpoints, duplicate submission prevention, ordinary template COPY with overwrite disabled,
account changes, stale responses, partial discovery, bounded cancellation and mutation outcomes.
Browser journeys exercise the real Vue shell using synthetic services, including keyboard/focus,
small-screen layouts, creation recovery, settings, folder selection and automated axe checks.
These are not live permission or editor tests. Current counts and timing belong to each check run,
not a durable compatibility claim.

Earlier controlled live testing verified one Office menu entry, three family routes, personal
settings, Recent metadata, writable folder selection, native editor launch/return and app
rollback. One blank file of each ODT/ODS/ODP/DOCX/XLSX/PPTX type was created. Ordinary ODF template
copies had independent IDs and downloaded bytes identical to their unchanged synthetic sources.
The installed automatic-open runtime uses source tree `c96f6d6fbc7d4c6eb91934942b1dbac2e2d09956`
(`f5e1617` and `ce8f3a1`, reconciled by `bf5aedb`). Its entry is `remoteEntry-Drk1EYmw.mjs`;
all 22 served asset hashes matched the local build inventory. The app was reloaded after an
OpenCloud restart. Automatic creation-to-editor navigation, native Close returning to Docs and
Recent reopening the same file were exercised against this installed version.

On 2026-11-12 the tester entered and saved text in a disposable ODT, closed it and reopened it.
A further browser-driven Close and Recent reopen retained the same file identity and rendered
7 words / 40 characters. This verifies a basic ODT save/reopen round trip. It does not establish
spreadsheet/presentation content fidelity, concurrent collaboration or every format's save path.

Native bindings were checked against official Web v8.2.1 source
`6816e1d4e3eb9d376f639ad392e74e3c438c4bca`. DAV root IDs are resolved independently of Graph
DriveItem IDs. The DAV `Z` permission means grant-management ability, not access denial; see
[the upstream serializer](https://github.com/opencloud-eu/reva/blob/5b77843d7cdc8ab182b9452b5ba252334e989e35/pkg/conversions/role.go#L162).

## Remaining acceptance

- Spreadsheet/presentation content save/reopen, Microsoft-format fidelity and collaboration:
  not verified. The basic ODT round trip above required manual editor input because browser
  automation could not control the embedded editor. Blank creation alone does not prove saving.
- Received-share aliases, pagination/completeness, full account-switch lifecycle, permission-change
  races and concurrent blank-name collisions: require controlled host acceptance.
- ODF template containers (`ott`, `ots`, `otp`): conversion is deliberately refused; ordinary office
  documents can be copied as templates.
- Screen-reader use and host-theme accessibility: still require manual verification. Automated axe
  and synthetic layout checks do not establish WCAG conformance.
- Dependency advisories and peer alignment remain unresolved; see [dependency status](dependency-status.md).
  Offline source/security scan coverage is documented in [validation](validation.md); it does not
  cover server internals. New application code is AGPL-3.0-only, with Apache-2.0 starter notices
  retained. Distribution/source-offer preparation and upstream submission remain separate work;
  see [licensing](licensing.md).

Installation configuration is static and administrator-owned. The former Administration console and
shared policy-file saving service are removed; their historical tests do not describe current product
behavior. Migration is in [configuration](configuration.md). Historical spike and installation
records remain available in Git history and [test installation](test-installation.md).

See [architecture](architecture.md), [development limits](dev-limits.md) and
[validation](validation.md) for current responsibilities and reproducible checks.
