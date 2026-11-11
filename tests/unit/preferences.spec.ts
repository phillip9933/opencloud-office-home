import { describe, expect, it } from 'vitest'
import {
  AUTO_COMPACT_AFTER,
  compactBand,
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
    saved.columns = ['owner', 'created', 'tags']
    saved.lastKind = 'sheets'
    saved.templateFolder = { spaceId: 'templates', itemId: 'approved-folder' }
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
        lastKind: 'external-app',
        columns: ['owner', 'owner', 'unknown', 42],
        templateFolder: { spaceId: '', itemId: 'x' },
        pinned: { docs: ['ok', 42, 'ok', 'x'.repeat(2000), ...Array(40).fill('n')], slides: 'x' }
      })
    ).toEqual({
      ...defaultViewPreferences(),
      columns: ['owner'],
      pinned: { docs: ['ok', 'n'], sheets: [], slides: [] }
    })
    const storage = memory()
    storage.values.set(JSON.stringify(['office-view', 1, 'a', 'u']), '{not json')
    expect(createViewPreferenceStore({ instance: 'a', user: 'u' }, storage).load()).toEqual(
      defaultViewPreferences()
    )
    expect(() => createViewPreferenceStore({ instance: '', user: 'u' })).toThrow()
  })
  it('remembers creation choices and the creation count, rejecting malformed values', () => {
    expect(
      parseViewPreferences({
        lastFormat: { docs: 'docx', sheets: '../x', slides: 7 },
        lastFolder: { docs: { spaceId: 's', itemId: 'f' }, sheets: { spaceId: '' }, slides: 'f' },
        createdCount: 5e9
      })
    ).toMatchObject({
      lastFormat: { docs: 'docx' },
      lastFolder: { docs: { spaceId: 's', itemId: 'f' } },
      createdCount: 1000
    })
    expect(parseViewPreferences({ createdCount: -2 }).createdCount).toBe(0)
  })
  it('collapses the automatic template band only after a few created files', () => {
    expect(defaultViewPreferences().band).toBe('auto')
    expect(compactBand({ band: 'auto', createdCount: AUTO_COMPACT_AFTER - 1 })).toBe(false)
    expect(compactBand({ band: 'auto', createdCount: AUTO_COMPACT_AFTER })).toBe(true)
    expect(compactBand({ band: 'row', createdCount: 99 })).toBe(false)
    expect(compactBand({ band: 'compact', createdCount: 0 })).toBe(true)
  })
  it('toggles and reorders pins without duplicates', () => {
    expect(togglePin(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(togglePin(['a', 'b'], 'a')).toEqual(['b'])
    expect(movePin(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(movePin(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a'])
    expect(movePin(['a', 'b'], 'missing', 0)).toEqual(['a', 'b'])
  })
})

it('stores only canonical reference fields from browser preferences', () => {
  const preferences = parseViewPreferences({
    templateFolder: { spaceId: 'space', itemId: 'templates', unexpected: 'Discarded label' },
    lastFolder: { docs: { spaceId: 'space', itemId: 'destination', unexpected: 'Discarded label' } }
  })
  expect(preferences.templateFolder).toEqual({ spaceId: 'space', itemId: 'templates' })
  expect(preferences.lastFolder.docs).toEqual({ spaceId: 'space', itemId: 'destination' })
})
