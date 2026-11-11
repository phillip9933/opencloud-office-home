# Compatibility and limitations

Office Home is available as a beta. It runs as a static OpenCloud Web app using the host's files,
permissions and configured editor. No additional backend or container is required.

## Tested baseline

| Component                             | Version                 |
| ------------------------------------- | ----------------------- |
| OpenCloud server                      | 9.0.0                   |
| OpenCloud Web and pinned SDK packages | 8.2.1                   |
| Office integration                    | CollaboraOnline         |
| Development tooling                   | Node >=24, pnpm 11.27.0 |

Other host versions and editor integrations need verification. The host supplies shared runtime
packages; updating this repository's dependencies does not update an installed OpenCloud server.

Live checks covered navigation, folder selection, blank creation in ODT/ODS/ODP/DOCX/XLSX/PPTX,
ordinary ODF template copies, automatic editor opening and return navigation. A basic ODT
edit/save/close/reopen round trip passed.

## Current limitations

- Template containers (`.ott`, `.ots`, `.otp`) cannot yet be converted into new documents.
  Use ordinary editable documents as templates.
- Recently opened history and personal preferences are stored in the current browser.
  Cross-device opened history is not supported.
- Received-share aliases are not supported in Office discovery; use OpenCloud Files for those items.
- The template gallery reads one folder level, with up to 20 categories and 200 templates.
- Spreadsheet/presentation save fidelity, other editor integrations and concurrent collaboration
  have not been fully verified.
- Complete discovery/pagination, account switching and permission changes still need broader
  live testing. Screen-reader and host-theme accessibility also need manual verification.
- [Dependency advisories and peer-version mismatches](dependency-status.md) remain unresolved.

The standalone development preview uses sample data; the installed native app uses real OpenCloud
files.

Download an installable beta from [Releases](https://github.com/phillip9933/opencloud-office-home/releases)
or build from source with `pnpm build`. See [installation](installation.md).
