import type { Resource } from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import type { FileRecord } from '../../contracts/office'

// Match AppWrapper's edit check; never infer write access from ownership or a filename.
export function nativeAccess8(resource: Resource): FileRecord['access'] {
  const permissions = resource.permissions ?? ''
  const denied = !permissions || permissions.includes(DavPermission.Deny) || resource.isInVault
  return {
    read: !denied && resource.canDownload?.() === true,
    write:
      !denied &&
      !resource.isFolder &&
      [DavPermission.Updateable, DavPermission.FileUpdateable].some((p) => permissions.includes(p)),
    createChild: !denied && resource.isFolder === true && resource.canCreate?.() === true
  }
}
