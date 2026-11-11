import { officeKinds, isFileRef, DAY_MS } from '../contracts/files'
import { refKey, type FileRef, type RecentRef, type RecentStore } from '../contracts/office'

interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
export function createRecentStore(
  scope: { instance: string; user: string },
  storage?: StoragePort,
  now: () => number = Date.now
): RecentStore {
  if (!scope.instance || !scope.user) throw new Error('Authenticated recent scope required')
  const key = JSON.stringify(['office-recents', 1, scope.instance, scope.user])
  let entries: RecentRef[] = []
  let persisted: string | undefined
  try {
    persisted = storage?.getItem(key) ?? '[]'
    const raw: unknown = JSON.parse(persisted)
    if (Array.isArray(raw))
      entries = raw
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
  } catch {
    // If reading failed, do not overwrite unknown persisted data. Malformed JSON can be sanitized.
    if (persisted === undefined) storage = undefined
  }
  function prune() {
    entries = entries
      .filter((r) => r.openedAt <= now() && r.openedAt > now() - 90 * DAY_MS)
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, 100)
  }
  function persist() {
    prune()
    try {
      const serialized = JSON.stringify(entries)
      if (storage && serialized !== persisted) {
        storage.setItem(key, serialized)
        persisted = serialized
      }
    } catch {
      /* session-local fallback */
    }
  }
  persist()
  return {
    list(kind) {
      persist()
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
    }
  }
}
