import { officeKinds, isFileRef, DAY_MS } from '../contracts/files'
import { refKey, type RecentRef, type RecentStore } from '../contracts/office'

interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
interface LockPort {
  request(name: string, callback: () => void): Promise<void>
}

function decodeHistory(serialized: string | null): RecentRef[] {
  let raw: unknown
  try {
    raw = JSON.parse(serialized ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (r): r is RecentRef =>
        !!r &&
        typeof r === 'object' &&
        officeKinds.includes(r.kind) &&
        typeof r.openedAt === 'number' &&
        Number.isFinite(r.openedAt) &&
        isFileRef(r.ref)
    )
    .map((r) => ({
      ref: { spaceId: r.ref.spaceId, itemId: r.ref.itemId },
      kind: r.kind,
      openedAt: r.openedAt
    }))
}

export function createRecentStore(
  scope: { instance: string; user: string },
  storage?: StoragePort,
  now: () => number = Date.now,
  // False means shared storage is readable, but this browser cannot serialize updates.
  locks?: LockPort | false
): RecentStore {
  if (!scope.instance || !scope.user) throw new Error('Authenticated recent scope required')
  const key = JSON.stringify(['office-recents', 1, scope.instance, scope.user])
  let entries: RecentRef[] = []
  let persisted = '[]'

  function refresh() {
    if (!storage) return
    try {
      persisted = storage.getItem(key) ?? '[]'
      entries = decodeHistory(persisted)
    } catch {
      // Preserve the last readable snapshot and never overwrite unknown persisted data.
      storage = undefined
    }
  }
  refresh()
  if (locks === false) storage = undefined

  function prune() {
    const time = now()
    entries = entries
      .filter((r) => r.openedAt <= time && r.openedAt > time - 90 * DAY_MS)
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, 100)
  }

  function mutate(update: () => void): void | Promise<void> {
    function apply() {
      refresh()
      update()
      prune()
      try {
        const serialized = JSON.stringify(entries)
        if (storage && serialized !== persisted) {
          storage.setItem(key, serialized)
          persisted = serialized
        }
      } catch {
        storage = undefined
      }
    }
    if (storage && locks) {
      return locks.request(key, apply).catch(() => {
        // A denied lock cannot justify a shared read-modify-write without coordination.
        storage = undefined
        apply()
      })
    }
    apply()
  }

  return {
    list(kind) {
      refresh()
      prune()
      // Expire stored identities without writing a stale snapshot over another tab.
      if (storage && JSON.stringify(entries) !== persisted) void mutate(() => {})
      return structuredClone(entries.filter((r) => r.kind === kind))
    },
    record(ref, kind) {
      const entry = { ref: { ...ref }, kind, openedAt: now() }
      return mutate(() => {
        entries = entries.filter((r) => refKey(r.ref) !== refKey(ref))
        entries.unshift(entry)
      })
    },
    remove(ref) {
      const id = refKey(ref)
      return mutate(() => {
        entries = entries.filter((r) => refKey(r.ref) !== id)
      })
    }
  }
}
