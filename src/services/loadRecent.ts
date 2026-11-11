import { toRaw } from 'vue'
import { belongsTo } from '../app/registry'
import {
  refKey,
  type FileRecord,
  type RecentFilter,
  type OfficeKind,
  type OfficeServices
} from '../contracts/office'
import type { RecentEntry } from './recentView'
import { attempt, errorText } from './errors'

function matchesFilter(file: FileRecord, filter: RecentFilter): boolean {
  return (
    (!filter.favorites || file.favorite === true) &&
    (!filter.tags.length || filter.tags.some((tag) => file.tags?.includes(tag)))
  )
}

export function recentLoader(services: OfficeServices, kind: OfficeKind, filter: RecentFilter) {
  // Merges browser-opened references and server changes, then applies the Recent filter to both.
  return async (signal: AbortSignal) => {
    const filterNow = structuredClone(toRaw(filter))
    const [recent, changed] = await Promise.all([
      Promise.all(
        services.recents.list(kind).map(async ({ ref, openedAt }) => {
          const resolved = await attempt(() => services.catalog.resolve(ref))
          if (!resolved.ok && resolved.error === 'forbiddenOrMissing') services.recents.remove(ref)
          return { resolved, openedAt }
        })
      ),
      attempt(() => services.catalog.recentlyChanged(kind, signal, filterNow))
    ])
    // Failed refreshes show no cached private metadata, including when only one recent failed.
    const opened = recent.every(
      ({ resolved }) => resolved.ok || resolved.error === 'forbiddenOrMissing'
    )
      ? recent.flatMap(({ resolved, openedAt }) =>
          resolved.ok && resolved.value.access.read && belongsTo(resolved.value, kind)
            ? [{ file: resolved.value, openedAt }]
            : []
        )
      : []
    // Server changes and browser opens are merged by identity; each keeps its own timestamp.
    // Only the server query sets modifiedAt here; an opened file's old change date is not "recent".
    const merged = new Map<string, RecentEntry>(
      opened.map((entry) => [refKey(entry.file.ref), entry])
    )
    for (const file of changed.ok ? changed.value.items : []) {
      if (!file.access.read || !belongsTo(file, kind)) continue
      const known = merged.get(refKey(file.ref))
      merged.set(refKey(file.ref), { ...known, file, modifiedAt: file.modifiedAt })
    }
    return {
      entries: [...merged.values()].filter((entry) => matchesFilter(entry.file, filterNow)),
      note: !changed.ok
        ? `Changes from other devices are unavailable. ${errorText[changed.error]}`
        : changed.value.partial
          ? 'OpenCloud returned only some recent changes; older ones may be missing.'
          : ''
    }
  }
}
