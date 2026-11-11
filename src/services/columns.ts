import type { FileRecord } from '../contracts/office'

import type { FileColumn } from '../contracts/preferences'
export { defaultColumns, fileColumns } from '../contracts/preferences'
export type { FileColumn } from '../contracts/preferences'
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
function date(value?: number) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) < 8.64e15
    ? dateFormat.format(value)
    : 'Unavailable'
}
export function fileColumnValue(file: FileRecord, column: FileColumn, activity: string) {
  switch (column) {
    case 'activity':
      return activity
    case 'location':
      return file.path ?? 'Unavailable'
    case 'owner':
      return file.owner ?? 'Unavailable'
    case 'created':
      return date(file.createdAt)
    case 'modified':
      return date(file.modifiedAt)
    case 'tags':
      return file.tags?.join(', ') || '—'
    case 'type':
      return file.name.includes('.')
        ? file.name.split('.').at(-1)!.toUpperCase()
        : (file.mimeType ?? 'Unavailable')
  }
}
