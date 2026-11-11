import { describe, expect, it } from 'vitest'
import { createRecentStore } from '../../src/preferences/recents'

describe('browser-local recents', () => {
  it('isolates users and instances, stores only references and removes revoked entries', () => {
    const map = new Map<string, string>()
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v)
      },
      removeItem: (k: string) => {
        map.delete(k)
      }
    }
    const scope = { instance: 'https://cloud.example', user: 'user-a' }
    const store = createRecentStore(scope, storage)
    store.record({ spaceId: 'opaque:space', itemId: 'opaque:id' }, 'docs')
    expect(createRecentStore({ ...scope, user: 'user-b' }, storage).list('docs')).toEqual([])
    expect(
      createRecentStore({ ...scope, instance: 'https://other.example' }, storage).list('docs')
    ).toEqual([])
    expect([...map.values()][0]).not.toMatch(/filename|path|token|content/i)
    store.remove({ spaceId: 'opaque:space', itemId: 'opaque:id' })
    expect(createRecentStore(scope, storage).list('docs')).toEqual([])
  })
  it('deduplicates, bounds history, expires it, and tolerates denied browser storage', () => {
    let time = 100000000000
    const store = createRecentStore({ instance: 'fixture', user: 'fixture' }, undefined, () => time)
    for (let index = 0; index < 120; index++) {
      time++
      store.record({ spaceId: 's', itemId: `${index}` }, 'docs')
    }
    store.record({ spaceId: 's', itemId: '119' }, 'docs')
    expect(store.list('docs')).toHaveLength(100)
    time += 91 * 86400000
    expect(store.list('docs')).toEqual([])
    const broken = {
      getItem() {
        throw new Error()
      },
      setItem() {
        throw new Error()
      },
      removeItem() {
        throw new Error()
      }
    }
    const fallback = createRecentStore({ instance: 'a', user: 'a' }, broken)
    expect(() => {
      fallback.record({ spaceId: 's', itemId: '1' }, 'docs')
      fallback.remove({ spaceId: 's', itemId: '1' })
    }).not.toThrow()
  })
  it('rejects unscoped history and removes corrupted or future data', () => {
    expect(() => createRecentStore({ instance: '', user: '' })).toThrow()
    const storage = {
      getItem: () =>
        '[{"kind":"docs","ref":{"spaceId":"s","itemId":"i"},"openedAt":1e99,"token":"discard"}]',
      setItem() {},
      removeItem() {}
    }
    expect(createRecentStore({ instance: 'a', user: 'a' }, storage).list('docs')).toEqual([])
  })
})
