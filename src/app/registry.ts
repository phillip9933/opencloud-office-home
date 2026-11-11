import type { FileRecord, Format, OfficeKind } from '../contracts/office'

export interface AppDescriptor {
  schemaVersion: 1
  id: string
  label: string
  icon: string
  order: number
  route: string
  enabled: boolean
  formats: readonly Format[]
  // Template containers (for example Collabora's ODF templates) and the format a copy produces.
  templateFormats?: readonly (Format & { creates: string })[]
}
export const officeApps = [
  {
    schemaVersion: 1,
    id: 'docs',
    label: 'Docs',
    icon: 'file-text',
    order: 10,
    route: 'office-docs',
    enabled: true,
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
    schemaVersion: 1,
    id: 'sheets',
    label: 'Sheets',
    icon: 'table',
    order: 20,
    route: 'office-sheets',
    enabled: true,
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
    schemaVersion: 1,
    id: 'slides',
    label: 'Slides',
    icon: 'slideshow',
    order: 30,
    route: 'office-slides',
    enabled: true,
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

// A small installed-route-only registry. No URLs, scripts, modules or remote manifests.
export function validateMenu(
  input: unknown,
  installedRoutes: ReadonlySet<string>
): AppDescriptor[] {
  if (!Array.isArray(input) || input.length > 50) throw new Error('Invalid app catalog')
  const ids = new Set<string>()
  return input
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error('Invalid app entry')
      const item = entry as AppDescriptor
      const allowed = [
        'schemaVersion',
        'id',
        'label',
        'icon',
        'order',
        'route',
        'enabled',
        'formats',
        'templateFormats'
      ]
      if (
        Object.keys(item).some((key) => !allowed.includes(key)) ||
        item.schemaVersion !== 1 ||
        typeof item.id !== 'string' ||
        !/^[a-z][a-z0-9-]{0,39}$/.test(item.id) ||
        ids.has(item.id) ||
        typeof item.label !== 'string' ||
        !item.label.trim() ||
        item.label.length > 80 ||
        !['file-text', 'table', 'slideshow', 'image'].includes(item.icon) ||
        !Number.isInteger(item.order) ||
        item.order < 0 ||
        item.order > 1000 ||
        typeof item.enabled !== 'boolean' ||
        !installedRoutes.has(item.route) ||
        !Array.isArray(item.formats) ||
        item.formats.some(
          (f) =>
            !f ||
            typeof f.extension !== 'string' ||
            !/^[a-z0-9]{1,12}$/.test(f.extension) ||
            typeof f.mimeType !== 'string' ||
            !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(f.mimeType)
        ) ||
        (item.templateFormats !== undefined &&
          (!Array.isArray(item.templateFormats) ||
            item.templateFormats.some(
              (f) =>
                !f ||
                typeof f.extension !== 'string' ||
                !/^[a-z0-9]{1,12}$/.test(f.extension) ||
                typeof f.mimeType !== 'string' ||
                !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(f.mimeType) ||
                !item.formats.some((format) => format.extension === f.creates)
            )))
      ) {
        throw new Error('Unapproved app entry')
      }
      ids.add(item.id)
      return structuredClone(item)
    })
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order)
}

export function familyFormats(
  kind: OfficeKind,
  apps: readonly AppDescriptor[] = officeApps
): readonly Format[] {
  const app = apps.find((app) => app.id === kind)!
  return [...app.formats, ...(app.templateFormats ?? [])]
}

// Resolves the editable format a document or template file produces, if it belongs to the family.
export function resultFormat(
  file: FileRecord,
  kind: OfficeKind,
  apps: readonly AppDescriptor[] = officeApps
): Format | undefined {
  if (file.kind !== 'file' || !belongsTo(file, kind, apps)) return undefined
  const app = apps.find((app) => app.id === kind)!
  const matches = (format: Format) =>
    file.mimeType
      ? format.mimeType === file.mimeType.toLowerCase()
      : file.name.toLowerCase().endsWith(`.${format.extension}`)
  const template = app.templateFormats?.find(matches)
  return template
    ? app.formats.find((format) => format.extension === template.creates)
    : app.formats.find(matches)
}

export function belongsTo(
  file: FileRecord,
  kind: OfficeKind,
  apps: readonly AppDescriptor[] = officeApps
): boolean {
  if (file.kind === 'folder') return true
  const formats = familyFormats(kind, apps)
  // A present but contradictory MIME type stays unclassified; extension fallback is for missing metadata.
  return file.mimeType
    ? formats.some((format) => format.mimeType === file.mimeType?.toLowerCase())
    : formats.some((format) => file.name.toLowerCase().endsWith(`.${format.extension}`))
}
