import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { describe, expect, it, vi } from 'vitest'
import { createNativeServices8, type NativePort8 } from '../../src/adapters/opencloud/native8'
import { openNativeEditor8 } from '../../src/adapters/opencloud/editorRoute8'
import { nativeAccess8 } from '../../src/adapters/opencloud/access8'
import { officeApps } from '../../src/app/registry'

const format = officeApps[0]!.formats[0]!
const rootRef = { spaceId: 'space', itemId: 'root' }
const input = { kind: 'docs' as const, name: 'New.odt', destination: rootRef, format }
function file(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'file',
    fileId: 'file',
    storageId: 'space',
    name: 'Template.odt',
    path: '/Template.odt',
    isFolder: false,
    mimeType: format.mimeType,
    permissions: 'WCK',
    canDownload: () => true,
    canCreate: () => true,
    ...overrides
  }
}
function setup() {
  const root = file({ id: 'root', fileId: 'root', name: 'Personal', path: '/', isFolder: true })
  const space: SpaceResource = {
    ...root,
    id: 'space',
    description: '',
    disabled: false,
    driveAlias: 'personal/test',
    driveType: 'personal',
    root: { id: 'root' },
    spaceQuota: {},
    spaceImageData: {},
    spaceReadmeData: {},
    hasTrashedItems: false,
    webDavTrashPath: '',
    canDisable: () => false,
    canEditDescription: () => false,
    canEditImage: () => false,
    canEditReadme: () => false,
    canRestore: () => false,
    canDeleteFromTrashBin: () => false,
    canRestoreFromTrashbin: () => false,
    isOwner: () => false,
    getWebDavUrl: () => 'https://cloud.example/dav',
    getWebDavTrashUrl: () => '',
    getDriveAliasAndItem: () => 'personal/test'
  }
  let created = false
  let session: string | undefined = 'user-a/session-1'
  const port = {
    drives: {
      listMyDrives: vi.fn<NativePort8['drives']['listMyDrives']>().mockResolvedValue([space])
    },
    tags: { listTags: vi.fn<NativePort8['tags']['listTags']>().mockResolvedValue([]) },
    activities: {
      listActivities: vi.fn<NativePort8['activities']['listActivities']>().mockResolvedValue([])
    },
    webdav: {
      getFileInfo: vi
        .fn<NativePort8['webdav']['getFileInfo']>()
        .mockImplementation((_space, ref) => {
          if (ref?.fileId === 'root' || ref?.path === '/') return Promise.resolve(root)
          if (ref?.path === '/New.odt') {
            if (!created) return Promise.reject({ statusCode: 404 })
            return Promise.resolve(file({ name: 'New.odt', path: '/New.odt', fileId: 'new' }))
          }
          return Promise.resolve(file())
        }),
      listFiles: vi
        .fn<NativePort8['webdav']['listFiles']>()
        .mockResolvedValue({ resource: root, children: [] }),
      search: vi
        .fn<NativePort8['webdav']['search']>()
        .mockResolvedValue({ resources: [], totalResults: 0 }),
      copyFiles: vi.fn<NativePort8['webdav']['copyFiles']>().mockImplementation(() => {
        created = true
        return Promise.resolve({
          status: 201,
          body: undefined,
          result: new Response(null, { status: 201 })
        })
      })
    },
    capabilities: { filesAppProviders: [{ enabled: true, new_url: '/app/new' }] },
    appProviders: {
      mimeTypes: [
        {
          ext: 'odt',
          mime_type: format.mimeType,
          allow_creation: true,
          app_providers: [{ name: 'Test editor', icon: '', secure_view: false }]
        }
      ]
    },
    requestNew: vi.fn<NativePort8['requestNew']>().mockImplementation(() => {
      created = true
      return Promise.resolve({ status: 200 })
    }),
    open: vi.fn<NativePort8['open']>().mockResolvedValue(true),
    files: vi.fn<NativePort8['files']>().mockResolvedValue(true),
    download: vi.fn<NativePort8['download']>().mockResolvedValue(),
    preview: vi.fn<NativePort8['preview']>().mockResolvedValue(undefined)
  } satisfies NativePort8
  const native = createNativeServices8(port, {
    instance: 'https://cloud.example',
    user: 'user-a',
    session: () => session,
    filters: { favorites: false, tags: false }
  })
  return {
    port,
    space,
    root,
    native,
    setSession(value?: string) {
      session = value
    },
    setCreated(value: boolean) {
      created = value
    },
    init: () => native.services.catalog.listSpaces(new AbortController().signal)
  }
}

describe('native SDK integration boundaries', () => {
  it('uses explicit DAV permissions and refuses vault or unknown access', () => {
    expect(nativeAccess8(file())).toEqual({ read: true, write: true, createChild: false })
    expect(nativeAccess8(file({ isFolder: true })).createChild).toBe(true)
    // Z grants permission-management capability; it is not an access-denied marker.
    for (const overrides of [
      { permissions: '' },
      { permissions: 'X', canDownload: () => false },
      { isInVault: true }
    ])
      expect(nativeAccess8(file(overrides))).toEqual({
        read: false,
        write: false,
        createChild: false
      })
  })
  it('keeps manager resources readable and writable when their DAV permissions contain Z', () => {
    expect(nativeAccess8(file({ permissions: 'RDNVWZP' }))).toEqual({
      read: true,
      write: true,
      createChild: false
    })
    expect(nativeAccess8(file({ permissions: 'RDNVCKZP', isFolder: true }))).toEqual({
      read: true,
      write: false,
      createChild: true
    })
  })
  it('uses the authorized DAV root identity when Graph supplies a different root ID', async () => {
    const t = setup()
    t.space.root.id = 'graph-drive-item-root'
    const spaces = await t.init()
    expect(spaces.ok && spaces.value[0]?.root).toEqual(rootRef)
    expect((await t.native.services.catalog.resolve(rootRef)).ok).toBe(true)
    expect(
      (
        await t.native.services.catalog.list({
          folder: rootRef,
          kind: 'docs',
          signal: new AbortController().signal
        })
      ).ok
    ).toBe(true)
    expect(t.space.root.id).toBe('graph-drive-item-root')
  })
  it('honors a native file handler before a generic external editor without fabricating URLs', async () => {
    const t = setup()
    const resource = file()
    const actions = {
      getAllOpenWithActions: () => [
        {
          name: 'editor-text-editor',
          icon: 'file-text',
          label: () => 'Text editor',
          isVisible: () => true,
          handler: () => {},
          route: () => ({ name: 'text-editor-main', query: { nativeContext: 'kept' } })
        }
      ]
    }
    const router = { push: vi.fn().mockResolvedValue(undefined) }
    const item = {
      space: t.space,
      resource,
      file: {
        ref: { spaceId: 'space', itemId: 'file' },
        name: 'Template.odt',
        kind: 'file' as const,
        access: { read: true, write: true, createChild: false }
      }
    }
    expect(await openNativeEditor8(actions, router, item, 'edit')).toBe(true)
    expect(router.push).toHaveBeenCalledWith({
      name: 'text-editor-main',
      query: { nativeContext: 'kept' }
    })
    router.push.mockClear()
    expect(await openNativeEditor8(actions, router, item, 'view')).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
    const external = {
      getAllOpenWithActions: () =>
        actions
          .getAllOpenWithActions()
          .map((action) => ({ ...action, name: 'editor-external-reference' }))
    }
    expect(await openNativeEditor8(external, router, item, 'view')).toBe(true)
    expect(router.push).toHaveBeenCalledWith({
      name: 'text-editor-main',
      query: { nativeContext: 'kept', view_mode: 'read' }
    })
  })
  it('creates a native office file and resolves its canonical identity', async () => {
    const t = setup()
    await t.init()
    const result = await t.native.services.creation.blank(input)
    expect(result.ok && result.value.ref).toEqual({ spaceId: 'space', itemId: 'new' })
    const url = new URL(t.port.requestNew.mock.calls[0]![0])
    expect(url.origin).toBe('https://cloud.example')
    expect(url.searchParams.get('parent_container_id')).toBe('root')
    expect(url.searchParams.get('filename')).toBe('New.odt')
  })
  it('refuses read-only destinations, existing names, invalid IDs and provider redirects before dispatch', async () => {
    const t = setup()
    await t.init()
    t.root.canCreate = () => false
    expect(await t.native.services.creation.blank(input)).toEqual({
      ok: false,
      error: 'forbiddenOrMissing'
    })
    t.root.canCreate = () => true
    t.setCreated(true)
    expect(await t.native.services.creation.blank(input)).toEqual({ ok: false, error: 'conflict' })
    t.setCreated(false)
    t.port.capabilities.filesAppProviders[0]!.new_url = 'https://other.example/new'
    expect(await t.native.services.creation.blank(input)).toEqual({
      ok: false,
      error: 'providerNotConfigured'
    })
    expect(
      await t.native.services.creation.blank({
        ...input,
        destination: { ...rootRef, itemId: '../private' }
      })
    ).toEqual({ ok: false, error: 'forbiddenOrMissing' })
    expect(t.port.requestNew).not.toHaveBeenCalled()
  })
  it('does not dispatch a second mutation while creation is pending', async () => {
    const t = setup()
    await t.init()
    let finish!: (value: { status: number }) => void
    t.port.requestNew.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = t.native.services.creation.blank(input)
    await vi.waitFor(() => expect(t.port.requestNew).toHaveBeenCalledOnce())
    expect(await t.native.services.creation.blank(input)).toEqual({ ok: false, error: 'conflict' })
    t.setCreated(true)
    finish({ status: 200 })
    await pending
    expect(t.port.requestNew).toHaveBeenCalledOnce()
  })
  it('copies ordinary templates without overwrite and refuses template-container renaming', async () => {
    const t = setup()
    await t.init()
    const template = {
      id: 'template',
      name: 'Template',
      kind: 'docs' as const,
      category: 'General',
      source: { spaceId: 'space', itemId: 'file' },
      format
    }
    expect((await t.native.services.creation.fromTemplate({ ...input, template })).ok).toBe(true)
    expect(t.port.webdav.copyFiles.mock.calls[0]![4]).toEqual({ overwrite: false })
    t.setCreated(false)
    const original = t.port.webdav.getFileInfo.getMockImplementation()!
    t.port.webdav.getFileInfo.mockImplementation((space, ref, options) =>
      ref?.fileId === 'file'
        ? Promise.resolve(
            file({
              name: 'Template.ott',
              mimeType: 'application/vnd.oasis.opendocument.text-template'
            })
          )
        : original(space, ref, options)
    )
    expect(await t.native.services.creation.fromTemplate({ ...input, template })).toEqual({
      ok: false,
      error: 'unsupportedType'
    })
    expect(t.port.webdav.copyFiles).toHaveBeenCalledOnce()
  })
  it('preserves explicit read-only launches and refuses all actions after account change', async () => {
    const t = setup()
    await t.init()
    const launch = {
      file: { spaceId: 'space', itemId: 'file' },
      mode: 'view' as const,
      returnTo: { kind: 'docs' as const, spaceId: 'space', folder: rootRef, trail: [], scroll: 0 }
    }
    expect((await t.native.services.editor.open(launch)).ok).toBe(true)
    expect(t.port.open.mock.calls[0]![1]).toBe('view')
    t.setSession('user-b/session-2')
    expect(await t.native.services.editor.open(launch)).toEqual({
      ok: false,
      error: 'unauthenticated'
    })
    expect(await t.native.services.creation.blank(input)).toEqual({
      ok: false,
      error: 'unauthenticated'
    })
    expect(t.port.open).toHaveBeenCalledOnce()
  })
  it('discards metadata returned after logout and never launches the editor', async () => {
    const t = setup()
    await t.init()
    t.port.webdav.getFileInfo.mockImplementation(() => {
      t.setSession()
      return Promise.resolve(file())
    })
    const result = await t.native.services.editor.open({
      file: { spaceId: 'space', itemId: 'file' },
      mode: 'edit',
      returnTo: { kind: 'docs', spaceId: 'space', folder: rootRef, trail: [], scroll: 0 }
    })
    expect(result).toEqual({ ok: false, error: 'unauthenticated' })
    expect(t.port.open).not.toHaveBeenCalled()
  })
  it('reports uncertain create results and does not retry the server request', async () => {
    const t = setup()
    await t.init()
    t.port.requestNew.mockRejectedValue({ code: 'ERR_NETWORK' })
    expect(await t.native.services.creation.blank(input)).toEqual({ ok: false, error: 'network' })
    expect(t.port.requestNew).toHaveBeenCalledOnce()
  })
  it('pauses retry when creation succeeded but result metadata cannot be read', async () => {
    const t = setup()
    await t.init()
    const original = t.port.webdav.getFileInfo.getMockImplementation()!
    t.port.webdav.getFileInfo.mockImplementation((space, ref, options) => {
      if (t.port.requestNew.mock.calls.length && ref?.path === '/New.odt')
        return Promise.reject({ statusCode: 404 })
      return original(space, ref, options)
    })
    expect(await t.native.services.creation.blank(input)).toEqual({ ok: false, error: 'timeout' })
    expect(t.port.requestNew).toHaveBeenCalledOnce()
  })
})
