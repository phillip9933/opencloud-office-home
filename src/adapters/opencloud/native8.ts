import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import type { WebDAV } from '@opencloud-eu/web-client/webdav'
import {
  fail,
  ok,
  refKey,
  type CreationRequest,
  type FileRecord,
  type FileRef,
  type OfficeServices,
  type Preview,
  type Result
} from '../../contracts/office'
import { createRecentStore } from '../../preferences/recents'
import { createViewPreferenceStore } from '../../preferences/view'
import { folderTemplates } from '../../services/templates'
import {
  createCatalog8,
  catalogError,
  normalizeReadMetadata,
  opaqueSegment,
  type ReadPort8
} from './catalog8'
import { createProviderCapabilities8, type ProviderPort8 } from './providers8'
import { nativeAccess8 } from './access8'
import { canonicalRootDrives8 } from './roots8'
import { defaultPolicy, policyApplications, type OfficePolicy } from '../../administration/policy'
import type { Administration } from '../../administration/store'

export interface NativeResource8 {
  space: SpaceResource
  resource: Resource
  file: FileRecord
}
export interface NativePort8 extends ReadPort8, ProviderPort8 {
  webdav: ReadPort8['webdav'] & Pick<WebDAV, 'copyFiles' | 'getPathForFileId'>
  // Host-authenticated request and native routes; no credential values enter this adapter.
  requestNew(url: string): Promise<{ status: number }>
  open(item: NativeResource8, mode: 'view' | 'edit'): Promise<boolean>
  files(item: NativeResource8, sharing: boolean): Promise<boolean>
  download(item: NativeResource8): Promise<void>
  preview(item: NativeResource8, signal: AbortSignal): Promise<string | undefined>
}
interface NativeOptions {
  instance: string
  user: string
  session: () => string | undefined
  storage?: Storage
  templateFolder?: FileRef
  policy?: OfficePolicy
  administration?: Administration
  filters: OfficeServices['filters']
}

function mutationError(error: unknown) {
  const known = catalogError(error)
  if (known !== 'unknown') return known
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined
  if (status === 409 || status === 412) return 'conflict'
  if (status === 507) return 'quotaExceeded'
  // An unclassified failure after dispatch might still have created the file. Never retry it.
  return 'timeout'
}
function fullPath(parent: string, name: string) {
  return `${parent.replace(/\/$/, '')}/${name}`
}

/** DEV-LIMIT(DL-001): native test integration; acceptance and received-share coverage remain open. */
export function createNativeServices8(port: NativePort8, options: NativeOptions) {
  const initialSession = options.session()
  const session = () =>
    !disposed && options.session() === initialSession ? initialSession : undefined
  let disposed = false
  const policy = options.policy ?? defaultPolicy()
  const applications = policyApplications(policy)
  const catalog = createCatalog8(
    { ...port, drives: canonicalRootDrives8(port) },
    session,
    nativeAccess8,
    applications
  )
  const capabilities = createProviderCapabilities8(port, applications, policy.creationFormats)
  const pendingNames = new Set<string>()
  const previewUrls = new Set<string>()
  const abort = new AbortController()

  async function read(ref: FileRef): Promise<Result<NativeResource8>> {
    if (!session()) return fail('unauthenticated')
    if (!opaqueSegment(ref.spaceId) || !opaqueSegment(ref.itemId)) return fail('forbiddenOrMissing')
    const space = catalog.space(ref.spaceId)
    if (!space) return fail('forbiddenOrMissing')
    try {
      const resource = await port.webdav.getFileInfo(
        space,
        { fileId: ref.itemId },
        { signal: abort.signal, extraProps: ['d:creationdate'] }
      )
      if (!session()) return fail('unauthenticated')
      const result = normalizeReadMetadata(space.id, resource)
      if (!result.ok) return result
      if (refKey(result.value.ref) !== refKey(ref)) return fail('forbiddenOrMissing')
      result.value.access = nativeAccess8(resource)
      if (!result.value.access.read) return fail('forbiddenOrMissing')
      return ok({ space, resource, file: result.value })
    } catch (error) {
      return fail(session() ? catalogError(error) : 'unauthenticated')
    }
  }

  async function create(input: CreationRequest, source?: FileRef): Promise<Result<FileRecord>> {
    if (!session()) return fail('unauthenticated')
    const lock = `${refKey(input.destination)}:${input.name.toLowerCase()}`
    if (pendingNames.has(lock)) return fail('conflict')
    if (
      !input.name.trim() ||
      input.name.length > 255 ||
      /[/\\\u0000-\u001f\u007f]/.test(input.name) ||
      !input.name.toLowerCase().endsWith(`.${input.format.extension}`)
    )
      return fail('invalidName')
    pendingNames.add(lock)
    let dispatched = false
    let acknowledged = false
    try {
      const destination = await read(input.destination)
      if (!destination.ok) return destination
      if (!destination.value.file.access.createChild) return fail('forbiddenOrMissing')
      const formats = await capabilities.creationFormats(input.kind)
      if (!formats.ok) return formats
      if (
        !formats.value.some(
          (f) => f.extension === input.format.extension && f.mimeType === input.format.mimeType
        )
      )
        return fail('unsupportedType')
      // ID-addressed DAV hrefs do not necessarily carry a space-relative folder path.
      // Resolve it through the native metadata endpoint, then verify that path still names
      // the selected writable folder before any mutation (including a concurrent move).
      const parentPath: unknown = await port.webdav.getPathForFileId(input.destination.itemId, {
        signal: abort.signal
      })
      if (
        typeof parentPath !== 'string' ||
        !parentPath.startsWith('/') ||
        parentPath.length > 4096 ||
        /[\\\u0000-\u001f\u007f]/.test(parentPath) ||
        parentPath.split('/').some((part) => part === '.' || part === '..')
      )
        return fail('forbiddenOrMissing')
      const parent = await port.webdav.getFileInfo(
        destination.value.space,
        { path: parentPath },
        { signal: abort.signal }
      )
      if (!session()) return fail('unauthenticated')
      if (
        parent.fileId !== input.destination.itemId ||
        !parent.isFolder ||
        !nativeAccess8(parent).createChild
      )
        return fail('forbiddenOrMissing')
      const path = fullPath(parentPath, input.name)
      // Refuse pre-existing names; COPY additionally uses Overwrite:F. The app-provider remains
      // authoritative for a concurrent blank-name collision (verified live before release).
      try {
        await port.webdav.getFileInfo(destination.value.space, { path }, { signal: abort.signal })
        return fail('conflict')
      } catch (error) {
        if (catalogError(error) !== 'forbiddenOrMissing' || !isNotFound(error)) throw error
      }
      if (!session()) return fail('unauthenticated')
      if (source) {
        const original = await read(source)
        if (!original.ok) return original
        // DEV-LIMIT(DL-006): ODF template containers need native editor conversion, never rename.
        if (
          original.value.file.kind !== 'file' ||
          original.value.file.mimeType !== input.format.mimeType ||
          !original.value.file.name.toLowerCase().endsWith(`.${input.format.extension}`)
        )
          return fail('unsupportedType')
        if (!session()) return fail('unauthenticated')
        dispatched = true
        const copied = await port.webdav.copyFiles(
          original.value.space,
          { fileId: source.itemId },
          destination.value.space,
          { parentFolderId: input.destination.itemId, name: input.name },
          { overwrite: false }
        )
        if (copied.status !== 201) return fail('timeout')
      } else {
        const capability = port.capabilities.filesAppProviders[0]
        if (!capability?.new_url) return fail('providerNotConfigured')
        const endpoint = new URL(capability.new_url, options.instance)
        if (
          endpoint.origin !== new URL(options.instance).origin ||
          endpoint.username ||
          endpoint.password
        )
          return fail('providerNotConfigured')
        endpoint.searchParams.set('parent_container_id', input.destination.itemId)
        endpoint.searchParams.set('filename', input.name)
        dispatched = true
        const response = await port.requestNew(endpoint.href)
        console.info('Office creation response', JSON.stringify({ status: response.status }))
        if (response.status !== 200) throw { status: response.status }
      }
      acknowledged = true
      if (!session()) return fail('unauthenticated')
      const resource = await port.webdav.getFileInfo(destination.value.space, { path })
      if (!session()) return fail('unauthenticated')
      const result = normalizeReadMetadata(destination.value.space.id, resource)
      console.info(
        'Office creation resolution',
        JSON.stringify({
          normalized: result.ok,
          nameMatches: result.ok && result.value.name === input.name,
          mimeMatches: result.ok && result.value.mimeType === input.format.mimeType,
          mimePresent: !!resource.mimeType,
          empty: String(resource.size) === '0'
        })
      )
      if (!result.ok) return fail('timeout')
      if (result.value.name !== input.name || result.value.mimeType !== input.format.mimeType)
        return fail('timeout')
      result.value.access = nativeAccess8(resource)
      return result
    } catch (error) {
      console.info(
        'Office creation failure',
        JSON.stringify({ acknowledged, dispatched, category: catalogError(error) })
      )
      return fail(
        acknowledged ? 'timeout' : dispatched ? mutationError(error) : catalogError(error)
      )
    } finally {
      pendingNames.delete(lock)
    }
  }

  const services: OfficeServices = {
    mode: 'native',
    policy,
    applications,
    administration: options.administration,
    templateFolderDefault: options.templateFolder,
    catalog,
    capabilities,
    filters: options.filters,
    recents: createRecentStore(options, options.storage),
    viewPreferences: createViewPreferenceStore(options, options.storage),
    creation: {
      blank: (input) => create(input),
      fromTemplate: (input) => create(input, input.template.source)
    },
    templates(kind, selectedFolder) {
      const folder = selectedFolder ?? options.templateFolder
      if (!folder) return Promise.resolve(ok([]))
      return folderTemplates(catalog, folder, kind, abort.signal, applications)
    },
    editor: {
      async open(input) {
        const item = await read(input.file)
        if (!item.ok) return item
        if (input.mode === 'edit' && !item.value.file.access.write)
          return fail('forbiddenOrMissing')
        try {
          if (!session()) return fail('unauthenticated')
          const accepted = await port.open(item.value, input.mode)
          if (!session()) return fail('unauthenticated')
          return accepted ? ok({ status: 'launchAccepted' }) : fail('editorUnavailable')
        } catch (error) {
          return fail(catalogError(error))
        }
      }
    },
    actions: {
      showInFiles: (file) => files(file.ref, false),
      share: (file) => files(file.ref, true),
      async download(file) {
        const item = await read(file.ref)
        if (!item.ok) return item
        try {
          if (!session()) return fail('unauthenticated')
          await port.download(item.value)
          return session() ? ok(undefined) : fail('unauthenticated')
        } catch (error) {
          return fail(catalogError(error))
        }
      }
    },
    async preview(ref, signal): Promise<Result<Preview>> {
      const item = await read(ref)
      if (!item.ok) return item
      try {
        if (!session()) return fail('unauthenticated')
        const url = await port.preview(item.value, signal)
        if (!url) return fail('unsupportedType')
        if (!url.startsWith('blob:')) return fail('unsupportedType')
        if (!session() || signal.aborted) {
          URL.revokeObjectURL(url)
          return fail('cancelled')
        }
        previewUrls.add(url)
        return ok({
          url,
          release() {
            previewUrls.delete(url)
            URL.revokeObjectURL(url)
          }
        })
      } catch (error) {
        return fail(catalogError(error))
      }
    }
  }
  async function files(ref: FileRef, sharing: boolean): Promise<Result<void>> {
    const item = await read(ref)
    if (!item.ok) return item
    try {
      if (!session()) return fail('unauthenticated')
      return (await port.files(item.value, sharing)) ? ok(undefined) : fail('editorUnavailable')
    } catch (error) {
      return fail(catalogError(error))
    }
  }
  return {
    services,
    dispose() {
      disposed = true
      abort.abort()
      catalog.dispose()
      for (const url of previewUrls) URL.revokeObjectURL(url)
      previewUrls.clear()
    }
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('statusCode' in error && error.statusCode === 404) return true
  if ('status' in error && error.status === 404) return true
  if (
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    error.response.status === 404
  )
    return true
  return false
}
