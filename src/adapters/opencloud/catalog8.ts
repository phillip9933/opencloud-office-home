import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import type { Graph } from '@opencloud-eu/web-client/graph'
import type { WebDAV } from '@opencloud-eu/web-client/webdav'
import { belongsTo } from '../../app/registry'
import {
  fail,
  ok,
  refKey,
  type AppError,
  type FileCatalog,
  type FileRecord,
  type Result
} from '../../contracts/office'

// These method types come from the installed 8.0.0 SDK, not a proposed REST schema.
export interface ReadPort8 {
  drives: Pick<Graph['drives'], 'listMyDrives'>
  webdav: Pick<WebDAV, 'listFiles' | 'getFileInfo'>
}

function record(value: unknown): Record<string, unknown> | undefined {
  // The object check establishes the boundary before optional SDK error fields are inspected.
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined
}

function opaqueSegment(value: unknown): value is string {
  // The SDK accepts a bare ID, not an arbitrary path or an already encoded URL.
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    value !== '.' &&
    value !== '..' &&
    !/[/\\?#%]/.test(value) &&
    !Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
}

export function catalogError(error: unknown): AppError {
  const details = record(error)
  if (details?.name === 'AbortError' || details?.code === 'ERR_CANCELED') return 'cancelled'
  const status = record(details?.response)?.status ?? details?.statusCode ?? details?.status
  if (status === 401) return 'unauthenticated'
  if (status === 403 || status === 404) return 'forbiddenOrMissing'
  if (status === 408 || status === 504 || details?.code === 'ECONNABORTED') return 'timeout'
  if (details?.code === 'ERR_NETWORK') return 'network'
  return 'unknown'
}

export function normalizeReadMetadata(spaceId: string, resource: Resource): Result<FileRecord> {
  if (
    !resource ||
    !opaqueSegment(resource.fileId) ||
    typeof resource.name !== 'string' ||
    !resource.name ||
    resource.name.length > 1024 ||
    typeof resource.path !== 'string' ||
    resource.path.length > 4096 ||
    typeof resource.isFolder !== 'boolean'
  )
    return fail('unknown')
  // Share aliases need their native resolution context; a path is not a canonical file identity.
  if (resource.remoteItemId || resource.remoteItemPath) return fail('forbiddenOrMissing')
  return ok({
    ref: { spaceId, itemId: resource.fileId },
    name: resource.name,
    kind: resource.isFolder ? 'folder' : 'file',
    path: resource.path,
    ...(typeof resource.mimeType === 'string' ? { mimeType: resource.mimeType } : {}),
    // A successful authenticated metadata response permits metadata display only.
    // It cannot authorize content access, editing or creation; the gateway stays unavailable.
    access: { read: true, write: false, createChild: false }
  })
}

/**
 * DEV-LIMIT(DL-003): unconnected, read-only candidate for personal/project spaces.
 * getSessionKey must come from the native auth lifecycle and include instance,
 * account and authentication generation. No cookies/tokens are accepted here.
 */
export function createCatalog8(
  port: ReadPort8,
  getSessionKey: () => string | undefined
): FileCatalog & { dispose(): void } {
  const spaces = new Map<string, SpaceResource>()
  let session: string | undefined
  let generation = 0
  let disposed = false

  function currentSession() {
    const key = disposed ? undefined : getSessionKey()
    if (key !== session) {
      spaces.clear()
      generation++
      session = key
    }
    return key
  }
  function interrupted(key: string, signal?: AbortSignal): AppError | undefined {
    if (currentSession() !== key) return 'unauthenticated'
    if (signal?.aborted) return 'cancelled'
  }
  return {
    dispose() {
      disposed = true
      spaces.clear()
      generation++
      session = undefined
    },
    async listSpaces(signal) {
      const key = currentSession()
      if (!key) return fail('unauthenticated')
      if (signal.aborted) return fail('cancelled')
      const request = ++generation
      spaces.clear()
      try {
        const found = await port.drives.listMyDrives(undefined, { signal })
        const stopped = interrupted(key, signal)
        if (stopped) return fail(stopped)
        if (request !== generation) return fail('cancelled')
        const refreshed = new Map<string, SpaceResource>()
        const available = []
        for (const space of found) {
          if (space.disabled || !['personal', 'project'].includes(space.driveType)) continue
          if (
            !opaqueSegment(space.id) ||
            typeof space.name !== 'string' ||
            !space.name ||
            !opaqueSegment(space.root?.id)
          )
            return fail('unknown')
          refreshed.set(space.id, space)
          available.push({
            id: space.id,
            name: space.name,
            root: { spaceId: space.id, itemId: space.root.id }
          })
        }
        spaces.clear()
        for (const [id, space] of refreshed) spaces.set(id, space)
        return ok(available)
      } catch (error) {
        const stopped = interrupted(key, signal)
        if (request === generation) spaces.clear()
        return fail(stopped ?? catalogError(error))
      }
    },
    async list(query) {
      const key = currentSession()
      if (!key) return fail('unauthenticated')
      if (query.signal.aborted) return fail('cancelled')
      if (!opaqueSegment(query.folder.itemId) || !opaqueSegment(query.folder.spaceId))
        return fail('forbiddenOrMissing')
      // Never convert unsupported search or cursors into a misleading successful folder subset.
      if (query.text.trim()) return fail('searchUnavailable')
      if (query.cursor !== undefined) return fail('paginationUnavailable')
      const space = spaces.get(query.folder.spaceId)
      if (!space) return fail('forbiddenOrMissing')
      try {
        const page = await port.webdav.listFiles(
          space,
          { fileId: query.folder.itemId },
          { depth: 1, signal: query.signal }
        )
        const stopped = interrupted(key, query.signal)
        if (stopped) return fail(stopped)
        const folder = normalizeReadMetadata(space.id, page.resource)
        if (
          !folder.ok ||
          folder.value.kind !== 'folder' ||
          refKey(folder.value.ref) !== refKey(query.folder)
        )
          return fail('forbiddenOrMissing')
        const items = new Map<string, FileRecord>()
        for (const resource of page.children ?? []) {
          const item = normalizeReadMetadata(space.id, resource)
          if (item.ok && belongsTo(item.value, query.kind))
            items.set(refKey(item.value.ref), item.value)
        }
        // This SDK result has no verified cursor/total/truncation contract. Keep the limit visible.
        return ok({ items: [...items.values()], partial: true })
      } catch (error) {
        return fail(interrupted(key, query.signal) ?? catalogError(error))
      }
    },
    async resolve(ref) {
      const key = currentSession()
      if (!key) return fail('unauthenticated')
      if (!opaqueSegment(ref.itemId) || !opaqueSegment(ref.spaceId))
        return fail('forbiddenOrMissing')
      const space = spaces.get(ref.spaceId)
      if (!space) return fail('forbiddenOrMissing')
      try {
        const resource = await port.webdav.getFileInfo(space, {
          fileId: ref.itemId
        })
        const stopped = interrupted(key)
        if (stopped) return fail(stopped)
        const item = normalizeReadMetadata(space.id, resource)
        if (!item.ok) return item
        return refKey(item.value.ref) === refKey(ref) ? item : fail('forbiddenOrMissing')
      } catch (error) {
        return fail(interrupted(key) ?? catalogError(error))
      }
    }
  }
}
