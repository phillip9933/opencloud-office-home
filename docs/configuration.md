# Installation configuration

Office Home is a static OpenCloud Web app. Installation settings are edited in its administrator-owned `config.json`, or the equivalent application configuration in OpenCloud's `apps.yaml`. The app has no Administration route, shared settings file, configuration download/save UI or configuration-write API. Personal Settings remains available for browser-scoped user preferences.

## Example

A minimal app-local `config.json` is:

```json
{
  "disabled": false,
  "config": {
    "allowPersonalTemplates": true,
    "creationFormats": {}
  }
}
```

The outer `disabled` flag belongs to OpenCloud's app loader. The inner `config` object is passed to Office Home. [config.example.json](config.example.json) is a copyable minimal example.

| Key                      | Default | Behavior                                                                                                                                                               |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templateFolder`         | Omitted | Optional canonical `{ "spaceId": "<space ID>", "itemId": "<folder ID>" }` for the installation template gallery. Users still need read access to its files.            |
| `allowPersonalTemplates` | `true`  | Allow a user's personal template-folder preference. `false` ignores existing overrides and hides their selection controls.                                             |
| `creationFormats`        | `{}`    | Optional `docs`, `sheets`, `slides` lists of built-in extensions. Omitted families retain backend-supported defaults; an empty list disables creation for that family. |

For example, `"creationFormats": { "docs": ["odt", "docx"] }` permits both supported document formats, while `"slides": []` hides presentation creation. Available formats always come from the installed backend integration; configuration can only narrow them. Templates and ordinary files retain their OpenCloud permissions.

Keep the file writable only by the installation administrator and readable by the OpenCloud process. It contains public presentation settings, never credentials or tokens. Office does not discover or depend on the server's physical storage layout. The deployment administrator chooses where OpenCloud loads app configuration.

After editing, restart/reload OpenCloud's Web configuration as required by the deployment, then reload Office in the browser. The controlled test deployment requires an OpenCloud service restart to refresh its published application configuration. No extra application container or backend is needed.

Unknown fields, invalid folder references, invalid flags, oversized configuration and formats outside the office family are rejected. Office displays a configuration error rather than silently ignoring a malformed installation setting. An absent configuration uses defaults and an empty installation gallery.

## Migration from the removed console

Back up the old app configuration and shared settings JSON. Copy only `templateFolder` (if present), `allowPersonalTemplates` and `creationFormats` from the old policy into the app's inner `config` object. Remove `settingsFile`, `policy` and the old policy's `schemaVersion`; they are not part of the current configuration. Review the resulting values before replacing the installation file and retain the backup for rollback. The app never reads or updates the former shared file. Existing shared files/spaces can be retained as recovery material and are no longer an app requirement.

Custom apps, additional file-type mappings and editor overrides are not supported. Install and configure editors through OpenCloud itself; Office opens resources through the host's ordered native editor actions.

## Microsoft creation formats

OpenCloud can open Microsoft files while omitting them from the creation menu. Administrators enable DOCX, XLSX and PPTX creation in `app-registry.yaml` using `app_registry.mimetypes` and `allow_creation: true`. Preserve the deployment's existing MIME entries, provider names, icons and other creation defaults; do not replace its registry with a three-entry sample. Use the actual registered provider name. Office Home already recognizes these formats and offers them when the live registry explicitly permits creation. No frontend override should silently grant this capability.

Any generated configuration proposal must be reviewed against the existing file before installation. After applying it, restart only the required OpenCloud service and verify both native Files and Office Home creation/open/save behavior. An enabled MIME flag alone does not prove editor fidelity.

References: [Web app administration](https://docs.opencloud.eu/docs/admin/configuration/web-applications/), [app configuration](https://docs.opencloud.eu/docs/dev/web/extension-system/advanced-topics/configuration/), [app registry](https://docs.opencloud.eu/docs/dev/server/services/app-registry/information), [Microsoft creation formats](https://docs.opencloud.eu/docs/next/admin/configuration/collabora/collabora-ms-office-formats).
