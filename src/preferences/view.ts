import type { FileRef, OfficeKind } from '../contracts/office'
import { defaultColumns, fileColumns, type FileColumn } from '../services/columns'
import type { RecentSort } from '../services/recentView'

// 'auto' shows cards until AUTO_COMPACT_AFTER files were created here, then a single line.
export type TemplateBand = 'auto' | 'row' | 'compact'
export const AUTO_COMPACT_AFTER = 3
const MAX_COUNT = 1000
export interface ViewPreferences {
  lastKind: OfficeKind
  columns: FileColumn[]
  templateFolder?: FileRef
  sort: RecentSort
  layout: 'list' | 'grid'
  band: TemplateBand
  // Template IDs in the user's order; IDs are opaque and revalidated against the live gallery.
  pinned: Record<OfficeKind, string[]>
  // Last successful creation choices; the folder is revalidated before it is used again.
  lastFormat: Partial<Record<OfficeKind, string>>
  lastFolder: Partial<Record<OfficeKind, FileRef>>
  // Files created through this app in this browser; only drives the automatic band.
  createdCount: number
}
interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

// Bounds keep a corrupt or hostile stored value from growing without limit.
const MAX_PINS = 24
const MAX_ID_LENGTH = 1024
const KINDS: OfficeKind[] = ['docs', 'sheets', 'slides']

export function defaultViewPreferences(): ViewPreferences {
  return {
    lastKind: 'docs',
    columns: [...defaultColumns],
    sort: 'activity',
    layout: 'list',
    band: 'auto',
    pinned: { docs: [], sheets: [], slides: [] },
    lastFormat: {},
    lastFolder: {},
    createdCount: 0
  }
}

function pins(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids = value.filter(
    (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH
  )
  return [...new Set(ids)].slice(0, MAX_PINS)
}

export function parseViewPreferences(raw: unknown): ViewPreferences {
  const result = defaultViewPreferences()
  if (!raw || typeof raw !== 'object') return result
  const value = raw as Record<string, unknown>
  if (KINDS.includes(value.lastKind as OfficeKind)) result.lastKind = value.lastKind as OfficeKind
  if (Array.isArray(value.columns))
    result.columns = [
      ...new Set(
        value.columns.filter((id): id is FileColumn =>
          fileColumns.some((column) => column.id === id)
        )
      )
    ]
  const template = value.templateFolder
  if (
    template &&
    typeof template === 'object' &&
    'spaceId' in template &&
    'itemId' in template &&
    typeof template.spaceId === 'string' &&
    typeof template.itemId === 'string' &&
    template.spaceId.length > 0 &&
    template.itemId.length > 0 &&
    template.spaceId.length <= MAX_ID_LENGTH &&
    template.itemId.length <= MAX_ID_LENGTH
  )
    result.templateFolder = { spaceId: template.spaceId, itemId: template.itemId }

  if (value.sort === 'activity' || value.sort === 'name') result.sort = value.sort
  if (value.layout === 'list' || value.layout === 'grid') result.layout = value.layout
  if (value.band === 'auto' || value.band === 'row' || value.band === 'compact')
    result.band = value.band
  const pinned = value.pinned && typeof value.pinned === 'object' ? value.pinned : {}
  for (const kind of KINDS) result.pinned[kind] = pins((pinned as Record<string, unknown>)[kind])
  const formats = (value.lastFormat ?? {}) as Record<string, unknown>
  const folders = (value.lastFolder ?? {}) as Record<string, unknown>
  for (const kind of KINDS) {
    const format = formats[kind]
    if (typeof format === 'string' && /^[a-z0-9]{1,8}$/.test(format))
      result.lastFormat[kind] = format
    const folder = folders[kind] as Record<string, unknown> | undefined
    if (
      folder &&
      typeof folder === 'object' &&
      typeof folder.spaceId === 'string' &&
      typeof folder.itemId === 'string' &&
      folder.spaceId.length > 0 &&
      folder.itemId.length > 0 &&
      folder.spaceId.length <= MAX_ID_LENGTH &&
      folder.itemId.length <= MAX_ID_LENGTH
    )
      result.lastFolder[kind] = { spaceId: folder.spaceId, itemId: folder.itemId }
  }
  if (Number.isInteger(value.createdCount) && (value.createdCount as number) >= 0)
    result.createdCount = Math.min(value.createdCount as number, MAX_COUNT)
  return result
}

/**
 * Per-instance, per-user view choices. Nothing here describes file contents or grants access;
 * pinned IDs only reorder templates the user can already see.
 */
export function createViewPreferenceStore(
  scope: { instance: string; user: string },
  storage?: StoragePort
) {
  if (!scope.instance || !scope.user) throw new Error('Authenticated preference scope required')
  const key = JSON.stringify(['office-view', 1, scope.instance, scope.user])
  return {
    load(): ViewPreferences {
      try {
        return parseViewPreferences(JSON.parse(storage?.getItem(key) ?? 'null'))
      } catch {
        /* Browser storage can be denied or corrupt. Use defaults. */
        return defaultViewPreferences()
      }
    },
    save(preferences: ViewPreferences) {
      try {
        storage?.setItem(key, JSON.stringify(parseViewPreferences(preferences)))
      } catch {
        /* Session-only when storage is unavailable. */
      }
    }
  }
}
export type ViewPreferenceStore = ReturnType<typeof createViewPreferenceStore>

export function compactBand(preferences: Pick<ViewPreferences, 'band' | 'createdCount'>) {
  return (
    preferences.band === 'compact' ||
    (preferences.band === 'auto' && preferences.createdCount >= AUTO_COMPACT_AFTER)
  )
}

export function togglePin(list: readonly string[], id: string): string[] {
  return list.includes(id)
    ? list.filter((pinned) => pinned !== id)
    : [...list, id].slice(0, MAX_PINS)
}

export function movePin(list: readonly string[], id: string, to: number): string[] {
  const from = list.indexOf(id)
  if (from < 0) return [...list]
  const next = list.filter((pinned) => pinned !== id)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, id)
  return next
}
