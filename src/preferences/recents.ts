import { refKey, type FileRef, type RecentRef, type RecentStore } from '../contracts/office'

interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export function createRecentStore(
  scope: { instance: string; user: string },
  storage?: StoragePort,
  now: () => number = Date.now
): RecentStore {
  if (!scope.instance || !scope.user) throw new Error('Authenticated recent scope required')
  const key = JSON.stringify(['office-recents', 1, scope.instance, scope.user])
  let entries: RecentRef[] = []
  try {
    const raw: unknown = JSON.parse(storage?.getItem(key) ?? '[]')
    if (Array.isArray(raw))
      entries = raw
        .filter(
          (r): r is RecentRef =>
            !!r &&
            typeof r === 'object' &&
            ['docs', 'sheets', 'slides'].includes(r.kind) &&
            typeof r.openedAt === 'number' &&
            Number.isFinite(r.openedAt) &&
            r.ref &&
            typeof r.ref.spaceId === 'string' &&
            typeof r.ref.itemId === 'string'
        )
        .map((r) => ({
          ref: { spaceId: r.ref.spaceId, itemId: r.ref.itemId },
          kind: r.kind,
          openedAt: r.openedAt
        }))
  } catch {
    /* Browser storage can be denied or corrupt. Remain session-local. */
  }
  function prune() {
    entries = entries
      .filter((r) => r.openedAt <= now() && r.openedAt > now() - 90 * 86400000)
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, 100)
  }
  function persist() {
    prune()
    try {
      storage?.setItem(key, JSON.stringify(entries))
    } catch {
      /* session-local fallback */
    }
  }
  prune()
  return {
    list(kind) {
      prune()
      return structuredClone(entries.filter((r) => r.kind === kind))
    },
    record(ref, kind) {
      entries = entries.filter((r) => refKey(r.ref) !== refKey(ref))
      entries.unshift({ ref: { ...ref }, kind, openedAt: now() })
      persist()
    },
    remove(ref: FileRef) {
      entries = entries.filter((r) => refKey(r.ref) !== refKey(ref))
      persist()
    },
    clear() {
      entries = []
      try {
        storage?.removeItem(key)
      } catch {
        /* session-local fallback */
      }
    }
  }
}
