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
  type OfficeKind,
  type Activity,
  type Page,
  type RecentFilter,
  type Result
} from '../../contracts/office'

// These method types come from the installed 8.x SDK, not a proposed REST schema.
export interface ReadPort8 {
  drives: Pick<Graph['drives'], 'listMyDrives'>
  tags: Pick<Graph['tags'], 'listTags'>
  activities: Pick<Graph['activities'], 'listActivities'>
  webdav: Pick<WebDAV, 'listFiles' | 'getFileInfo' | 'search'>
}

// OpenCloud 9.0.0 KQL: the natural-language date matches RECENT_CHANGE_DAYS, and the media
// types are the server's own groups (they also contain non-office types, filtered afterwards).
const RECENT_CHANGE_QUERY = 'mtime:"last 30 days"'
const MEDIA_TYPE: Record<OfficeKind, string> = {
  docs: 'document',
  sheets: 'spreadsheet',
  slides: 'presentation'
}
// The server ranks matches by score, not date, and truncates at its page size.
const SEARCH_LIMIT = 200
const MAX_ACTIVITY_LENGTH = 300
const MAX_TAGS = 100
const MAX_TAG_LENGTH = 100

function validTag(tag: unknown): tag is string {
  return typeof tag === 'string' && tag.trim() !== '' && tag.length <= MAX_TAG_LENGTH
}

// Tags are user text inside a KQL phrase. Ones containing quote or escape characters are not
// sent; the caller still filters by them locally, so they narrow results but never the query.
function filterClauses(filter: RecentFilter): string[] {
  const parts: string[] = []
  if (filter.favorites) parts.push('is:favorite')
  const tags = filter.tags.filter((tag) => validTag(tag) && !/["\\]/.test(tag))
  if (tags.length && tags.length === filter.tags.length)
    parts.push(`tag:(${tags.map((tag) => `"${tag}"`).join(' OR ')})`)
  return parts
}

function recentQuery(kind: OfficeKind, filter: RecentFilter): string {
  return [RECENT_CHANGE_QUERY, `mediatype:("${MEDIA_TYPE[kind]}")`, ...filterClauses(filter)].join(
    ' AND '
  )
}

// Activity messages are templates such as "{user} updated {resource}"; values become plain text.
export function activityText(activity: {
  template?: { message?: unknown; variables?: unknown }
  times?: { recordedTime?: unknown }
}): Activity | null {
  const message = activity.template?.message
  if (typeof message !== 'string' || !message) return null
  const variables = record(activity.template?.variables) ?? {}
  const text = message
    .replace(/\{(\w+)\}/g, (_match, name: string) => {
      const value = record(variables[name])
      const label = value?.displayName ?? value?.name
      return typeof label === 'string' ? label : ''
    })
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ACTIVITY_LENGTH)
  const at =
    typeof activity.times?.recordedTime === 'string' ? Date.parse(activity.times.recordedTime) : NaN
  return text ? { text, ...(Number.isFinite(at) ? { at } : {}) } : null
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

// Only https links are offered for copying; anything else is dropped rather than shown.
function privateLink(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined
  try {
    return new URL(value).protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

function modifiedAt(value: unknown): number | undefined {
  const time = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(time) ? time : undefined
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
    ...(modifiedAt(resource.mdate) !== undefined ? { modifiedAt: modifiedAt(resource.mdate) } : {}),
    ...(resource.starred === true ? { favorite: true } : {}),
    ...(resource.shareTypes?.length ? { shared: true } : {}),
    ...(resource.locked === true
      ? {
          lock:
            typeof resource.lockOwner === 'string' && resource.lockOwner
              ? { owner: resource.lockOwner.slice(0, 200) }
              : {}
        }
      : {}),
    ...(privateLink(resource.privateLink) ? { link: privateLink(resource.privateLink) } : {}),
    ...(Array.isArray(resource.tags) && resource.tags.length
      ? { tags: resource.tags.filter(validTag).slice(0, MAX_TAGS) }
      : {}),
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
  // Maps search hits to known spaces by storage ID, as Web does; shares mounted elsewhere
  // are skipped and reported as partial rather than guessed.
  async function searchHits(
    query: string,
    kind: OfficeKind,
    signal: AbortSignal
  ): Promise<Result<Page<FileRecord>>> {
    const key = currentSession()
    if (!key) return fail('unauthenticated')
    if (signal.aborted) return fail('cancelled')
    try {
      const found = await port.webdav.search(query, { searchLimit: SEARCH_LIMIT, signal })
      const stopped = interrupted(key, signal)
      if (stopped) return fail(stopped)
      const items = new Map<string, FileRecord>()
      let skipped = 0
      for (const resource of found.resources) {
        const space = typeof resource.storageId === 'string' && spaces.get(resource.storageId)
        const item = space ? normalizeReadMetadata(space.id, resource) : undefined
        if (!item?.ok || item.value.modifiedAt === undefined) {
          skipped++
          continue
        }
        // The server's media groups include non-office types such as plain text.
        if (item.value.kind === 'file' && belongsTo(item.value, kind))
          items.set(refKey(item.value.ref), item.value)
      }
      return ok({
        items: [...items.values()].sort((a, b) => b.modifiedAt! - a.modifiedAt!),
        partial:
          skipped > 0 ||
          typeof found.totalResults !== 'number' ||
          found.totalResults > found.resources.length
      })
    } catch (error) {
      return fail(interrupted(key, signal) ?? catalogError(error))
    }
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
      // Never convert an unsupported cursor into a misleading successful folder subset.
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
          if (item.ok && (query.kind === 'any' || belongsTo(item.value, query.kind)))
            items.set(refKey(item.value.ref), item.value)
        }
        // This SDK result has no verified cursor/total/truncation contract. Keep the limit visible.
        return ok({ items: [...items.values()], partial: true })
      } catch (error) {
        return fail(interrupted(key, query.signal) ?? catalogError(error))
      }
    },
    async listTags(signal) {
      const key = currentSession()
      if (!key) return fail('unauthenticated')
      try {
        const tags = await port.tags.listTags({ signal })
        const stopped = interrupted(key, signal)
        if (stopped) return fail(stopped)
        return ok([...new Set(tags.filter(validTag))].sort().slice(0, MAX_TAGS))
      } catch (error) {
        return fail(interrupted(key, signal) ?? catalogError(error))
      }
    },
    recentlyChanged(kind, signal, filter) {
      return searchHits(recentQuery(kind, filter), kind, signal)
    },
    async latestActivity(ref, signal) {
      const key = currentSession()
      if (!key) return fail('unauthenticated')
      if (!opaqueSegment(ref.itemId) || !spaces.has(ref.spaceId)) return fail('forbiddenOrMissing')
      try {
        // Same query shape as the Files activity panel in Web 8.2.1.
        const [latest] = await port.activities.listActivities(
          `itemid:${ref.itemId} AND limit:1 AND sort:desc`,
          { signal }
        )
        const stopped = interrupted(key, signal)
        if (stopped) return fail(stopped)
        return ok(latest ? activityText(latest) : null)
      } catch (error) {
        return fail(interrupted(key, signal) ?? catalogError(error))
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
