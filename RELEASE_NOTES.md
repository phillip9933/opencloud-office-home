## Security

- All files and Recent now apply OpenCloud’s vault visibility checks to search results.

## Fixed

- Office checks that a newly created file belongs to the selected folder before opening it.
  If Office cannot verify the destination, it asks you to check the file in Files.
- You can browse files and create a blank document while templates are loading.
- Opening files in multiple tabs now preserves each tab’s changes to Recent history.
- The gallery shows templates the native editor can copy. Complete folder listings
  no longer trigger a partial-results warning.

## Build information

- The ZIP is built from the Git commit recorded in its `SOURCE.txt`.
- Download `office-home-0.1.0-beta.5.zip` and `SHA256SUMS`. Verify the checksum before
  extracting the ZIP. See the [installation guide](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.5/docs/installation.md).
- See [compatibility](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.5/docs/compatibility.md)
  and [dependency findings](https://github.com/phillip9933/opencloud-office-home/blob/v0.1.0-beta.5/docs/dependency-status.md) for known beta limitations.
