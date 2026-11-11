import {
  fail,
  ok,
  refKey,
  type CreationRequest,
  type CreationResult,
  type FileRecord,
  type FileRef,
  type Format,
  type OfficeKind,
  type OfficeServices,
  type Result,
  type Template
} from '../contracts/office'
import { officeApps } from '../app/registry'
import { attempt } from './errors'

function creationRequest(
  kind: OfficeKind,
  destination: FileRef,
  name: string,
  extension: string,
  formats: Format[]
): Result<CreationRequest> {
  const format = formats.find((format) => format.extension === extension)
  const stem = name.trim()
  if (
    !format ||
    !stem ||
    stem.length > 180 ||
    /[/\\\u0000-\u001f\u007f]/.test(stem) ||
    stem === '.' ||
    stem === '..' ||
    officeApps.some((app) =>
      app.formats.some(
        (format) =>
          format.extension !== extension && stem.toLowerCase().endsWith(`.${format.extension}`)
      )
    )
  )
    return fail('invalidName')
  return ok({
    kind,
    destination: { ...destination },
    format,
    name: stem.toLowerCase().endsWith(`.${extension}`) ? stem : `${stem}.${extension}`
  })
}

// UI checks provide prompt feedback. The native adapter independently rechecks its mutation boundary.
export async function createOfficeFile(
  services: OfficeServices,
  kind: OfficeKind,
  destination: FileRef,
  name: string,
  extension: string,
  formats: Format[],
  template?: Template
): Promise<
  Result<{ file: FileRecord; destinationName: string }> & { uncertain?: CreationRequest }
> {
  const request = creationRequest(kind, destination, name, extension, formats)
  if (!request.ok) return request
  const input = request.value
  const [resolved, capabilities] = await Promise.all([
    attempt(() => services.catalog.resolve(destination)),
    attempt(() => services.capabilities.creationFormats(kind))
  ])
  if (!resolved.ok) return resolved
  if (resolved.value.kind !== 'folder' || !resolved.value.access.createChild)
    return fail('forbiddenOrMissing')
  if (!capabilities.ok) return capabilities
  if (
    !capabilities.value.some(
      (format) => format.mimeType === input.format.mimeType && format.extension === extension
    )
  )
    return fail('unsupportedType')
  if (template) {
    const source = await attempt(() => services.catalog.resolve(template.source))
    if (!source.ok) return source
    if (
      !source.value.access.read ||
      template.kind !== kind ||
      template.format.mimeType !== input.format.mimeType
    )
      return fail('forbiddenOrMissing')
  }
  let created: CreationResult
  try {
    created = await (template
      ? services.creation.fromTemplate({ ...input, template })
      : services.creation.blank(input))
  } catch {
    // A broken adapter contract gives no reliable dispatch information. Preserve the lock.
    created = { ok: false, error: 'unknown', outcome: 'uncertain' }
  }
  if (created.ok) return ok({ file: created.value, destinationName: resolved.value.name })
  return created.outcome === 'uncertain'
    ? { ...fail(created.error), uncertain: input }
    : fail(created.error)
}

// A partial listing can establish a positive match, never absence. Revalidate the returned ID.
// Finding a match does not prove who created it or that the editor has saved any content.
export async function findCreation(
  services: OfficeServices,
  input: CreationRequest,
  signal: AbortSignal
): Promise<Result<FileRecord | null>> {
  const listing = await attempt(() =>
    services.catalog.list({ folder: input.destination, kind: input.kind, signal })
  )
  if (!listing.ok) return listing
  if (signal.aborted) return fail('cancelled')
  const matches = listing.value.items.filter(
    (file) =>
      file.kind === 'file' &&
      file.name === input.name &&
      file.mimeType === input.format.mimeType &&
      file.access.read
  )
  if (matches.length !== 1) return ok(null)
  const resolved = await attempt(() => services.catalog.resolve(matches[0]!.ref, signal))
  if (!resolved.ok) return resolved
  if (signal.aborted) return fail('cancelled')
  const file = resolved.value
  return refKey(file.ref) === refKey(matches[0]!.ref) &&
    file.kind === 'file' &&
    file.name === input.name &&
    file.mimeType === input.format.mimeType &&
    file.access.read
    ? ok(file)
    : fail('forbiddenOrMissing')
}
