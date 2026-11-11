# Administrator-controlled integrations

Office Home remains a static OpenCloud Web app. Personal view choices are separate from installation configuration; hiding an admin button in JavaScript would not protect a writable setting.

## Current configuration boundary

- Administrators set application-wide defaults through OpenCloud's `apps.yaml`, or the app-local `config.json`. These files must be writable only by the installation administrator and readable by the OpenCloud process. Published app configuration is not a secret store.
- Users can change their own columns, layout, template display and personal template-folder override. Those scoped browser preferences cannot register an editor, change the installation default, or grant file access.
- Editor/file-type registrations and creation allow-lists belong to OpenCloud's app registry. The native editor bridge retains authorization, file identity, editor sessions and saving.

The administration page is `/office/admin`. **Installation template default** sets the shared gallery folder; **Personal template folder** in Settings is a per-browser override and is available only when administrators allow it. The selected folder’s display name is resolved through authorized metadata, including ID-addressed DAV responses whose path is `/`.

**App shortcuts** adds sidebar links. **File types and editors** groups each landing-page type with a selector of matching installed OpenCloud editors. Extension and MIME metadata come from the backend picker, with an explicit custom-type option for discovery-only formats. When the backend supplies a MIME type without an extension, the picker asks for that extension and retains the advertised MIME. A shortcut cannot be selected as an editor. Saved mappings outside the current landing pages remain visible for removal rather than silently disappearing.

**Creation formats** lists only types the backend currently advertises as creatable, intersected with each page’s formats. Provider names accompany choices; opening-only types do not become creation checkboxes. Restrictions can narrow this list or be reset to backend defaults. Refresh integrations rereads the native provider registry without discarding the configuration draft; native editor registrations still require installed routes, and newly installed apps may require a host reload.

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
  "schemaVersion": 1,
  "allowPersonalTemplates": true,
  "shortcuts": [],
  "additionalFormats": {},
  "creationFormats": {},
  "handlers": []
}
```

| Key                      | Behavior                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templateFolder`         | Optional `{ "spaceId": "…", "itemId": "…" }` installation default. Template access still follows OpenCloud ACLs.                                                                                                                            |
| `allowPersonalTemplates` | `false` enforces the installation folder in Office and ignores existing personal overrides. Defaults to `true`.                                                                                                                             |
| `shortcuts`              | Up to 20 `{ "id", "label", "href" }` app links. HTTPS URLs or same-host absolute paths only; opens in a separate tab without file parameters or credentials.                                                                                |
| `additionalFormats`      | Optional `docs`, `sheets`, `slides` lists of `{ "extension", "mimeType" }`, added to the existing family formats.                                                                                                                           |
| `creationFormats`        | Optional family lists of allowed extensions. An omitted family keeps all its supported formats; an empty list hides creation for that family. This only narrows the native provider's creation capability.                                  |
| `handlers`               | Up to 50 `{ "extension", "mimeType", "action" }` preferences selecting an installed native file-action ID. Both MIME and extension must match. A missing preferred action refuses the launch rather than silently selecting another editor. |

For example, `"additionalFormats": { "docs": [{ "extension": "txt", "mimeType": "text/plain" }] }` includes text documents on Docs. It does not install a text editor or grant creation permission. Additional extensions are included in the bounded authorized recent query; contradictory MIME metadata is still rejected.

The policy is schema-versioned, size-bounded and rejects unknown fields, executable URLs, embedded credentials and remote module definitions. These are Office presentation/integration preferences; upstream file ACLs and provider authorization remain authoritative. Users can still use native Files workflows permitted by OpenCloud.

## Additional apps and file handlers

An external website shortcut and a file editor are different integration contracts. Administrator-configured native Web menu extensions can link to approved internal routes or external HTTPS sites. Registering a website URL alone does not give it a secure open/save integration with OpenCloud files.

To add an editor, install/register its supported OpenCloud Web app or app-provider integration and advertise its supported MIME types. Office Home delegates opening to the host’s native file handlers; an administrator can prefer a specific registered action. It must not load arbitrary remote JavaScript or append session credentials/document URLs to arbitrary websites. The existing three landing pages can include additional formats; additional app links can lead to other installed applications or approved websites. Creating an entirely new fourth landing-page implementation is outside this policy schema.

## Microsoft creation formats

OpenCloud can open Microsoft files while omitting them from the creation menu. Administrators enable DOCX, XLSX and PPTX creation in `app-registry.yaml` using `app_registry.mimetypes` and `allow_creation: true`. Preserve the deployment's existing MIME entries, provider names, icons and other creation defaults; do not replace its registry with a three-entry sample. Use the actual registered provider name. Office Home already recognizes these formats and offers them when the live registry explicitly permits creation. No frontend override should silently grant this capability.

Any generated configuration proposal must be reviewed against the existing file before installation. After applying it, restart only the required OpenCloud service and verify both native Files and Office Home creation/open/save behavior. An enabled MIME flag alone does not prove editor fidelity.

References: [Web app administration](https://docs.opencloud.eu/docs/admin/configuration/web-applications/), [app configuration](https://docs.opencloud.eu/docs/dev/web/extension-system/advanced-topics/configuration/), [app registry](https://docs.opencloud.eu/docs/dev/server/services/app-registry/information), [Microsoft creation formats](https://docs.opencloud.eu/docs/next/admin/configuration/collabora/collabora-ms-office-formats).
