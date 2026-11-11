# Administrator-controlled integrations

Office Home remains a static OpenCloud Web app. Personal view choices are separate from installation configuration; hiding an admin button in JavaScript would not protect a writable setting.

## Current configuration boundary

- Administrators set application-wide defaults through OpenCloud's `apps.yaml`, or the app-local `config.json`. These files must be writable only by the installation administrator and readable by the OpenCloud process. Published app configuration is not a secret store.
- Users can change their own columns, layout, template display and personal template-folder override. Those scoped browser preferences cannot register an editor, change the installation default, or grant file access.
- Editor/file-type registrations and creation allow-lists belong to OpenCloud's app registry. The native editor bridge retains authorization, file identity, editor sessions and saving.

The administration page is `/office/admin`, with three keyboard-accessible tabs:

- **Templates** sets the installation gallery folder and whether personal overrides are allowed. Users still need read access to its files. Personal Settings only changes the current user's browser preference.
- **Creation formats** lists the built-in office formats the backend currently advertises as creatable, with provider names. Administrators can narrow that list or return to backend defaults. Refresh capabilities rereads the registry without discarding the draft; opening-only formats are never offered for creation.
- **Storage** explains shared saving, access and installation setup.

The folder chooser uses a locations sidebar, breadcrumbs, folder rows and an explicit selection footer. It permits readable template folders and requires writable creation destinations. It does not create files on navigation or cancellation.

Custom app links, additional file types and editor overrides are not supported. Files open through OpenCloud's ordered native editor actions. Install and configure editors through OpenCloud itself.

Changes are marked as an unsaved draft until a shared save is confirmed. The save action explains disconnected storage, read-only access or uncertain results beside the button. A failed configuration reload clears stale write state. Download draft produces a configuration file for manual installation and never claims it was applied. Reloading a changed policy is explicitly labelled Discard draft and reload.

The administration route requires the host's settings-management ability (`update-all Setting`), and is separate from personal Settings. With static configuration only, administrators can prepare and download a policy. Direct saving requires the dedicated configuration file described below. The app remains static; no additional service, credential or container is introduced.

## Shared configuration file

Store one small `office-home.settings.json` file in an administrator-managed OpenCloud project space. Use OpenCloud permissions to grant intended users read access and administrators write access. Ordinary users must have no write, delete, move, rename or permission-management access to the configuration file or its parent. The file must contain no secrets. This access policy is a required installation prerequisite: the browser's role check alone is not a security boundary.

Configure its canonical IDs in the app-local `config.json`:

```json
{
  "disabled": false,
  "config": {
    "settingsFile": {
      "spaceId": "<configuration space ID>",
      "itemId": "<configuration file ID>"
    }
  }
}
```

The configured file is authoritative. If it cannot be read or validated, Office reports a configuration error instead of silently reverting to a different policy. Native Files remains available for recovery. Without `settingsFile`, `config.policy` supplies the same schema as static configuration; the earlier `config.templateFolder` is retained for compatibility when no policy is supplied.

Reads use the existing authenticated WebDAV client. Saves revalidate account, administrator ability, file identity and write permission, send `If-Match` with the loaded strong ETag, and confirm the stored policy. A conflicting edit requires reloading and reviewing the changes. An uncertain result pauses further saves; there is no automatic retry. OpenCloud owns file version history and access enforcement. Changes take effect when each user's Office app reloads.

Before enabling saving on a shared installation, verify ordinary-user denial directly against the configured file, successful administrator saving, ETag conflict refusal and recovery from loss of access. Isolated tests are not proof of the live ACL. Provisioning or changing these permissions is an explicit installation action.

## Policy schema

```json
{
  "schemaVersion": 2,
  "allowPersonalTemplates": true,
  "creationFormats": {}
}
```

| Key                      | Behavior                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `templateFolder`         | Optional canonical `{ "spaceId": "…", "itemId": "…" }` installation default. OpenCloud permissions still control access.                                                                                     |
| `allowPersonalTemplates` | `false` enforces the installation folder and ignores personal overrides. Defaults to `true`.                                                                                                                 |
| `creationFormats`        | Optional `docs`, `sheets`, `slides` lists of built-in extensions. Omitted families retain backend-supported defaults; an empty list disables creation for that family. This only narrows backend capability. |

Version 1 files migrate only when retired `shortcuts`, `additionalFormats` and `handlers` fields are absent or empty. Nonempty retired settings cause an explicit configuration failure, preserving the original file for deliberate backup and migration. Version 2 rejects those fields. Configuration is size-bounded and rejects unknown fields; it contains no executable app or URL definitions.

## Microsoft creation formats

OpenCloud can open Microsoft files while omitting them from the creation menu. Administrators enable DOCX, XLSX and PPTX creation in `app-registry.yaml` using `app_registry.mimetypes` and `allow_creation: true`. Preserve the deployment's existing MIME entries, provider names, icons and other creation defaults; do not replace its registry with a three-entry sample. Use the actual registered provider name. Office Home already recognizes these formats and offers them when the live registry explicitly permits creation. No frontend override should silently grant this capability.

Any generated configuration proposal must be reviewed against the existing file before installation. After applying it, restart only the required OpenCloud service and verify both native Files and Office Home creation/open/save behavior. An enabled MIME flag alone does not prove editor fidelity.

References: [Web app administration](https://docs.opencloud.eu/docs/admin/configuration/web-applications/), [app configuration](https://docs.opencloud.eu/docs/dev/web/extension-system/advanced-topics/configuration/), [app registry](https://docs.opencloud.eu/docs/dev/server/services/app-registry/information), [Microsoft creation formats](https://docs.opencloud.eu/docs/next/admin/configuration/collabora/collabora-ms-office-formats).
