import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { describe, expect, it, vi } from 'vitest'
import {
  createCatalog8,
  catalogError,
  normalizeReadMetadata,
  type ReadPort8
} from '../../src/adapters/opencloud/catalog8'

function file(id = 'opaque:item', overrides: Partial<Resource> = {}): Resource {
  return {
    id,
    fileId: id,
    name: 'Report.odt',
    path: '/Report.odt',
    isFolder: false,
    mimeType: 'application/vnd.oasis.opendocument.text',
    ...overrides
  }
}
function space(id = 'opaque:space', overrides: Partial<SpaceResource> = {}): SpaceResource {
  return {
    id,
    fileId: 'opaque:root',
    name: 'Synthetic personal files',
    path: '/',
    isFolder: true,
    description: '',
    disabled: false,
    driveAlias: 'personal/synthetic',
    driveType: 'personal',
    root: { id: 'opaque:root' },
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
    getWebDavTrashUrl: () => 'https://cloud.example/trash',
    getDriveAliasAndItem: () => 'personal/synthetic',
    ...overrides
  }
}
function setup() {
  const personal = space()
  const root = file('opaque:root', {
    name: 'Personal',
    path: '/',
    isFolder: true
  })
  const port = {
    drives: {
      listMyDrives: vi.fn<ReadPort8['drives']['listMyDrives']>().mockResolvedValue([personal])
    },
    webdav: {
      listFiles: vi
        .fn<ReadPort8['webdav']['listFiles']>()
        .mockResolvedValue({ resource: root, children: [file()] }),
      getFileInfo: vi.fn<ReadPort8['webdav']['getFileInfo']>().mockResolvedValue(file())
    }
  }
  let session: string | undefined = 'instance-a/user-a/auth-1'
  const catalog = createCatalog8(port, () => session)
  const query = {
    folder: { spaceId: personal.id, itemId: root.fileId! },
    kind: 'docs' as const,
    text: '',
    signal: new AbortController().signal
  }
  return {
    personal,
    root,
    port,
    catalog,
    query,
    setSession(value?: string) {
      session = value
    }
  }
}

describe('8.x SDK catalog candidate', () => {
  it('rejects path syntax in opaque references before sending any SDK request', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    for (const itemId of ['../other', 'encoded%2fpath', 'id?query', 'id#fragment', '']) {
      expect(await test.catalog.resolve({ spaceId: test.personal.id, itemId })).toEqual({
        ok: false,
        error: 'forbiddenOrMissing'
      })
    }
    expect(test.port.webdav.getFileInfo).not.toHaveBeenCalled()
  })
  it('clears discovered roots when a later refresh contains malformed space metadata', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    test.port.drives.listMyDrives.mockResolvedValue([
      test.personal,
      space('malformed', { root: {} })
    ])
    expect(await test.catalog.listSpaces(test.query.signal)).toEqual({
      ok: false,
      error: 'unknown'
    })
    expect(
      await test.catalog.resolve({
        spaceId: test.personal.id,
        itemId: 'opaque:item'
      })
    ).toEqual({ ok: false, error: 'forbiddenOrMissing' })
    expect(test.port.webdav.getFileInfo).not.toHaveBeenCalled()
  })
  it('uses normal-user space discovery, excludes special roots and disabled spaces, and keeps opaque IDs', async () => {
    const test = setup()
    test.port.drives.listMyDrives.mockResolvedValue([
      test.personal,
      space('project', { driveType: 'project' }),
      space('disabled', { disabled: true }),
      space('mount', { driveType: 'mountpoint' })
    ])
    const signal = new AbortController().signal
    const result = await test.catalog.listSpaces(signal)
    expect(result.ok && result.value.map((s) => s.id)).toEqual(['opaque:space', 'project'])
    expect(result.ok && result.value[0]!.root.itemId).toBe('opaque:root')
    expect(test.port.drives.listMyDrives).toHaveBeenCalledWith(undefined, {
      signal
    })
  })
  it('lists one folder depth with cancellation, family filtering and explicit partial status; never grants mutations', async () => {
    const test = setup()
    test.port.webdav.listFiles.mockResolvedValue({
      resource: test.root,
      children: [
        file(),
        file('sheet', {
          name: 'Budget.ods',
          mimeType: 'application/vnd.oasis.opendocument.spreadsheet'
        }),
        file('folder', { name: 'Nested', isFolder: true }),
        file('alias', { remoteItemId: 'unresolved-share' })
      ]
    })
    await test.catalog.listSpaces(test.query.signal)
    const result = await test.catalog.list(test.query)
    expect(result.ok && result.value.items.map((r) => r.name)).toEqual(['Report.odt', 'Nested'])
    expect(result.ok && result.value.partial).toBe(true)
    expect(
      result.ok && result.value.items.every((r) => !r.access.write && !r.access.createChild)
    ).toBe(true)
    expect(test.port.webdav.listFiles).toHaveBeenCalledWith(
      test.personal,
      { fileId: 'opaque:root' },
      { depth: 1, signal: test.query.signal }
    )
  })
  it('does not substitute recursive crawling or an incomplete folder listing for unsupported search/pagination', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    expect(await test.catalog.list({ ...test.query, text: 'private query' })).toEqual({
      ok: false,
      error: 'searchUnavailable'
    })
    expect(await test.catalog.list({ ...test.query, cursor: 'opaque-cursor' })).toEqual({
      ok: false,
      error: 'paginationUnavailable'
    })
    expect(test.port.webdav.listFiles).not.toHaveBeenCalled()
  })
  it('discards in-flight metadata after account change and clears previously discovered roots', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    let finish!: (resource: Resource) => void
    test.port.webdav.getFileInfo.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const pending = test.catalog.resolve({
      spaceId: 'opaque:space',
      itemId: 'opaque:item'
    })
    test.setSession('instance-a/user-b/auth-2')
    finish(file())
    expect(await pending).toEqual({ ok: false, error: 'unauthenticated' })
    expect(
      await test.catalog.resolve({
        spaceId: 'opaque:space',
        itemId: 'opaque:item'
      })
    ).toEqual({ ok: false, error: 'forbiddenOrMissing' })
    expect(test.port.webdav.getFileInfo).toHaveBeenCalledTimes(1)
  })
  it('rejects cancellation before/after a source ignoring abort, and refuses use after disposal', async () => {
    const test = setup()
    const controller = new AbortController()
    test.port.drives.listMyDrives.mockImplementation(() => {
      controller.abort()
      return Promise.resolve([test.personal])
    })
    expect(await test.catalog.listSpaces(controller.signal)).toEqual({
      ok: false,
      error: 'cancelled'
    })
    test.catalog.dispose()
    expect(await test.catalog.listSpaces(test.query.signal)).toEqual({
      ok: false,
      error: 'unauthenticated'
    })
  })
  it('rejects a resolved identity mismatch and never exposes a raw forbidden response', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    test.port.webdav.getFileInfo.mockResolvedValue(file('different-resource'))
    expect(
      await test.catalog.resolve({
        spaceId: test.personal.id,
        itemId: 'requested'
      })
    ).toEqual({ ok: false, error: 'forbiddenOrMissing' })
    test.port.webdav.getFileInfo.mockRejectedValue({
      response: { status: 403, data: 'sensitive upstream details' }
    })
    expect(
      await test.catalog.resolve({
        spaceId: test.personal.id,
        itemId: 'requested'
      })
    ).toEqual({ ok: false, error: 'forbiddenOrMissing' })
  })
  it('rejects missing IDs and unresolved share aliases rather than fabricating identity', () => {
    expect(normalizeReadMetadata('space', file('id', { fileId: undefined })).ok).toBe(false)
    expect(normalizeReadMetadata('space', file('id', { remoteItemPath: '/share-alias' })).ok).toBe(
      false
    )
  })
  it.each([
    [{ statusCode: 401 }, 'unauthenticated'],
    [{ response: { status: 404 } }, 'forbiddenOrMissing'],
    [{ statusCode: 403 }, 'forbiddenOrMissing'],
    [{ code: 'ERR_NETWORK' }, 'network'],
    [{ name: 'AbortError' }, 'cancelled'],
    [{ status: 504 }, 'timeout']
  ])('maps SDK failure categories without raw responses', (error, expected) => {
    expect(catalogError(error)).toBe(expected)
  })
})
