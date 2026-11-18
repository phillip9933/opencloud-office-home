## Added

- Draw joins Docs, Sheets and Slides. It uses ODG files and the editor configured in OpenCloud.
- Each app page has an All files view for indexed files in the supported formats.

## Changed

- The OpenCloud App Store ZIP uses the `office-home` application ID and installation directory.
  Existing `/office/` links and settings continue to work.
- The column chooser puts visibility and order controls on one row per column.
- The template section has labeled controls for its cards and full gallery.

## Build information

- Live upgrade checks on OpenCloud 9.2.0 rolling and Collabora Online CODE 26.04.5.2.1 passed for
  creating, editing, saving and reopening ODT, DOCX, ODS, XLSX, ODP, PPTX and ODG. The checks also
  covered template cards in all four Office apps and a seven-page BPMN drawing template copy.
- A fresh OpenCloud 9.2.0 Linux AMD64 installation loaded the ZIP and opened all four Office
  pages after sign-in. This setup had no editor integration.
- Download `office-home-0.1.0-beta.3.zip`, extract it and copy the `office-home` directory into
  your OpenCloud Web apps directory. See the [installation guide](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.3/docs/installation.md).
- This beta retains known compatibility limits, including template-container conversion and
  received-share discovery. See [compatibility](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.3/docs/compatibility.md)
  and [dependency findings](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.3/docs/dependency-status.md).
