# Installation configuration

Edit installation settings in the app's `config.json`, or the equivalent application configuration in OpenCloud's `apps.yaml`. These settings are administrator-managed. Users manage their own browser preferences through Office Settings.

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

See [Templates](templates.md) for folder layout, supported formats and sharing.

Keep the file writable only by the installation administrator and readable by OpenCloud. These settings are delivered to browsers; do not include credentials or tokens.

After editing, restart or reload OpenCloud as required by your deployment, then reload Office in the browser.

Unknown fields, invalid folder references, invalid flags, oversized configuration and formats outside the office family are rejected. Office displays a configuration error rather than silently ignoring a malformed installation setting. An absent configuration uses defaults and an empty installation gallery.

Configure editors through OpenCloud itself. Office Home uses the host's registered editor actions.

## Microsoft creation formats

OpenCloud can open Microsoft files while omitting them from the creation menu. Administrators enable DOCX, XLSX and PPTX creation in `app-registry.yaml` using `app_registry.mimetypes` and `allow_creation: true`. Preserve the deployment's existing MIME entries, provider names, icons and other creation defaults; do not replace its registry with a three-entry sample. Use the actual registered provider name. Office Home already recognizes these formats and offers them when the live registry explicitly permits creation. No frontend override should silently grant this capability.

After applying changes, restart OpenCloud as required and check creation, opening and saving in both Files and Office Home.

References: [Web app administration](https://docs.opencloud.eu/docs/admin/configuration/web-applications/), [app configuration](https://docs.opencloud.eu/docs/dev/web/extension-system/advanced-topics/configuration/), [app registry](https://docs.opencloud.eu/docs/dev/server/services/app-registry/information), [Microsoft creation formats](https://docs.opencloud.eu/docs/next/admin/configuration/collabora/collabora-ms-office-formats).
