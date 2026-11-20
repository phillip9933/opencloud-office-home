# Compatibility and limitations

Office Home is available as a beta. It runs as a static OpenCloud Web app using the host's files,
permissions and configured editor. No additional backend or container is required.

## Beta 3 live verification

| Component                     | Version                 |
| ----------------------------- | ----------------------- |
| OpenCloud server              | 9.2.0 rolling           |
| Collabora Online              | CODE 26.04.5.2.1        |
| Pinned OpenCloud SDK packages | 8.2.1                   |
| Development tooling           | Node >=24, pnpm 11.27.0 |

On 2026-11-18, beta 3 was tested on an existing OpenCloud installation after upgrading Office Home.
In a test folder, seven files were created, edited, saved and reopened. The edits were still
present after reopening.

| Office app | Formats verified |
| ---------- | ---------------- |
| Docs       | ODT, DOCX        |
| Sheets     | ODS, XLSX        |
| Slides     | ODP, PPTX        |
| Draw       | ODG              |

Template cards were verified in all four Office apps. A copy of a seven-page BPMN drawing
template opened in Draw with all seven pages.

Earlier beta checks used OpenCloud server 9.0.0, OpenCloud Web 8.2.1 and Collabora Online.
Those checks covered navigation, folder selection, blank creation in ODT, ODS, ODP, DOCX, XLSX
and PPTX, template copies, automatic editor opening, and a basic ODT save and reopen.
The OpenCloud SDK dependencies in this repository remain pinned to 8.2.1. The installed host
supplies the shared runtime packages.

## Fresh installation

On a fresh OpenCloud 9.2.0 Linux AMD64 installation, beta 4 opened Docs, Sheets, Slides and Draw
after sign-in. Two ODT documents were uploaded through Files. After the template folder was selected
in Office Settings, the gallery showed one document under General and the other under its subfolder
name. This installation had no editor integration. The beta 3 checks above cover editing and saving.

## Current limitations

- Template containers (`.ott`, `.ots`, `.otp`) cannot yet be converted into new documents.
  Use ordinary editable documents as templates.
- Recently opened history and personal preferences are stored in the current browser.
  Tabs share opened history when browser storage and Web Locks are available. Otherwise, new
  history lasts for the current session. Cross-device opened history is not supported.
- All files lists indexed files in supported formats without a date limit. It shows up to 200
  search results in pages of 25. Use search in OpenCloud Files if a file is missing.
- Received-share aliases are not supported in Office discovery; use OpenCloud Files for those items.
- The template gallery reads one folder level, with up to 20 categories and 200 templates.
- Other editor integrations, complex document formatting and concurrent
  collaboration still need verification.
- Draw uses editable OpenDocument drawings (`.odg`). Creation requires a provider that enables ODG
  creation in OpenCloud.
- Complete discovery/pagination, account switching and permission changes still need broader
  live testing. Screen-reader and host-theme accessibility also need manual verification.
- See [dependency status](dependency-status.md) for bundled dependency findings and peer-version mismatches.

The standalone development preview uses sample data; the installed native app uses real OpenCloud
files.

Download an installable beta from [Releases](https://github.com/phillip9933/opencloud-office-home/releases)
or build from source with `pnpm build`. See [installation](installation.md).
