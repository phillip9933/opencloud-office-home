import { describe, expect, it } from 'vitest'
import { createRecentStore } from '../../src/preferences/recents'

describe('browser-local recents', () => {
  it('preserves interleaved opens and removals from two active tabs', async () => {
    const storage = new Map<string, string>()
    let writtenWithoutLock = false
    let locked = false
    const port = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem(key: string, value: string) {
        writtenWithoutLock ||= !locked
        storage.set(key, value)
      }
    }
    const scope = { instance: 'same-instance', user: 'same-user' }
    let queue = Promise.resolve()
    const locks = {
      request(_name: string, callback: () => void) {
        queue = queue.then(() => {
          locked = true
          try {
            callback()
          } finally {
            locked = false
          }
        })
        return queue
      }
    }
    const first = createRecentStore(scope, port, Date.now, locks)
    const second = createRecentStore(scope, port, Date.now, locks)
    const a = { spaceId: 's', itemId: 'a' }
    const b = { spaceId: 's', itemId: 'b' }
    await Promise.all([first.record(a, 'docs'), second.record(b, 'docs')])
    expect((await first.list('docs')).map((entry) => entry.ref.itemId).sort()).toEqual(['a', 'b'])
    await first.remove(a)
    await second.record({ spaceId: 's', itemId: 'c' }, 'docs')
    expect((await first.list('docs')).map((entry) => entry.ref.itemId).sort()).toEqual(['b', 'c'])
    expect(writtenWithoutLock).toBe(false)
  })
  it('preserves legacy stored history when a browser cannot coordinate shared writes', () => {
    const scope = { instance: 'same-instance', user: 'same-user' }
    const key = JSON.stringify(['office-recents', 1, scope.instance, scope.user])
    const initial = JSON.stringify([
      { ref: { spaceId: 's', itemId: 'old' }, kind: 'docs', openedAt: Date.now() }
    ])
    const storage = new Map([[key, initial]])
    const port = {
      getItem: (id: string) => storage.get(id) ?? null,
      setItem: (id: string, value: string) => void storage.set(id, value)
    }
    const store = createRecentStore(scope, port, Date.now, false)
    store.record({ spaceId: 's', itemId: 'new' }, 'docs')
    expect(
      store
        .list('docs')
        .map(({ ref }) => ref.itemId)
        .sort()
    ).toEqual(['new', 'old'])
    expect(storage.get(key)).toBe(initial)
  })
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
