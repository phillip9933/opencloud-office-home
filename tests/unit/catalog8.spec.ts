import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { describe, expect, it, vi } from 'vitest'
import {
  activityText,
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
    tags: {
      listTags: vi.fn<ReadPort8['tags']['listTags']>().mockResolvedValue(['Finance'])
    },
    activities: {
      listActivities: vi.fn<ReadPort8['activities']['listActivities']>().mockResolvedValue([])
    },
    webdav: {
      listFiles: vi
        .fn<ReadPort8['webdav']['listFiles']>()
        .mockResolvedValue({ resource: root, children: [file()] }),
      getFileInfo: vi.fn<ReadPort8['webdav']['getFileInfo']>().mockResolvedValue(file()),
      search: vi
        .fn<ReadPort8['webdav']['search']>()
        .mockResolvedValue({ resources: [], totalResults: 0 })
    }
  }
  let session: string | undefined = 'instance-a/user-a/auth-1'
  const catalog = createCatalog8(port, () => session)
  const query = {
    folder: { spaceId: personal.id, itemId: root.fileId! },
    kind: 'docs' as const,
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

const noFilter = { favorites: false, tags: [] }

describe('8.x SDK catalog candidate', () => {
  it('keeps creation date independent from modification and exposes only supplied owner metadata', () => {
    const dated = normalizeReadMetadata(
      's',
      file('t', {
        mdate: '2026-11-10',
        extraProps: { 'd:creationdate': '2025-01-02T03:04:05Z' },
        owner: { displayName: 'Synthetic owner' }
      })
    )
    expect(dated).toMatchObject({
      ok: true,
      value: {
        owner: 'Synthetic owner',
        createdAt: Date.parse('2025-01-02T03:04:05Z'),
        modifiedAt: Date.parse('2026-11-10')
      }
    })
    const unknown = normalizeReadMetadata('s', file('t', { mdate: '2026-11-10' }))
    expect(unknown.ok && unknown.value.createdAt).toBeUndefined()
    expect(unknown.ok && unknown.value.owner).toBeUndefined()
  })
  it('puts the personal space first for a new home without changing explicit folder selection', async () => {
    const test = setup()
    test.port.drives.listMyDrives.mockResolvedValue([
      space('project', { driveType: 'project' }),
      test.personal
    ])
    const result = await test.catalog.listSpaces(test.query.signal)
    expect(result.ok && result.value.map((value) => value.id)).toEqual(['opaque:space', 'project'])
  })
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
      { path: '/' },
      { depth: 1, signal: test.query.signal, extraProps: ['d:creationdate'] }
    )
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
    ).toEqual({ ok: false, error: 'unknown' })
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
  it('finds family files changed in the last 30 days newest first, mapped by storage ID', async () => {
    const test = setup()
    const hit = (id: string, overrides: Partial<Resource>) =>
      ({ ...file(id), storageId: test.personal.id, highlights: '', ...overrides }) as const
    test.port.webdav.search.mockResolvedValue({
      resources: [
        hit('older', { name: 'Older.odt', mdate: 'Mon, 02 Nov 2026 09:00:00 GMT' }),
        hit('newer', { name: 'Newer.docx', mimeType: undefined, mdate: '2026-11-10T08:00:00Z' }),
        hit('notes', { name: 'notes.txt', mimeType: 'text/plain', mdate: '2026-11-10T09:00:00Z' })
      ],
      totalResults: 3
    })
    await test.catalog.listSpaces(test.query.signal)
    const result = await test.catalog.recentlyChanged('docs', test.query.signal, noFilter)
    expect(result.ok && result.value.items.map((r) => [r.name, r.modifiedAt])).toEqual([
      ['Newer.docx', Date.parse('2026-11-10T08:00:00Z')],
      ['Older.odt', Date.parse('2026-11-02T09:00:00Z')]
    ])
    // Plain text is an expected exclusion from the server's "document" group, not partiality.
    expect(result.ok && result.value.partial).toBe(false)
    expect(result.ok && result.value.items.every((r) => !r.access.write)).toBe(true)
    expect(test.port.webdav.search).toHaveBeenCalledWith(
      'mtime:"last 30 days" AND mediatype:("document")',
      { searchLimit: 200, signal: test.query.signal }
    )
  })
  it('narrows recent changes by favorites and tags, and keeps unsafe tag text out of the query', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    await test.catalog.recentlyChanged('sheets', test.query.signal, {
      favorites: true,
      tags: ['Finance', 'Q4 plan']
    })
    expect(test.port.webdav.search).toHaveBeenLastCalledWith(
      'mtime:"last 30 days" AND mediatype:("spreadsheet") AND is:favorite AND tag:("Finance" OR "Q4 plan")',
      expect.anything()
    )
    await test.catalog.recentlyChanged('sheets', test.query.signal, {
      favorites: false,
      tags: ['Finance', 'say "hi"']
    })
    expect(test.port.webdav.search).toHaveBeenLastCalledWith(
      'mtime:"last 30 days" AND mediatype:("spreadsheet")',
      expect.anything()
    )
  })
  it('renders the latest activity as plain text and asks only for one entry', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    test.port.activities.listActivities.mockResolvedValue([
      {
        id: 'a',
        times: { recordedTime: '2026-11-10T08:00:00Z' },
        template: {
          message: '{user} updated {resource}',
          variables: { user: { displayName: '<b>Ana</b>' }, resource: { name: 'Report.odt' } }
        }
      }
    ])
    expect(
      await test.catalog.latestActivity(
        { spaceId: test.personal.id, itemId: 'opaque:item' },
        test.query.signal
      )
    ).toEqual({
      ok: true,
      value: { text: '<b>Ana</b> updated Report.odt', at: Date.parse('2026-11-10T08:00:00Z') }
    })
    expect(test.port.activities.listActivities).toHaveBeenCalledWith(
      'itemid:opaque:item AND limit:1 AND sort:desc',
      { signal: test.query.signal }
    )
    expect(activityText({ template: { message: '' } })).toBeNull()
    expect(
      await test.catalog.latestActivity({ spaceId: 'unknown', itemId: 'x' }, test.query.signal)
    ).toEqual({ ok: false, error: 'forbiddenOrMissing' })
  })
  it('keeps only https private links and reports sharing and locks', () => {
    expect(
      normalizeReadMetadata(
        's',
        file('t', {
          privateLink: 'https://cloud.example/f/t',
          shareTypes: [0],
          locked: true,
          lockOwner: 'Ana'
        })
      )
    ).toMatchObject({
      ok: true,
      value: { link: 'https://cloud.example/f/t', shared: true, lock: { owner: 'Ana' } }
    })
    const unsafe = normalizeReadMetadata('s', file('t', { privateLink: 'javascript:alert(1)' }))
    expect(unsafe.ok && unsafe.value).not.toHaveProperty('link')
  })
  it('carries favorite and tag metadata and lists tags from the server, bounded and sorted', async () => {
    const test = setup()
    expect(
      normalizeReadMetadata('s', file('t', { starred: true, tags: ['Q4', '', 'Finance'] }))
    ).toMatchObject({ ok: true, value: { favorite: true, tags: ['Q4', 'Finance'] } })
    test.port.tags.listTags.mockResolvedValue(['Q4', 'Finance', 'Q4', ''])
    expect(await test.catalog.listTags(test.query.signal)).toEqual({
      ok: true,
      value: ['Finance', 'Q4']
    })
    test.port.tags.listTags.mockRejectedValue({ statusCode: 401 })
    expect(await test.catalog.listTags(test.query.signal)).toEqual({
      ok: false,
      error: 'unauthenticated'
    })
  })
  it('marks recent changes partial when hits are truncated or belong to an unmapped share', async () => {
    const test = setup()
    test.port.webdav.search.mockResolvedValue({
      resources: [
        { ...file('shared'), storageId: 'share-mount', highlights: '', mdate: '2026-11-10' },
        { ...file('undated'), storageId: test.personal.id, highlights: '' }
      ],
      totalResults: 2
    })
    await test.catalog.listSpaces(test.query.signal)
    expect(await test.catalog.recentlyChanged('docs', test.query.signal, noFilter)).toEqual({
      ok: true,
      value: { items: [], partial: true }
    })
    test.port.webdav.search.mockResolvedValue({ resources: [], totalResults: 500 })
    const truncated = await test.catalog.recentlyChanged('sheets', test.query.signal, noFilter)
    expect(truncated.ok && truncated.value.partial).toBe(true)
  })
  it('discards recent changes that arrive after an account change', async () => {
    const test = setup()
    await test.catalog.listSpaces(test.query.signal)
    test.port.webdav.search.mockImplementation(() => {
      test.setSession('instance-a/user-b/auth-2')
      return Promise.resolve({
        resources: [
          { ...file(), storageId: test.personal.id, highlights: '', mdate: '2026-11-10' }
        ],
        totalResults: 1
      })
    })
    expect(await test.catalog.recentlyChanged('docs', test.query.signal, noFilter)).toEqual({
      ok: false,
      error: 'unauthenticated'
    })
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
