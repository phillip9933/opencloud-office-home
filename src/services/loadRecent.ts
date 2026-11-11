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
import { waitForResult } from './cancellation'

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
    if (signal.aborted) return { entries: [], note: '' }
    const references = services.recents.list(kind)
    const recent: Array<{
      resolved: Awaited<ReturnType<typeof services.catalog.resolve>>
      openedAt: number
    }> = []
    let next = 0
    async function worker() {
      while (!signal.aborted && next < references.length) {
        const { ref, openedAt } = references[next++]!
        const resolved = await waitForResult(
          attempt(() => services.catalog.resolve(ref, signal)),
          signal
        )
        if (signal.aborted) return
        if (!resolved.ok && resolved.error === 'forbiddenOrMissing') services.recents.remove(ref)
        recent.push({ resolved, openedAt })
      }
    }
    const [, changed] = await Promise.all([
      Promise.all(Array.from({ length: Math.min(4, references.length) }, worker)),
      waitForResult(
        attempt(() => services.catalog.recentlyChanged(kind, signal, filterNow)),
        signal
      )
    ])
    if (signal.aborted) return { entries: [], note: '' }
    if (
      (!changed.ok && changed.error === 'unauthenticated') ||
      recent.some(({ resolved }) => !resolved.ok && resolved.error === 'unauthenticated')
    ) {
      return { entries: [], note: errorText.unauthenticated }
    }
    // Each displayed item was refreshed successfully; one unavailable item must not hide the others.
    const opened = recent.flatMap(({ resolved, openedAt }) =>
      resolved.ok && resolved.value.access.read && belongsTo(resolved.value, kind)
        ? [{ file: resolved.value, openedAt }]
        : []
    )
    const notes: string[] = []
    if (recent.some(({ resolved }) => !resolved.ok && resolved.error !== 'forbiddenOrMissing')) {
      notes.push('Some recently opened files could not be refreshed.')
    }
    if (!changed.ok)
      notes.push(`Changes from other devices are unavailable. ${errorText[changed.error]}`)
    else if (changed.value.partial)
      notes.push('OpenCloud returned only some recent changes; older ones may be missing.')
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
      note: notes.join(' ')
    }
  }
}
