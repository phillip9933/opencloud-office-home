import type { FileRecord } from '../contracts/office'

export interface RecentEntry {
  file: FileRecord
  openedAt: number
}
export type RecentSort = 'opened' | 'name'
export interface RecentGroup {
  label: string
  entries: RecentEntry[]
}

const DAY = 86_400_000

function startOfDay(time: number): number {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function sortRecents(entries: readonly RecentEntry[], by: RecentSort): RecentEntry[] {
  return [...entries].sort((a, b) =>
    by === 'name'
      ? a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' })
      : b.openedAt - a.openedAt
  )
}

/**
 * Groups by the local calendar day the file was opened in this browser. Name order has no
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
    const index =
      entry.openedAt >= today
        ? 0
        : entry.openedAt >= today - 7 * DAY
          ? 1
          : entry.openedAt >= today - 30 * DAY
            ? 2
            : 3
    buckets[index]!.entries.push(entry)
  }
  return buckets.filter((group) => group.entries.length)
}
