import { officeApps } from './app/registry'
import type { FileRef, OfficeConfiguration } from './contracts/office'

export type { OfficeConfiguration } from './contracts/office'
import { officeKinds } from './contracts/files'
export const MAX_CONFIGURATION_BYTES = 65536
export const defaultConfiguration = (): OfficeConfiguration => ({
  allowPersonalTemplates: true,
  creationFormats: {}
})
function configurationObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a configuration object.')
  return value as Record<string, unknown>
}
function allowedKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('Configuration contains an unsupported field.')
}
function configurationText(value: unknown, length: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > length ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new Error('Configuration contains invalid text.')
  return value.trim()
}
export function configurationRef(value: unknown): FileRef {
  const ref = configurationObject(value)
  allowedKeys(ref, ['spaceId', 'itemId'])
  const spaceId = configurationText(ref.spaceId, 2048)
  const itemId = configurationText(ref.itemId, 2048)
  if ([spaceId, itemId].some((id) => /[/\\?#%]/.test(id) || id === '.' || id === '..'))
    throw new Error('Use canonical OpenCloud space and item IDs.')
  return { spaceId, itemId }
}
export function parseConfiguration(value: unknown): OfficeConfiguration {
  const raw = configurationObject(value === undefined ? {} : value)
  if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_CONFIGURATION_BYTES)
    throw new Error('Configuration is too large.')
  allowedKeys(raw, ['templateFolder', 'allowPersonalTemplates', 'creationFormats'])
  const configuration = defaultConfiguration()
  if (raw.templateFolder !== undefined)
    configuration.templateFolder = configurationRef(raw.templateFolder)
  if (raw.allowPersonalTemplates !== undefined) {
    if (typeof raw.allowPersonalTemplates !== 'boolean')
      throw new Error('Invalid template configuration.')
    configuration.allowPersonalTemplates = raw.allowPersonalTemplates
  }
  if (raw.creationFormats !== undefined) {
    const entries = configurationObject(raw.creationFormats)
    allowedKeys(entries, [...officeKinds])
    for (const kind of officeKinds)
      if (entries[kind] !== undefined) {
        const values = entries[kind]
        if (!Array.isArray(values) || values.length > 30)
          throw new Error('Invalid creation formats.')
        const known = officeApps.find((app) => app.id === kind)!.formats
        const formats = values.map((value) => configurationText(value, 12))
        if (
          new Set(formats).size !== formats.length ||
          formats.some((ext) => !known.some((format) => format.extension === ext))
        )
          throw new Error('Creation formats must belong to the office family.')
        configuration.creationFormats[kind] = formats
      }
  }
  return configuration
}
