# Install Office Home

Office Home uses your existing OpenCloud and office integration. No additional container is needed.
The current build is a prototype; check the [tested versions and limitations](compatibility.md)
before installing.

## Build

Set up the source as described in [Contributing](../CONTRIBUTING.md), then run:

```sh
pnpm check
pnpm build:test-instance
pnpm check:artifacts dist-native-test
```

The installable files are in `dist-native-test/`. The default `pnpm build` remains gated while
release acceptance is incomplete.

## Add to OpenCloud

OpenCloud loads custom apps from `WEB_ASSET_APPS_PATH`, which defaults to
`$OC_BASE_DATA_PATH/web/assets/apps`. Locate that directory in your deployment; see the
[OpenCloud Web documentation](https://docs.opencloud.eu/docs/dev/server/services/web/information/).

1. Back up any existing `office-home` app directory and configuration outside the apps directory.
2. Copy the contents of `dist-native-test/` into `office-home/` under the apps directory.
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
