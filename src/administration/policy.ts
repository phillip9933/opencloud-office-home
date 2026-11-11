import { officeApps, type AppDescriptor } from '../app/registry'
import type { FileRef, Format, OfficeKind } from '../contracts/office'

export interface AppShortcut {
  id: string
  label: string
  href: string
}
export interface FileHandlerPreference extends Format {
  action: string
}
export interface OfficePolicy {
  schemaVersion: 1
  templateFolder?: FileRef
  allowPersonalTemplates: boolean
  shortcuts: AppShortcut[]
  additionalFormats: Partial<Record<OfficeKind, Format[]>>
  creationFormats: Partial<Record<OfficeKind, string[]>>
  handlers: FileHandlerPreference[]
}
export const MAX_POLICY_BYTES = 65536
const kinds: OfficeKind[] = ['docs', 'sheets', 'slides']
export const defaultPolicy = (): OfficePolicy => ({
  schemaVersion: 1,
  allowPersonalTemplates: true,
  shortcuts: [],
  additionalFormats: {},
  creationFormats: {},
  handlers: []
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
function extension(value: unknown) {
  const result = text(value, 12)
  if (!/^[a-z0-9]{1,12}$/.test(result))
    throw new Error('Use a lowercase file extension without a dot.')
  return result
}
function format(value: unknown): Format {
  const entry = object(value)
  keys(entry, ['extension', 'mimeType'])
  const mimeType = text(entry.mimeType, 150)
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(mimeType)) throw new Error('Invalid MIME type.')
  return { extension: extension(entry.extension), mimeType }
}
function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum)
    throw new Error('Configuration list is too large or invalid.')
  return value
}
function unique(values: string[]) {
  if (new Set(values).size !== values.length)
    throw new Error('Configuration contains duplicate entries.')
}
export function shortcutHref(value: unknown): string {
  const href = text(value, 2048)
  const relative = href.startsWith('/') && !href.startsWith('//')
  const url = new URL(href, 'https://office.invalid')
  if (
    (!relative && (!href.startsWith('https://') || url.protocol !== 'https:')) ||
    url.username ||
    url.password ||
    /\\/.test(href) ||
    [...url.searchParams.keys()].some((key) =>
      /^(access_token|token|password|auth|authorization|client_secret)$/i.test(key)
    )
  )
    throw new Error('Use an HTTPS shortcut or a local route, without credentials.')
  return relative ? `${url.pathname}${url.search}${url.hash}` : url.href
}
export function parsePolicy(value: unknown): OfficePolicy {
  const raw = object(value)
  if (JSON.stringify(raw).length > MAX_POLICY_BYTES) throw new Error('Configuration is too large.')
  keys(raw, [
    'schemaVersion',
    'templateFolder',
    'allowPersonalTemplates',
    'shortcuts',
    'additionalFormats',
    'creationFormats',
    'handlers'
  ])
  if (raw.schemaVersion !== 1) throw new Error('Unsupported configuration version.')
  const policy = defaultPolicy()
  if (raw.templateFolder !== undefined) policy.templateFolder = configurationRef(raw.templateFolder)
  if (raw.allowPersonalTemplates !== undefined) {
    if (typeof raw.allowPersonalTemplates !== 'boolean') throw new Error('Invalid template policy.')
    policy.allowPersonalTemplates = raw.allowPersonalTemplates
  }
  if (raw.shortcuts !== undefined)
    policy.shortcuts = array(raw.shortcuts, 20).map((value) => {
      const entry = object(value)
      keys(entry, ['id', 'label', 'href'])
      const id = text(entry.id, 40)
      if (
        !/^[a-z][a-z0-9-]*$/.test(id) ||
        ['docs', 'sheets', 'slides', 'settings', 'admin'].includes(id)
      )
        throw new Error('Invalid shortcut ID.')
      return { id, label: text(entry.label, 80), href: shortcutHref(entry.href) }
    })
  unique(policy.shortcuts.map((entry) => entry.id))
  if (raw.additionalFormats !== undefined) {
    const entries = object(raw.additionalFormats)
    keys(entries, kinds)
    for (const kind of kinds)
      if (entries[kind] !== undefined) {
        const formats = array(entries[kind], 20).map(format)
        unique(
          [...officeApps.find((app) => app.id === kind)!.formats, ...formats].map(
            (entry) => entry.extension
          )
        )
        policy.additionalFormats[kind] = formats
      }
  }
  if (raw.creationFormats !== undefined) {
    const entries = object(raw.creationFormats)
    keys(entries, kinds)
    for (const kind of kinds)
      if (entries[kind] !== undefined) {
        const formats = array(entries[kind], 30).map(extension)
        unique(formats)
        const known = policyApplications(policy).find((app) => app.id === kind)!.formats
        if (formats.some((ext) => !known.some((entry) => entry.extension === ext)))
          throw new Error('Creation formats must belong to the family.')
        policy.creationFormats[kind] = formats
      }
  }
  if (raw.handlers !== undefined)
    policy.handlers = array(raw.handlers, 50).map((value) => {
      const entry = object(value)
      const action = text(entry.action, 150)
      if (!/^[a-zA-Z0-9._/-]+$/.test(action))
        throw new Error('Choose an installed native file action.')
      const parsed = format({ extension: entry.extension, mimeType: entry.mimeType })
      keys(entry, ['extension', 'mimeType', 'action'])
      return { ...parsed, action }
    })
  unique(policy.handlers.map((entry) => `${entry.extension}:${entry.mimeType}`))
  return policy
}
export function policyApplications(policy: OfficePolicy): AppDescriptor[] {
  return officeApps.map((app) => ({
    ...app,
    formats: [...app.formats, ...(policy.additionalFormats[app.id] ?? [])]
  }))
}
