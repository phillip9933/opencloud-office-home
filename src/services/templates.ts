import { resultFormat } from '../app/registry'
import {
  fail,
  ok,
  refKey,
  type FileCatalog,
  type FileRecord,
  type FileRef,
  type OfficeKind,
  type Result,
  type Template
} from '../contracts/office'

// Bounds keep a large or misconfigured folder from turning the home screen into a crawler.
const MAX_CATEGORIES = 20
const MAX_TEMPLATES = 200
const PREVIEW_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const GENERAL_CATEGORY = 'General'

function stem(name: string): string {
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name).trim()
}

function isPreviewImage(file: FileRecord): boolean {
  return file.kind === 'file' && PREVIEW_TYPES.includes(file.mimeType?.toLowerCase() ?? '')
}

function templatesIn(items: FileRecord[], kind: OfficeKind, category: string): Template[] {
  const previews = new Map(
    items.filter(isPreviewImage).map((image) => [stem(image.name).toLowerCase(), image.ref])
  )
  return items.flatMap((file) => {
    const format = resultFormat(file, kind)
    if (!format || !file.access.read) return []
    const name = stem(file.name)
    const preview: FileRef | undefined = previews.get(name.toLowerCase())
    return [
      {
        id: refKey(file.ref),
        name: name || file.name,
        kind,
        source: { ...file.ref },
        format: { ...format },
        category,
        ...(preview ? { preview: { ...preview } } : {})
      }
    ]
  })
}

/**
 * Reads an administrator-maintained OpenCloud template folder. Files at its root form the
 * General category, each direct subfolder is a category, and an image with the same name as a
 * template is its preview. Nothing here copies, uploads or edits the folder.
 */
export async function folderTemplates(
  catalog: FileCatalog,
  folder: FileRef,
  kind: OfficeKind,
  signal: AbortSignal
): Promise<Result<Template[]>> {
  const root = await catalog.list({ folder, kind: 'any', signal })
  if (!root.ok) return root
  const templates = templatesIn(root.value.items, kind, GENERAL_CATEGORY)
  const categories = root.value.items
    .filter((item) => item.kind === 'folder' && item.access.read)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_CATEGORIES)
  for (const category of categories) {
    const listed = await catalog.list({ folder: category.ref, kind: 'any', signal })
    if (!listed.ok) return fail(listed.error)
    templates.push(...templatesIn(listed.value.items, kind, category.name))
  }
  return ok(
    templates
      .sort(
        (a, b) =>
          Number(b.category === GENERAL_CATEGORY) - Number(a.category === GENERAL_CATEGORY) ||
          a.category.localeCompare(b.category) ||
          a.name.localeCompare(b.name)
      )
      .slice(0, MAX_TEMPLATES)
  )
}
