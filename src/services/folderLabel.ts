import { fail, ok, type FileCatalog, type FileRef, type Result } from '../contracts/office'
import { attempt } from './home'

/** ID-addressed DAV paths may be `/` for a nested folder; its name remains authoritative. */
export async function describeFolder(
  catalog: FileCatalog,
  ref: FileRef,
  signal: AbortSignal
): Promise<Result<string>> {
  const spaces = await attempt(() => catalog.listSpaces(signal))
  if (!spaces.ok) return spaces
  const folder = await attempt(() => catalog.resolve(ref))
  if (!folder.ok) return folder
  if (signal.aborted) return fail('cancelled')
  const space = spaces.value.find((space) => space.id === ref.spaceId)
  const root = space?.root.itemId === ref.itemId
  const path = folder.value.path?.replace(/^\/+/, '')
  return ok([space?.name, root ? undefined : path || folder.value.name].filter(Boolean).join(' / '))
}
