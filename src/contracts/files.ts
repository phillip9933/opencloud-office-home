export const officeKinds = ['docs', 'sheets', 'slides'] as const
export type OfficeKind = (typeof officeKinds)[number]
export type FileRef = Readonly<{ spaceId: string; itemId: string }>
export const DAY_MS = 86_400_000

// Browser preferences accept bounded opaque identities; transport adapters validate SDK segments.
export function isFileRef(value: unknown): value is FileRef {
  if (!value || typeof value !== 'object') return false
  return (
    'spaceId' in value &&
    'itemId' in value &&
    typeof value.spaceId === 'string' &&
    typeof value.itemId === 'string' &&
    value.spaceId.length > 0 &&
    value.spaceId.length <= 1024 &&
    value.itemId.length > 0 &&
    value.itemId.length <= 1024
  )
}
