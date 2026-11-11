# Install Office Home

Office Home uses your existing OpenCloud and office integration. No additional container is needed.
Check the [tested versions and limitations](compatibility.md) before installing.

## Download

Download `office-home-<version>.tar.gz` and `SHA256SUMS` from the project's
[GitHub Releases](https://github.com/phillip9933/opencloud-office-home/releases).
No Node.js or build tools are needed on the OpenCloud server.

Verify and extract the download on Linux:

```sh
sha256sum --check SHA256SUMS
tar -xzf office-home-0.1.0-beta.1.tar.gz
```

Use the filename for your downloaded version. The archive contains one `office-home/` directory.
Download from the repository above over HTTPS; checksums verify file integrity, not publisher identity.

## Add to OpenCloud

OpenCloud loads custom apps from `WEB_ASSET_APPS_PATH`, which defaults to
`$OC_BASE_DATA_PATH/web/assets/apps`. Locate that directory in your deployment; see the
[OpenCloud Web documentation](https://docs.opencloud.eu/docs/dev/server/services/web/information/).

1. Back up any existing `office-home` app directory and configuration outside the apps directory.
2. Copy the extracted `office-home/` directory into the apps directory.
   Keep the generated subdirectories intact and copy `manifest.json` last.
3. Optionally add `office-home/config.json` for [template folders and creation defaults](configuration.md).
4. Restart OpenCloud as required to discover the app. No Collabora restart is needed.
5. Open the Office menu entry and check document creation, editing and saving.

Direct routes on the OpenCloud host are:

- `/office/docs`
- `/office/sheets`
- `/office/slides`

Friendly domains such as `sheets.example.com` can redirect to the corresponding route on the
canonical OpenCloud host. Authentication stays on that host.

## Update or remove

Back up the installed app and configuration before replacing its assets. Preserve your
`config.json`, copy the new manifest last, then restart OpenCloud and reload the browser.

To disable the app, set `"disabled": true` in its app-local `config.json` and restart OpenCloud.
To remove it, move the app directory outside `WEB_ASSET_APPS_PATH` and restart. To roll back,
restore the previous app directory and configuration. These operations do not remove user documents.

## Build from source

Follow [Contributing](../CONTRIBUTING.md) to install development dependencies, then run:

```sh
pnpm check
pnpm package:release
```

`pnpm build` creates the native app in `dist/` as part of the checks. The packaging command
writes the installable archive and checksums to `release/`. GitHub release downloads are built in CI
from their version tag. The archive's `SOURCE.txt` identifies the exact source commit.
