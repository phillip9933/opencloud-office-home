import { expect, it, vi } from 'vitest'
import { fixtureServices } from '../../src/fixtures/services'
import { createHomeModel, defaultLocation } from '../../src/services/home'
import { createRecentStore } from '../../src/preferences/recents'
import { recentLoader } from '../../src/services/loadRecent'
import { fail, ok, type FileRecord, type Result } from '../../src/contracts/office'

it('accepts ordinary dotted document titles', async () => {
  const services = fixtureServices()
  const model = createHomeModel(services, 'docs')
  await model.load(defaultLocation('docs'))
  const blank = vi.spyOn(services.creation, 'blank')
  await model.create('Budget v1.2', 'odt')
  expect(blank).toHaveBeenCalledOnce()
  expect(model.state.created?.name).toBe('Budget v1.2.odt')
  model.dispose()
})
it('prunes expired recent IDs from persistent storage', () => {
  let now = 100000000000
  const map = new Map<string, string>()
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    }
  }
  const scope = { instance: 'https://cloud.example', user: 'test-user' }
  createRecentStore(scope, storage, () => now).record(
    { spaceId: 's', itemId: 'expired-id' },
    'docs'
  )
  now += 91 * 86400000
  expect(createRecentStore(scope, storage, () => now).list('docs')).toEqual([])
  expect([...map.values()][0]).not.toContain('expired-id')
})
it('dispatches no metadata requests for an already-aborted refresh', async () => {
  const services = fixtureServices()
  for (let i = 0; i < 100; i++) services.recents.record({ spaceId: 's', itemId: String(i) }, 'docs')
  const pending: ((value: Result<FileRecord>) => void)[] = []
  const resolve = vi.spyOn(services.catalog, 'resolve').mockImplementation(
    () =>
      new Promise((done) => {
        pending.push(done)
      })
  )
  const abort = new AbortController()
  abort.abort()
  const loading = recentLoader(services, 'docs', { favorites: false, tags: [] })(abort.signal)
  expect(resolve).toHaveBeenCalledTimes(0)
  for (const done of pending) done(fail('network'))
  await loading
})
it('retains fresh authorized recents and reports partial lookup failures', async () => {
  const services = fixtureServices()
  services.recents.record({ spaceId: 'fixture-personal', itemId: 'docs' }, 'docs')
  services.recents.record({ spaceId: 'fixture-personal', itemId: 'read-docs' }, 'docs')
  const original = services.catalog.resolve
  vi.spyOn(services.catalog, 'resolve').mockImplementation((ref) =>
    ref.itemId === 'docs' ? Promise.resolve(fail('network')) : original(ref)
  )
  vi.spyOn(services.catalog, 'recentlyChanged').mockResolvedValue(ok({ items: [], partial: false }))
  const result = await recentLoader(services, 'docs', { favorites: false, tags: [] })(
    new AbortController().signal
  )
  expect(result.entries).toHaveLength(1)
  expect(result.note).toContain('Some recently opened files could not be refreshed')
  expect(services.recents.list('docs')).toHaveLength(2)
})

it('bounds metadata work and stops the queue without pruning after cancellation', async () => {
  const services = fixtureServices()
  for (let i = 0; i < 100; i++) services.recents.record({ spaceId: 's', itemId: String(i) }, 'docs')
  const pending: ((value: Result<FileRecord>) => void)[] = []
  const resolve = vi.spyOn(services.catalog, 'resolve').mockImplementation(
    () =>
      new Promise((done) => {
        pending.push(done)
      })
  )
  const remove = vi.spyOn(services.recents, 'remove')
  const abort = new AbortController()
  const loading = recentLoader(services, 'docs', { favorites: false, tags: [] })(abort.signal)
  expect(resolve).toHaveBeenCalledTimes(4)
  expect(resolve.mock.calls.every(([, signal]) => signal === abort.signal)).toBe(true)
  abort.abort()
  expect(await loading).toEqual({ entries: [], note: '' })
  for (const done of pending) done(fail('forbiddenOrMissing'))
  await Promise.resolve()
  expect(resolve).toHaveBeenCalledTimes(4)
  expect(remove).not.toHaveBeenCalled()
  expect(services.recents.list('docs')).toHaveLength(100)
})

it('stays session-local when storage cannot be read instead of overwriting unknown data', () => {
  const storage = {
    getItem: () => {
      throw new Error('Denied')
    },
    setItem: vi.fn()
  }
  const store = createRecentStore({ instance: 'https://cloud.example', user: 'test' }, storage)
  store.record({ spaceId: 's', itemId: 'one' }, 'docs')
  expect(store.list('docs')).toHaveLength(1)
  expect(storage.setItem).not.toHaveBeenCalled()
})
