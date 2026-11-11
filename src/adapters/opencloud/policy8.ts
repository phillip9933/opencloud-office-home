import type { WebDAV } from '@opencloud-eu/web-client/webdav'
import type { Graph } from '@opencloud-eu/web-client/graph'
import { fail, ok, type FileRef } from '../../contracts/office'
import { MAX_POLICY_BYTES, parsePolicy, type OfficePolicy } from '../../administration/policy'
import type { Administration } from '../../administration/store'
import { catalogError } from './catalog8'
import { nativeAccess8 } from './access8'

export interface PolicyPort8 {
  drives: Pick<Graph['drives'], 'listMyDrives'>
  webdav: Pick<WebDAV, 'getFileInfo' | 'getFileContents' | 'putFileContents'>
}
/** DEV-LIMIT(DL-007): live policy-file ACL and conditional-write acceptance remains open. */
export function createPolicyStore8(
  port: PolicyPort8,
  ref: FileRef | undefined,
  fallback: OfficePolicy,
  administrator: () => boolean,
  session: () => string | undefined
): Administration {
  const initial = session()
  const current = () => !!initial && session() === initial
  let saving = false
  async function metadata() {
    if (!ref || !current()) throw { status: 401 }
    const spaces = await port.drives.listMyDrives()
    const space = spaces.find(
      (space) =>
        space.id === ref.spaceId &&
        !space.disabled &&
        ['personal', 'project'].includes(space.driveType)
    )
    if (!space || !current()) throw { status: 403 }
    const resource = await port.webdav.getFileInfo(space, { fileId: ref.itemId })
    if (!current()) throw { status: 401 }
    if (
      resource.fileId !== ref.itemId ||
      resource.isFolder ||
      !nativeAccess8(resource).read ||
      resource.remoteItemId ||
      resource.remoteItemPath ||
      !resource.name?.endsWith('.json') ||
      !Number.isFinite(Number(resource.size)) ||
      Number(resource.size) > MAX_POLICY_BYTES
    )
      throw { status: 403 }
    return { space, resource }
  }
  const store: Administration = {
    configured: !!ref,
    permitted: () => current() && administrator(),
    async load() {
      if (!current()) return fail('unauthenticated')
      if (!ref) return ok({ policy: parsePolicy(fallback), revision: 'static', writable: false })
      try {
        const { space, resource } = await metadata()
        const result = await port.webdav.getFileContents(
          space,
          { fileId: ref.itemId },
          { responseType: 'text' }
        )
        if (!current()) return fail('unauthenticated')
        const body: unknown = result.body
        const revision: unknown = result.headers?.ETag
        if (
          typeof body !== 'string' ||
          new TextEncoder().encode(body).length > MAX_POLICY_BYTES ||
          typeof revision !== 'string' ||
          !/^"[^"\r\n]+"$/.test(revision)
        )
          return fail('unsupportedType')
        return ok({
          policy: parsePolicy(JSON.parse(body)),
          revision,
          writable: store.permitted() && nativeAccess8(resource).write
        })
      } catch (error) {
        return fail(current() ? catalogError(error) : 'unauthenticated')
      }
    },
    async save(policy, revision) {
      if (!current()) return fail('unauthenticated')
      if (!store.permitted() || !ref) return fail('forbiddenOrMissing')
      if (saving) return fail('conflict')
      if (!/^"[^"\r\n]+"$/.test(revision)) return fail('conflict')
      let content: string
      try {
        content = JSON.stringify(parsePolicy(policy), null, 2) + '\n'
      } catch {
        return fail('unsupportedType')
      }
      if (new TextEncoder().encode(content).length > MAX_POLICY_BYTES)
        return fail('unsupportedType')
      saving = true
      let dispatched = false
      try {
        const { space, resource } = await metadata()
        if (!store.permitted() || !nativeAccess8(resource).write) return fail('forbiddenOrMissing')
        // The SDK sends If-Match; the existing resource is addressed by its canonical ID.
        // OpenCloud's ACL is the write boundary even if a caller bypasses the administration page.
        dispatched = true
        await port.webdav.putFileContents(space, {
          parentFolderId: ref.itemId,
          content,
          previousEntityTag: revision,
          overwrite: true
        })
        if (!current()) return fail('unauthenticated')
        const confirmed = await store.load()
        return confirmed.ok &&
          JSON.stringify(confirmed.value.policy) === JSON.stringify(parsePolicy(policy))
          ? confirmed
          : fail('timeout')
      } catch (error) {
        const category = catalogError(error)
        return fail(
          current()
            ? dispatched && category === 'unknown'
              ? 'timeout'
              : category
            : 'unauthenticated'
        )
      } finally {
        saving = false
      }
    }
  }
  return store
}
