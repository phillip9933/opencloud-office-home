import { officeApps } from '../app/registry'
import type { CreationFormat } from '../administration/creation'
/** DEV-LIMIT(DL-002): synthetic backend capabilities, excluded from the native graph. */
export const fixtureCreationOptions = (): CreationFormat[] =>
  officeApps.flatMap((app) =>
    app.formats.map((format, index) => ({
      ...format,
      label: format.extension.toUpperCase(),
      providers: ['Synthetic Office'],
      canCreate: index === 0
    }))
  )
