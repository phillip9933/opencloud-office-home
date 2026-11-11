import type { FileRecord } from '../contracts/office'

// A file is recent because it was opened in this browser, changed in OpenCloud, or both.
export interface RecentEntry {
  file: FileRecord
  openedAt?: number
  modifiedAt?: number
}
export type RecentSort = 'activity' | 'name'
export interface RecentGroup {
  label: string
  entries: RecentEntry[]
}

const DAY = 86_400_000

export function lastActivity(entry: RecentEntry): { at: number; kind: 'opened' | 'changed' } {
  const opened = entry.openedAt ?? -Infinity
  const changed = entry.modifiedAt ?? -Infinity
  return opened >= changed ? { at: opened, kind: 'opened' } : { at: changed, kind: 'changed' }
}

function startOfDay(time: number): number {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function sortRecents(entries: readonly RecentEntry[], by: RecentSort): RecentEntry[] {
  return [...entries].sort((a, b) =>
    by === 'name'
      ? a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' })
      : lastActivity(b).at - lastActivity(a).at
  )
}

/**
 * Groups by the local calendar day of the latest activity. Name order has no
 * meaningful time buckets, so it returns one unlabeled group.
 */
export function groupRecents(
  entries: readonly RecentEntry[],
  by: RecentSort,
  now: number
): RecentGroup[] {
  const sorted = sortRecents(entries, by)
  if (by === 'name') return sorted.length ? [{ label: '', entries: sorted }] : []
  const today = startOfDay(now)
  const buckets: RecentGroup[] = [
    { label: 'Today', entries: [] },
    { label: 'Previous 7 days', entries: [] },
    { label: 'Previous 30 days', entries: [] },
    { label: 'Earlier', entries: [] }
  ]
  for (const entry of sorted) {
    const at = lastActivity(entry).at
    const index = at >= today ? 0 : at >= today - 7 * DAY ? 1 : at >= today - 30 * DAY ? 2 : 3
    buckets[index]!.entries.push(entry)
  }
  return buckets.filter((group) => group.entries.length)
}
