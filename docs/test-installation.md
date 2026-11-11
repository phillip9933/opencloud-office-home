# Native test installation

This is an opt-in integration test, not a supported production release. It uses the existing OpenCloud and configured office integration. No additional app container, backend, login or office-server installer is required.

## Build and scope

Run the normal checks in an isolated environment, then `pnpm build:test-instance`. This writes `dist-native-test/`, containing only the native application and its SDK-generated manifest. `pnpm check:artifacts dist-native-test` checks the fixture boundary. Keep dependencies, source, private instructions, previews and browser/test artifacts out of the install. Record the source commit and SHA-256 of every installed file separately.

The test build supports personal/project destination selection and recent changes, browser-scoped opens/preferences, native blank creation, ordinary document template copies, native editor opening and Files/share/download entry points. These are implementation claims until exercised on a pinned host. Received-share aliases, folder completeness, template-container conversion, real account switching and editor save/collaboration acceptance remain open. Default `pnpm build` deliberately fails.

## Install alongside existing apps

Follow the host version's [Web application documentation](https://docs.opencloud.eu/docs/dev/server/services/web/information/). OpenCloud loads custom app directories from `WEB_ASSET_APPS_PATH`, defaulting to `$OC_BASE_DATA_PATH/web/assets/apps`.

1. Verify the actual data mount and asset path. Inventory existing apps/configuration without reading secrets. Do not replace the core Web files or an unrelated app.
2. Back up any existing directory with the intended ID and its app-specific configuration outside the apps discovery directory. For a new ID, record that no prior directory/configuration exists.
3. Stage the tested artifact in a new `office-home` directory, preserving its `js/` and `assets/` subdirectories. Transfer the generated `manifest.json` last, after checking all payload files. Do not edit its generated entrypoint.
4. If templates are needed, add an app-local `config.json` containing `{"config":{"templateFolder":{"spaceId":"<space id>","itemId":"<folder id>"}}}`. For shared administration, follow the dedicated policy-file setup and ACL acceptance in [administration](administration.md). Omit optional configuration for the default behavior and empty gallery. No server secrets belong here.
5. Restart only the existing OpenCloud service/container, as required by the host to discover a new app. This briefly interrupts OpenCloud; leave Collabora and other services alone.
6. Verify `config.json` registers `/assets/apps/office-home/...`, then load `/office/docs`, `/office/sheets` and `/office/slides`. Confirm Files remains usable and the menu entries work.

All users who can load this Web host may discover the test app. It adds no permissions: OpenCloud still authorizes every read/write. Install only on a host approved for this controlled test.

## Acceptance and rollback

Use a new disposable test folder with a visible destination. Create a document, spreadsheet and presentation; open through the native editor, add a harmless marker, save, close and reopen through Files and Office Home. Confirm one file/identity per creation, read-only opening, name conflicts, cancellation, rapid navigation, native return state, source-template preservation and denied access. Do not test overwrite/delete on existing user documents.

To disable the new app without deleting it, place `{"disabled":true}` in its app-local `config.json` (preserving any configuration backup), then restart OpenCloud. Alternatively move the complete app directory outside `WEB_ASSET_APPS_PATH` and restart. Restore the prior app directory/configuration if replacing an earlier version. Test this disable/re-enable procedure before considering the install accepted. Existing user documents are not part of the app rollback.

A controlled NAS test installation on OpenCloud 9.0.0 / Web 8.2.1 has been exercised. Registration, all three routes, native destination selection, cancellation, six ODF/Microsoft blank creations, editor launch/return and app disable/re-enable rollback were verified. Ordinary ODT/ODS/ODP template copies were verified byte-for-byte after download with independent copy identities and unchanged sources. Content save/reopen, template rendering/container conversion and shared policy-file ACL/conditional-save acceptance remain incomplete. Build hashes, source provenance and deployment-specific evidence stay in local review output. Dependency security, licensing and full release gates remain separate.
