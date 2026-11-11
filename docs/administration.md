# Administrator-controlled integrations

Office Home remains a static OpenCloud Web app. Personal view choices are separate from installation configuration; hiding an admin button in JavaScript would not protect a writable setting.

## Current configuration boundary

- Administrators set application-wide defaults through OpenCloud's `apps.yaml`, or the app-local `config.json`. These files must be writable only by the installation administrator and readable by the OpenCloud process. Published app configuration is not a secret store.
- Users can change their own columns, layout, template display and personal template-folder override. Those scoped browser preferences cannot register an editor, change the installation default, or grant file access.
- Editor/file-type registrations and creation allow-lists belong to OpenCloud's app registry. The native editor bridge retains authorization, file identity, editor sessions and saving.

A browser-based administrator editor for installation settings is **not implemented**. It would need a verified, server-authorized configuration-write API and auditing. There is no such write endpoint in this app, and no extra backend/container is required for the existing file-based configuration workflow.

## Additional apps and file handlers

An external website shortcut and a file editor are different integration contracts. Administrator-configured native Web menu extensions can link to approved internal routes or external HTTPS sites. Registering a website URL alone does not give it a secure open/save integration with OpenCloud files.

To add an editor or a new file family, install/register its supported OpenCloud Web app or app-provider integration and advertise its supported MIME types. Office Home delegates opening to the host’s ordered native file handlers; it must not load arbitrary remote JavaScript or append session credentials/document URLs to arbitrary websites. The current three family screens remain Docs, Sheets and Slides; a generic administrator-created app/family management UI is a future extension, not a completed feature.

## Microsoft creation formats

OpenCloud can open Microsoft files while omitting them from the creation menu. Administrators enable DOCX, XLSX and PPTX creation in `app-registry.yaml` using `app_registry.mimetypes` and `allow_creation: true`. Preserve the deployment's existing MIME entries, provider names, icons and other creation defaults; do not replace its registry with a three-entry sample. Use the actual registered provider name. Office Home already recognizes these formats and offers them when the live registry explicitly permits creation. No frontend override should silently grant this capability.

Any generated configuration proposal must be reviewed against the existing file before installation. After applying it, restart only the required OpenCloud service and verify both native Files and Office Home creation/open/save behavior. An enabled MIME flag alone does not prove editor fidelity.

References: [Web app administration](https://docs.opencloud.eu/docs/admin/configuration/web-applications/), [app configuration](https://docs.opencloud.eu/docs/dev/web/extension-system/advanced-topics/configuration/), [app registry](https://docs.opencloud.eu/docs/dev/server/services/app-registry/information), [Microsoft creation formats](https://docs.opencloud.eu/docs/next/admin/configuration/collabora/collabora-ms-office-formats).
