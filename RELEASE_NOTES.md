## Added

- Draw joins Docs, Sheets and Slides. It uses ODG files and the editor configured in OpenCloud.
- Each app page has an All files view for indexed files in the supported formats.

## Changed

- The OpenCloud App Store ZIP uses the `office-home` application ID and installation directory.
  Existing `/office/` links and settings continue to work.
- The column chooser puts visibility and order controls on one row per column.
- The template section has labeled controls for its cards and full gallery.

## Build information

- Tested baseline: OpenCloud 9.0.0 / Web 8.2.1 with Collabora. No additional container is required.
- Download `office-home-0.1.0-beta.3.zip`, extract it and copy the `office-home` directory into
  your OpenCloud Web apps directory. See the [installation guide](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.3/docs/installation.md).
- This beta retains known compatibility limits, including template-container conversion and
  received-share discovery. See [compatibility](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.3/docs/compatibility.md)
  and [dependency findings](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.3/docs/dependency-status.md).
