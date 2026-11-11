import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SearchFiles from '../../src/components/SearchFiles.vue'
import { createOfficeContext } from '../../src/app/context'
import { fixtureServices } from '../../src/fixtures/services'
import { ok, type FileRecord, type Page, type Result } from '../../src/contracts/office'

it('discards late search metadata after clearing or switching a query', async () => {
  const services = fixtureServices()
  let finish!: (result: Result<Page<FileRecord>>) => void
  const search = vi.spyOn(services.catalog, 'search').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const wrapper = mount(SearchFiles, {
    props: {
      context: createOfficeContext(services),
      kind: 'docs',
      ready: true,
      opening: false,
      folderRows: [],
      folderPartial: false,
      search: { term: 'old query', scope: 'all' }
    }
  })
  expect(wrapper.text()).toContain('Searching…')
  await wrapper.setProps({ search: undefined })
  finish(
    ok({
      items: [
        {
          ref: { spaceId: 'old', itemId: 'private' },
          name: 'Stale private metadata.odt',
          kind: 'file',
          access: { read: true, write: false, createChild: false }
        }
      ],
      partial: false
    })
  )
  await flushPromises()
  expect(wrapper.text()).not.toContain('Stale private metadata')
  expect(search.mock.calls[0]![2].aborted).toBe(true)
  wrapper.unmount()
})

describe('authenticated context disposal', () => {
  it('clears cached private metadata and stops preference writes on logout', async () => {
    const services = fixtureServices()
    const save = vi.spyOn(services.viewPreferences, 'save')
    const context = createOfficeContext(services)
    const home = context.model('docs')
    await home.load({ kind: 'docs', spaceId: '', folder: null, trail: [], scroll: 0 })
    expect(home.state.templates.length).toBeGreaterThan(0)
    context.saveView(home.state.location)
    context.dispose()
    context.preferences.band = 'compact'
    await flushPromises()
    expect(save).not.toHaveBeenCalled()
    expect(context.views.size).toBe(0)
    expect(home.state.spaces).toEqual([])
    expect(home.state.templates).toEqual([])
    expect(home.state.rows).toEqual([])
    expect(home.state.recent).toEqual([])
  })
})
