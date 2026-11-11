import type { ReadPort8 } from './catalog8'
import { normalizeReadMetadata } from './catalog8'

/** Graph's root DriveItem ID is not necessarily the DAV file ID used by id-based URLs. */
export function canonicalRootDrives8(port: ReadPort8): ReadPort8['drives'] {
  return {
    async listMyDrives(options, requestOptions) {
      const drives = await port.drives.listMyDrives(options, requestOptions)
      const result = []
      for (const drive of drives) {
        if (drive.disabled || !['personal', 'project'].includes(drive.driveType)) continue
        const resource = await port.webdav.getFileInfo(
          drive,
          { path: '/' },
          { signal: requestOptions?.signal }
        )
        const root = normalizeReadMetadata(drive.id, resource)
        if (!root.ok || root.value.kind !== 'folder' || root.value.path !== '/')
          throw { statusCode: 404 }
        // Preserve the opaque server-returned ID; never construct one from drive ID fragments.
        result.push({ ...drive, root: { ...drive.root, id: root.value.ref.itemId } })
      }
      return result
    }
  }
}
