import type { SpaceResource } from '@opencloud-eu/web-client'
import type { Page } from '../../contracts/office'
import type { ReadPort8 } from './catalog8'
import { normalizeReadMetadata } from './catalog8'
import { HttpStatusError, catalogError } from './errors8'

/** Graph root IDs need normalization to the DAV identity used by file operations. */
export function canonicalRootDrives8(port: ReadPort8) {
  return async (signal: AbortSignal): Promise<Page<SpaceResource>> => {
    const drives = await port.drives.listMyDrives(undefined, { signal })
    const items: SpaceResource[] = []
    let partial = false
    for (const drive of drives) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      if (drive.disabled || !['personal', 'project'].includes(drive.driveType)) continue
      try {
        const resource = await port.webdav.getFileInfo(drive, { path: '/' }, { signal })
        const root = normalizeReadMetadata(drive.id, resource)
        if (!root.ok || root.value.kind !== 'folder' || root.value.path !== '/')
          throw new HttpStatusError(404)
        items.push({ ...drive, root: { ...drive.root, id: root.value.ref.itemId } })
      } catch (error) {
        if (signal.aborted || ['unauthenticated', 'cancelled'].includes(catalogError(error)))
          throw error
        partial = true
      }
    }
    return { items, partial }
  }
}
