import { officeApps } from '../app/registry'
import type { FileRef, OfficeKind } from '../contracts/office'

export interface OfficePolicy {
  schemaVersion: 2
  templateFolder?: FileRef
  allowPersonalTemplates: boolean
  creationFormats: Partial<Record<OfficeKind, string[]>>
}
export const MAX_POLICY_BYTES = 65536
const kinds: OfficeKind[] = ['docs', 'sheets', 'slides']
export const defaultPolicy = (): OfficePolicy => ({
  schemaVersion: 2,
  allowPersonalTemplates: true,
  creationFormats: {}
})
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a configuration object.')
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('Configuration contains an unsupported field.')
}
function text(value: unknown, length: number): string {
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
  const ref = object(value)
  keys(ref, ['spaceId', 'itemId'])
  const spaceId = text(ref.spaceId, 2048)
  const itemId = text(ref.itemId, 2048)
  if ([spaceId, itemId].some((id) => /[/\\?#%]/.test(id) || id === '.' || id === '..'))
    throw new Error('Use canonical OpenCloud space and item IDs.')
  return { spaceId, itemId }
}
export function parsePolicy(value: unknown): OfficePolicy {
  const raw = { ...object(value) }
  if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_POLICY_BYTES)
    throw new Error('Configuration is too large.')
  // Empty v1 policies can migrate without losing data. Nonempty retired customization
  // must be removed deliberately from the original file, never silently discarded.
  if (raw.schemaVersion === 1) {
    for (const key of ['shortcuts', 'additionalFormats', 'handlers']) {
      if (
        raw[key] !== undefined &&
        (!raw[key] || typeof raw[key] !== 'object' || Object.keys(raw[key]).length)
      )
        throw new Error(
          'This policy contains retired custom-app settings. Back it up and remove those fields before migration.'
        )
      delete raw[key]
    }
    raw.schemaVersion = 2
  }
  keys(raw, ['schemaVersion', 'templateFolder', 'allowPersonalTemplates', 'creationFormats'])
  if (raw.schemaVersion !== 2) throw new Error('Unsupported configuration version.')
  const policy = defaultPolicy()
  if (raw.templateFolder !== undefined) policy.templateFolder = configurationRef(raw.templateFolder)
  if (raw.allowPersonalTemplates !== undefined) {
    if (typeof raw.allowPersonalTemplates !== 'boolean') throw new Error('Invalid template policy.')
    policy.allowPersonalTemplates = raw.allowPersonalTemplates
  }
  if (raw.creationFormats !== undefined) {
    const entries = object(raw.creationFormats)
    keys(entries, kinds)
    for (const kind of kinds)
      if (entries[kind] !== undefined) {
        const values = entries[kind]
        if (!Array.isArray(values) || values.length > 30)
          throw new Error('Invalid creation formats.')
        const known = officeApps.find((app) => app.id === kind)!.formats
        const formats = values.map((value) => text(value, 12))
        if (
          new Set(formats).size !== formats.length ||
          formats.some((ext) => !known.some((format) => format.extension === ext))
        )
          throw new Error('Creation formats must belong to the office family.')
        policy.creationFormats[kind] = formats
      }
  }
  return policy
}
