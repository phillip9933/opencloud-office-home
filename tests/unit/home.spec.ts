import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHomeModel, defaultLocation } from '../../src/services/home'
import { fixtureServices } from '../../src/fixtures/services'
import {
  fail,
  ok,
  type FileRecord,
  type OfficeServices,
  type Result
} from '../../src/contracts/office'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
let services: OfficeServices
beforeEach(() => {
  services = fixtureServices()
})

describe('home workflow', () => {
  it('refuses an unavailable selected space without falling back to personal files', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load({ ...defaultLocation('docs'), spaceId: 'revoked-space' })
    expect(home.state.error).toContain('space could not be verified')
    expect(home.state.destinationWritable).toBe(false)
  })
  it('does not expose a fake live integration', async () => {
    vi.spyOn(services.catalog, 'listSpaces').mockResolvedValue(fail('editorUnavailable'))
    vi.spyOn(services.capabilities, 'creationFormats').mockResolvedValue(fail('editorUnavailable'))
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.formats).toEqual([])
    expect(home.state.destinationWritable).toBe(false)
    expect(home.state.error).toContain('not been verified')
  })
  it('loads no unused folder listing and clears recent metadata on deactivation', async () => {
    const list = vi.spyOn(services.catalog, 'list').mockResolvedValue(fail('network'))
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(list).not.toHaveBeenCalled()
    expect(home.state.error).toBe('')
    expect(home.state.destinationWritable).toBe(true)
    home.deactivate()
    expect(home.state.recent).toEqual([])
  })
  it('ignores late destination results even when the source ignores cancellation', async () => {
    const first = deferred<Result<FileRecord>>()
    const second = deferred<Result<FileRecord>>()
    const resolve = vi
      .spyOn(services.catalog, 'resolve')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const home = createHomeModel(services, 'docs')
    const reports = { spaceId: 'fixture-personal', itemId: 'reports' }
    const stale = home.load(defaultLocation('docs'))
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(1))
    const fresh = home.load({
      ...defaultLocation('docs'),
      spaceId: reports.spaceId,
      folder: reports
    })
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledTimes(2))
    second.resolve(
      ok({
        ref: reports,
        name: 'Reports',
        kind: 'folder',
        access: { read: true, write: true, createChild: true }
      })
    )
    await fresh
    first.resolve(fail('network'))
    await stale
    expect(home.state.location.folder).toEqual(reports)
    expect(home.state.error).toBe('')
    expect(home.state.destinationWritable).toBe(true)
  })
  it('locks repeated creates and retains the one created resource after editor failure', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const create = vi.spyOn(services.creation, 'blank')
    await Promise.all([home.create('A report', 'odt'), home.create('A report', 'odt')])
    expect(create).toHaveBeenCalledTimes(1)
    expect(home.state.created?.name).toBe('A report.odt')
    expect(home.state.notice).toContain('in Personal files.')
    vi.spyOn(services.editor, 'open').mockResolvedValue(fail('editorUnavailable'))
    await home.open(home.state.created!)
    expect(home.state.created?.name).toBe('A report.odt')
    expect(create).toHaveBeenCalledTimes(1)
    expect(services.recents.list('docs')).toEqual([])
  })
  it('blocks blind retries after uncertain mutation outcomes', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const create = vi
      .spyOn(services.creation, 'blank')
      .mockResolvedValue({ ok: false, error: 'timeout', outcome: 'uncertain' } as const)
    await home.create('A report', 'odt')
    await home.create('Another report', 'odt')
    expect(create).toHaveBeenCalledTimes(1)
    expect(home.state.uncertain).toBe(true)
  })
  it('rechecks destination permission and source access immediately before copy', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const template = home.state.templates[0]!
    const copy = vi.spyOn(services.creation, 'fromTemplate')
    vi.spyOn(services.catalog, 'resolve').mockResolvedValue(fail('forbiddenOrMissing'))
    await home.create('Copy', 'odt', template)
    expect(copy).not.toHaveBeenCalled()
  })
  it('revalidates files, opens a read-only resource as view, and suppresses repeated opens', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const viewer = await services.catalog.resolve({
      spaceId: 'fixture-personal',
      itemId: 'read-docs'
    })
    if (!viewer.ok) throw new Error('fixture missing')
    const launch = vi.spyOn(services.editor, 'open')
    await Promise.all([home.open(viewer.value), home.open(viewer.value)])
    expect(launch).toHaveBeenCalledTimes(1)
    expect(launch.mock.calls[0]![0].mode).toBe('view')
    expect(services.recents.list('docs')).toHaveLength(1)
  })
  it('removes revoked recents and never shows stale names after refresh failure', async () => {
    const home = createHomeModel(services, 'docs')
    services.recents.record({ spaceId: 'fixture-personal', itemId: 'docs' }, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.recent).toHaveLength(1)
    const resolve = services.catalog.resolve
    vi.spyOn(services.catalog, 'resolve').mockImplementation((ref) =>
      ref.itemId === 'docs' ? Promise.resolve(fail('forbiddenOrMissing')) : resolve(ref)
    )
    await home.load(defaultLocation('docs'))
    expect(home.state.recent).toEqual([])
    expect(services.recents.list('docs')).toEqual([])
  })
  it('merges files changed in OpenCloud with browser opens, retaining separate timestamps', async () => {
    services = fixtureServices({ seedHistory: true })
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const byName = new Map(home.state.recent.map((entry) => [entry.file.name, entry]))
    // Changed by someone else and never opened here: listed from the server query.
    expect(byName.get('Team handbook.docx')).toMatchObject({ modifiedAt: expect.any(Number) })
    // Opened here and also changed in OpenCloud: one entry carrying both timestamps.
    expect(byName.get('Project Docs.odt')).toMatchObject({
      openedAt: expect.any(Number),
      modifiedAt: expect.any(Number)
    })
    // Opened only: an old change date is not shown as recent.
    expect(byName.get('Shared Docs.docx')).not.toHaveProperty('modifiedAt')
  })
  it('applies Recent filters to both sources and refreshes only Recent', async () => {
    services = fixtureServices({ seedHistory: true })
    const filter = { favorites: false, tags: [] as string[] }
    const home = createHomeModel(services, 'docs', filter)
    await home.load(defaultLocation('docs'))
    const list = vi.spyOn(services.catalog, 'list')
    filter.favorites = true
    await home.refreshRecent()
    // Favorites: one opened here (Project Docs) and one only opened (Meeting notes).
    expect(home.state.recent.map((e) => e.file.name).sort()).toEqual([
      'Meeting notes 4 November.odt',
      'Project Docs.odt'
    ])
    filter.favorites = false
    filter.tags = ['Onboarding']
    await home.refreshRecent()
    expect(home.state.recent.map((e) => e.file.name)).toEqual(['Team handbook.docx'])
    expect(list).not.toHaveBeenCalled()
  })
  it('opens read-only on request and simulates native file actions', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const launch = vi.spyOn(services.editor, 'open')
    const resolved = await services.catalog.resolve({ spaceId: 'fixture-personal', itemId: 'docs' })
    if (!resolved.ok) throw new Error('Fixture missing')
    const editable = resolved.value
    await home.runAction('openReadOnly', editable)
    expect(launch.mock.calls[0]![0].mode).toBe('view')
    await home.runAction('share', editable)
    expect(home.state.notice).toContain('Simulated')
    vi.spyOn(services.actions, 'download').mockResolvedValue(fail('forbiddenOrMissing'))
    await home.runAction('download', editable)
    expect(home.state.notice).toContain('no longer have access')
  })
  it('names a remembered folder from live metadata without inventing ancestors', async () => {
    const home = createHomeModel(services, 'docs')
    const reports = { spaceId: 'fixture-personal', itemId: 'reports' }
    await home.load({ ...defaultLocation('docs'), spaceId: reports.spaceId, folder: reports })
    expect(home.state.location.folderName).toBe('Reports')
    expect(home.state.destinationWritable).toBe(true)
  })
  it('keeps browser history and explains when recent changes cannot be loaded', async () => {
    services.recents.record({ spaceId: 'fixture-personal', itemId: 'docs' }, 'docs')
    vi.spyOn(services.catalog, 'recentlyChanged').mockResolvedValue(fail('network'))
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.recent.map((entry) => entry.file.name)).toEqual(['Project Docs.odt'])
    expect(home.state.recentNote).toContain('Changes from other devices are unavailable')
  })
  it('retains a completed mutation when navigating to a different destination', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const pending = deferred<import('../../src/contracts/office').CreationResult>()
    vi.spyOn(services.creation, 'blank').mockImplementation(() => pending.promise)
    const creating = home.create('Pending', 'odt')
    await vi.waitFor(() => expect(services.creation.blank).toHaveBeenCalledOnce())
    home.deactivate()
    await home.load({
      ...defaultLocation('docs'),
      spaceId: 'fixture-team',
      folder: { spaceId: 'fixture-team', itemId: 'root' }
    })
    pending.resolve(
      ok({
        ref: { spaceId: 'fixture-personal', itemId: 'created' },
        name: 'Pending.odt',
        kind: 'file',
        access: { read: true, write: true, createChild: false }
      })
    )
    await creating
    expect(home.state.created?.name).toBe('Pending.odt')
    expect(home.state.location.folder).toEqual({ spaceId: 'fixture-team', itemId: 'root' })
  })
})

it('preserves an explicit folder submitted before initial space discovery finishes', async () => {
  const home = createHomeModel(fixtureServices(), 'docs')
  const folder = { spaceId: 'fixture-personal', itemId: 'reports' }
  await home.load({ ...defaultLocation('docs'), spaceId: folder.spaceId, folder })
  expect(home.state.location.folder).toEqual(folder)
  expect(home.state.location.spaceId).not.toBe('')
})

it('keeps recent references after a transient open failure instead of treating them as revoked', async () => {
  const source = fixtureServices({ seedHistory: true })
  const home = createHomeModel(source, 'docs')
  await home.load(defaultLocation('docs'))
  const entry = home.state.recent[0]!
  const before = source.recents.list('docs')
  vi.spyOn(source.catalog, 'resolve').mockResolvedValue(fail('network'))
  await home.open(entry.file)
  expect(home.state.recent.some((r) => r.file.ref.itemId === entry.file.ref.itemId)).toBe(true)
  expect(source.recents.list('docs')).toEqual(before)
  expect(home.state.notice).toContain('could not be reached')
})

it('reconciles an uncertain creation through read-only checks without resubmission', async () => {
  const services = fixtureServices()
  const home = createHomeModel(services, 'docs')
  await home.load(defaultLocation('docs'))
  const original = services.creation.blank
  const create = vi.spyOn(services.creation, 'blank').mockImplementation(async (input) => {
    await original(input)
    return { ok: false, error: 'timeout', outcome: 'uncertain' } as const
  })
  await home.create('Lost acknowledgement', 'odt')
  expect(home.state.uncertain).toBe(true)
  const listed = vi.spyOn(services.catalog, 'list')
  await Promise.all([home.reconcileCreation(), home.reconcileCreation()])
  expect(listed).toHaveBeenCalledTimes(1)
  expect(create).toHaveBeenCalledTimes(1)
  expect(home.state.uncertain).toBe(false)
  expect(home.state.created?.name).toBe('Lost acknowledgement.odt')
  expect(home.state.notice).toContain('Open it to verify')
})

it('keeps ambiguous creation locked when a partial listing finds no file or access is revoked', async () => {
  const services = fixtureServices()
  const home = createHomeModel(services, 'docs')
  await home.load(defaultLocation('docs'))
  const create = vi
    .spyOn(services.creation, 'blank')
    .mockResolvedValue({ ok: false, error: 'timeout', outcome: 'uncertain' } as const)
  await home.create('Unconfirmed', 'odt')
  vi.spyOn(services.catalog, 'list').mockResolvedValue(ok({ items: [], partial: true }))
  await home.reconcileCreation()
  expect(home.state.uncertain).toBe(true)
  expect(home.state.notice).toContain('No matching file was confirmed')
  vi.spyOn(services.catalog, 'list').mockResolvedValue(fail('forbiddenOrMissing'))
  await home.reconcileCreation()
  expect(home.state.uncertain).toBe(true)
  await home.create('Unconfirmed', 'odt')
  expect(create).toHaveBeenCalledTimes(1)
})

it('does not lock creation when a read fails before the mutation is submitted', async () => {
  const services = fixtureServices()
  const home = createHomeModel(services, 'docs')
  await home.load(defaultLocation('docs'))
  const create = vi.spyOn(services.creation, 'blank')
  vi.spyOn(services.catalog, 'resolve').mockResolvedValue(fail('network'))
  await home.create('Draft', 'odt')
  expect(create).not.toHaveBeenCalled()
  expect(home.state.uncertain).toBe(false)
  expect(home.state.notice).toContain('could not be reached')
})

it('rejects a stale reconciliation result after navigating away even if listing ignores cancellation', async () => {
  const services = fixtureServices()
  const home = createHomeModel(services, 'docs')
  await home.load(defaultLocation('docs'))
  const original = services.creation.blank
  let created!: FileRecord
  vi.spyOn(services.creation, 'blank').mockImplementation(async (input) => {
    const result = await original(input)
    if (result.ok) created = result.value
    return { ok: false, error: 'timeout', outcome: 'uncertain' } as const
  })
  await home.create('Pending reconciliation', 'odt')
  const listing = deferred<Result<{ items: FileRecord[]; partial: boolean }>>()
  const list = vi.spyOn(services.catalog, 'list').mockImplementation(() => listing.promise)
  const checking = home.reconcileCreation()
  home.deactivate()
  expect(list.mock.calls[0]![0].signal.aborted).toBe(true)
  listing.resolve(ok({ items: [created], partial: true }))
  await checking
  expect(home.state.uncertain).toBe(true)
  expect(home.state.created).toBeNull()
})

it('requires fresh file access before unlocking an uncertain creation', async () => {
  const services = fixtureServices()
  const home = createHomeModel(services, 'docs')
  await home.load(defaultLocation('docs'))
  vi.spyOn(services.creation, 'blank').mockResolvedValue({
    ok: false,
    error: 'timeout',
    outcome: 'uncertain'
  } as const)
  await home.create('Unconfirmed', 'odt')
  vi.spyOn(services.catalog, 'list').mockResolvedValue(
    ok({
      items: [
        {
          ref: { spaceId: 'fixture-personal', itemId: 'revoked' },
          name: 'Unconfirmed.odt',
          kind: 'file',
          mimeType: home.state.formats[0]!.mimeType,
          access: { read: true, write: true, createChild: false }
        }
      ],
      partial: true
    })
  )
  await home.reconcileCreation()
  expect(home.state.uncertain).toBe(true)
  expect(home.state.created).toBeNull()
  expect(home.state.notice).toContain('no longer have access')
})
