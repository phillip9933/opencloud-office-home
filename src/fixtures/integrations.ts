import { officeApps } from '../app/registry'
import type { IntegrationDirectory } from '../administration/integrations'
/** DEV-LIMIT(DL-002): synthetic integration metadata, excluded from the native graph. */
export const fixtureIntegrations = (): IntegrationDirectory => ({
  formats: [
    ...officeApps.flatMap((app) =>
      app.formats.map((format, index) => ({
        ...format,
        label: format.extension.toUpperCase(),
        providers: ['Synthetic Office'],
        canCreate: index === 0
      }))
    ),
    {
      extension: 'txt',
      mimeType: 'text/plain',
      label: 'Plain text',
      providers: ['Synthetic Text'],
      canCreate: true
    }
  ],
  editors: [
    ...officeApps.flatMap((app) =>
      app.formats.map((format) => ({
        ...format,
        action: 'editor-synthetic-office',
        label: 'Synthetic Office'
      }))
    ),
    {
      extension: 'txt',
      mimeType: 'text/plain',
      action: 'editor-synthetic-text',
      label: 'Synthetic Text'
    }
  ]
})
