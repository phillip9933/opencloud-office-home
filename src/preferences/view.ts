import type { OfficeKind } from '../contracts/office'
import type { RecentSort } from '../services/recentView'

export type TemplateBand = 'row' | 'compact'
export interface ViewPreferences {
  sort: RecentSort
  layout: 'list' | 'grid'
  band: TemplateBand
  // Template IDs in the user's order; IDs are opaque and revalidated against the live gallery.
  pinned: Record<OfficeKind, string[]>
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
    sort: 'activity',
    layout: 'list',
    band: 'row',
    pinned: { docs: [], sheets: [], slides: [] }
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
  if (value.sort === 'activity' || value.sort === 'name') result.sort = value.sort
  if (value.layout === 'list' || value.layout === 'grid') result.layout = value.layout
  if (value.band === 'row' || value.band === 'compact') result.band = value.band
  const pinned = value.pinned && typeof value.pinned === 'object' ? value.pinned : {}
  for (const kind of KINDS) result.pinned[kind] = pins((pinned as Record<string, unknown>)[kind])
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
