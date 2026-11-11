import type { FileRecord, Format, OfficeKind } from '../contracts/office'

export interface AppDescriptor {
  id: OfficeKind
  label: string
  formats: readonly Format[]
  // Template containers (for example Collabora's ODF templates) and the format a copy produces.
  templateFormats?: readonly (Format & { creates: string })[]
}
export const officeApps = [
  {
    id: 'docs',
    label: 'Docs',
    formats: [
      { extension: 'odt', mimeType: 'application/vnd.oasis.opendocument.text' },
      {
        extension: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    ],
    templateFormats: [
      {
        extension: 'ott',
        mimeType: 'application/vnd.oasis.opendocument.text-template',
        creates: 'odt'
      }
    ]
  },
  {
    id: 'sheets',
    label: 'Sheets',
    formats: [
      {
        extension: 'ods',
        mimeType: 'application/vnd.oasis.opendocument.spreadsheet'
      },
      {
        extension: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ],
    templateFormats: [
      {
        extension: 'ots',
        mimeType: 'application/vnd.oasis.opendocument.spreadsheet-template',
        creates: 'ods'
      }
    ]
  },
  {
    id: 'slides',
    label: 'Slides',
    formats: [
      {
        extension: 'odp',
        mimeType: 'application/vnd.oasis.opendocument.presentation'
      },
      {
        extension: 'pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }
    ],
    templateFormats: [
      {
        extension: 'otp',
        mimeType: 'application/vnd.oasis.opendocument.presentation-template',
        creates: 'odp'
      }
    ]
  }
] as const satisfies readonly AppDescriptor[]

// The host prefixes local route names with the application ID.
export const officeRoute = (kind: OfficeKind) => `office-${kind}`

export function familyFormats(kind: OfficeKind): readonly Format[] {
  const app = officeApps.find((app) => app.id === kind)!
  return [...app.formats, ...(app.templateFormats ?? [])]
}

// Resolves the editable format a document or template file produces, if it belongs to the family.
export function resultFormat(file: FileRecord, kind: OfficeKind): Format | undefined {
  if (file.kind !== 'file' || !belongsTo(file, kind)) return undefined
  const app = officeApps.find((app) => app.id === kind)!
  const matches = (format: Format) =>
    file.mimeType
      ? format.mimeType === file.mimeType.toLowerCase()
      : file.name.toLowerCase().endsWith(`.${format.extension}`)
  const template = app.templateFormats?.find(matches)
  return template
    ? app.formats.find((format) => format.extension === template.creates)
    : app.formats.find(matches)
}

export function belongsTo(file: FileRecord, kind: OfficeKind): boolean {
  if (file.kind === 'folder') return true
  const formats = familyFormats(kind)
  // A present but contradictory MIME type stays unclassified; extension fallback is for missing metadata.
  return file.mimeType
    ? formats.some((format) => format.mimeType === file.mimeType?.toLowerCase())
    : formats.some((format) => file.name.toLowerCase().endsWith(`.${format.extension}`))
}
