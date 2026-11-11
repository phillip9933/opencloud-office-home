import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHomeModel, defaultLocation } from '../../src/services/home'
import { fixtureServices } from '../../src/fixtures/services'
import {
  fail,
  ok,
  type FileRecord,
  type OfficeServices,
  type Page,
  type Result
} from '../../src/contracts/office'
import { unconfiguredServices } from '../../src/adapters/opencloud/unconfigured'

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
    expect(home.state.error).toContain('no longer have access')
    expect(home.state.rows).toEqual([])
    expect(home.state.destinationWritable).toBe(false)
  })
  it('does not expose a fake live integration', async () => {
    const home = createHomeModel(unconfiguredServices(), 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.formats).toEqual([])
    expect(home.state.destinationWritable).toBe(false)
    expect(home.state.error).toContain('not been verified')
  })
  it('filters by family, keeps folders visible, and clears metadata on deactivation', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.rows.map((f) => f.name)).toEqual(['Reports', 'Project Docs.odt'])
    home.deactivate()
    expect(home.state.rows).toEqual([])
    expect(home.state.recent).toEqual([])
  })
  it('ignores late search results even when the source ignores cancellation', async () => {
    const first = deferred<Result<Page<FileRecord>>>()
    const second = deferred<Result<Page<FileRecord>>>()
    const list = vi
      .spyOn(services.catalog, 'list')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const home = createHomeModel(services, 'docs')
    const stale = home.load({ ...defaultLocation('docs'), text: 'old' })
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    const fresh = home.load({ ...defaultLocation('docs'), text: 'new' })
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    second.resolve(ok({ items: [], partial: true, next: 'opaque-cursor' }))
    await fresh
    first.resolve(fail('network'))
    await stale
    expect(home.state.location.text).toBe('new')
    expect(home.state.error).toBe('')
    expect(home.state.partial).toBe(true)
    expect(list.mock.calls[0]![0].signal.aborted).toBe(true)
  })
  it('locks repeated creates and retains the one created resource after editor failure', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const create = vi.spyOn(services.creation, 'blank')
    await Promise.all([home.create('A report', 'odt'), home.create('A report', 'odt')])
    expect(create).toHaveBeenCalledTimes(1)
    expect(home.state.created?.name).toBe('A report.odt')
    vi.spyOn(services.editor, 'open').mockResolvedValue(fail('editorUnavailable'))
    await home.open(home.state.created!)
    expect(home.state.created?.name).toBe('A report.odt')
    expect(create).toHaveBeenCalledTimes(1)
    expect(services.recents.list('docs')).toEqual([])
  })
  it('blocks blind retries after uncertain mutation outcomes', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const create = vi.spyOn(services.creation, 'blank').mockResolvedValue(fail('timeout'))
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
  it('retains a completed mutation when navigating away without inserting into a different folder', async () => {
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    const pending = deferred<Result<FileRecord>>()
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
    expect(home.state.rows.length).toBeGreaterThan(0)
    expect(home.state.rows.map((row) => row.name)).not.toContain('Pending.odt')
  })
})
