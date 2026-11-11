## Added

- First installable beta of Office Home: Docs, Sheets and Slides pages with recent files,
  favorites, templates and document creation through OpenCloud's configured editor.
- Ready-to-install app archive with license notices, a source reference and SHA-256 checksums.

## Changed

- `pnpm build` now produces the native app in `dist/` without special environment flags.
- The sidebar identifies the beta version and links to its source code.

## Build information

- Tested baseline: OpenCloud 9.0.0 / Web 8.2.1 with Collabora. No additional container is required.
- Download `office-home-0.1.0-beta.2.tar.gz`, extract it and copy the `office-home` directory into
  your OpenCloud Web apps directory. See the [installation guide](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.2/docs/installation.md).
- This beta retains known compatibility limits, including template-container conversion and
  received-share discovery. See [compatibility](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.2/docs/compatibility.md)
  and [dependency findings](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.2/docs/dependency-status.md).
