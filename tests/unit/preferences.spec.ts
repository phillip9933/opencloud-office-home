import { describe, expect, it } from 'vitest'
import {
  createViewPreferenceStore,
  defaultViewPreferences,
  movePin,
  parseViewPreferences,
  togglePin
} from '../../src/preferences/view'

function memory() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value)
  }
}

describe('view preferences', () => {
  it('keeps pins, order, compact band and layout per instance and user', () => {
    const storage = memory()
    const alice = createViewPreferenceStore({ instance: 'a', user: 'alice' }, storage)
    const saved = defaultViewPreferences()
    saved.band = 'compact'
    saved.layout = 'grid'
    saved.pinned.docs = ['t2', 't1']
    alice.save(saved)
    expect(alice.load()).toEqual(saved)
    expect(createViewPreferenceStore({ instance: 'a', user: 'bob' }, storage).load()).toEqual(
      defaultViewPreferences()
    )
  })
  it('falls back safely for corrupt, unknown or oversized stored values', () => {
    expect(
      parseViewPreferences({
        sort: 'drop table',
        band: 'huge',
        pinned: { docs: ['ok', 42, 'ok', 'x'.repeat(2000), ...Array(40).fill('n')], slides: 'x' }
      })
    ).toEqual({
      ...defaultViewPreferences(),
      pinned: { docs: ['ok', 'n'], sheets: [], slides: [] }
    })
    const storage = memory()
    storage.values.set(JSON.stringify(['office-view', 1, 'a', 'u']), '{not json')
    expect(createViewPreferenceStore({ instance: 'a', user: 'u' }, storage).load()).toEqual(
      defaultViewPreferences()
    )
    expect(() => createViewPreferenceStore({ instance: '', user: 'u' })).toThrow()
  })
  it('toggles and reorders pins without duplicates', () => {
    expect(togglePin(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(togglePin(['a', 'b'], 'a')).toEqual(['b'])
    expect(movePin(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(movePin(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a'])
    expect(movePin(['a', 'b'], 'missing', 0)).toEqual(['a', 'b'])
  })
})
