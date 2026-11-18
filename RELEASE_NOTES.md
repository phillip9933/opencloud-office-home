## Fixed

- The creation dialog checks the remembered folder before it allows a write.
- A change of page closes the previous creation dialog and cancels its pending folder check.
- The template gallery limits how many entries it reads per folder and stops when it reaches
  the gallery limit. Large folders can show partial results.

## Build information

- Beta 3 live upgrade checks on OpenCloud 9.2.0 rolling and Collabora Online CODE 26.04.5.2.1 passed for
  creating, editing, saving and reopening ODT, DOCX, ODS, XLSX, ODP, PPTX and ODG. The checks also
  covered template cards in all four Office apps and a seven-page BPMN drawing template copy.
- A fresh OpenCloud 9.2.0 Linux AMD64 installation loaded the beta 3 ZIP and opened all four Office
  pages after sign-in. This setup had no editor integration.
- Download `office-home-0.1.0-beta.4.zip`, extract it and copy the `office-home` directory into
  your OpenCloud Web apps directory. See the [installation guide](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.4/docs/installation.md).
- This beta retains known compatibility limits, including template-container conversion and
  received-share discovery. See [compatibility](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.4/docs/compatibility.md)
  and [dependency findings](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.4/docs/dependency-status.md).
