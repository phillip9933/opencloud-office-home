## Security

- The template gallery limits how much data it reads from each folder. A large shared template
  folder can now return partial results while Office Home remains usable.

## Added

- Open Draw from the Office menu to work with ODG drawings in the configured editor.
- Select **All files** to find supported documents, spreadsheets, presentations and drawings
  regardless of when they were last modified. **Recent** is still available.

## Changed

- Each row in the column chooser now contains its visibility and order controls.
- Labeled buttons expand and collapse the template gallery.
- The installation download is now a ZIP containing the existing `office-home` directory.

## Fixed

- The next file you create uses your last successful save folder for that Office app.
  The creation dialog checks that you can still write to the folder.
- A change of page closes the previous creation dialog and cancels its pending folder check.

## Build information

- Beta 3 live upgrade checks on OpenCloud 9.2.0 rolling and Collabora Online CODE 26.04.5.2.1 passed for
  creating, editing, saving and reopening ODT, DOCX, ODS, XLSX, ODP, PPTX and ODG. The checks also
  covered template cards in all four Office apps and a seven-page BPMN drawing template copy.
- On a fresh OpenCloud 9.2.0 Linux AMD64 installation, beta 4 opened all four Office pages after
  sign-in and displayed ODT templates from the selected folder and a subfolder.
- Download `office-home-0.1.0-beta.4.zip`, extract it and copy the `office-home` directory into
  your OpenCloud Web apps directory. See the [installation guide](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.4/docs/installation.md).
- This beta retains known compatibility limits, including template-container conversion and
  received-share discovery. See [compatibility](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.4/docs/compatibility.md)
  and [dependency findings](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.4/docs/dependency-status.md).
