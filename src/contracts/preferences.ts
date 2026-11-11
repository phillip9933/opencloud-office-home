import type { FileRef, OfficeKind } from './files'

export const fileColumns = [
  { id: 'activity', label: 'Last activity' },
  { id: 'location', label: 'Location' },
  { id: 'owner', label: 'Owner' },
  { id: 'created', label: 'Date created' },
  { id: 'modified', label: 'Date modified' },
  { id: 'tags', label: 'Tags' },
  { id: 'type', label: 'File type' }
] as const
export type FileColumn = (typeof fileColumns)[number]['id']
export const defaultColumns: FileColumn[] = ['location', 'activity']
export type RecentSort = 'activity' | 'name'

// 'auto' shows cards until AUTO_COMPACT_AFTER files were created here, then a single line.
export type TemplateBand = 'auto' | 'row' | 'compact'
export const AUTO_COMPACT_AFTER = 3
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
export interface ViewPreferenceStore {
  load(): ViewPreferences
  save(preferences: ViewPreferences): void
}
