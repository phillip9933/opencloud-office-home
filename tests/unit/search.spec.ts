import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FolderPicker from '../../src/components/FolderPicker.vue'
import { createOfficeContext } from '../../src/app/context'
import { fixtureServices } from '../../src/fixtures/services'
import { ok, type FileRecord, type Page, type Result } from '../../src/contracts/office'

// The app search UI was removed in favor of the native host search. Keep stale-read
// coverage at the remaining interactive folder-picker boundary.
it('discards folder metadata that arrives after cancelling the picker', async () => {
  const services = fixtureServices()
  let finish!: (result: Result<Page<FileRecord>>) => void
  const list = vi.spyOn(services.catalog, 'list').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const wrapper = mount(FolderPicker, {
    props: { catalog: services.catalog, title: 'Choose save folder' }
  })
  await flushPromises()
  expect(wrapper.text()).toContain('Loading folders…')
  wrapper.unmount()
  finish(
    ok({
      items: [
        {
          ref: { spaceId: 'old', itemId: 'private' },
          name: 'Stale private folder',
          kind: 'folder',
          access: { read: true, write: false, createChild: false }
        }
      ],
      partial: false
    })
  )
  await flushPromises()
  expect(list.mock.calls[0]![0].signal.aborted).toBe(true)
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
