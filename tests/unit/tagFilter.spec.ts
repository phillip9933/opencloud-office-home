import { mount, flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import TagFilter from '../../src/components/TagFilter.vue'
import { fixtureServices } from '../../src/fixtures/services'
import { ok, type Result } from '../../src/contracts/office'

it('closes on outside click and aborts lookup on unmount without restoring stale focus', async () => {
  const services = fixtureServices()
  let finish!: (result: Result<string[]>) => void
  const lookup = vi.spyOn(services.catalog, 'listTags').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const wrapper = mount(TagFilter, {
    attachTo: document.body,
    props: { catalog: services.catalog, filter: { favorites: false, tags: [] } }
  })
  await wrapper.get('button').trigger('click')
  document.body.click()
  await flushPromises()
  expect(wrapper.find('fieldset').exists()).toBe(false)
  expect(lookup.mock.calls[0]![0].aborted).toBe(true)
  finish(ok(['Late tag']))
  await flushPromises()
  expect(wrapper.text()).not.toContain('Late tag')
  await wrapper.get('button').trigger('click')
  wrapper.unmount()
  expect(lookup.mock.calls[1]![0].aborted).toBe(true)
  finish(ok(['After unmount']))
  await flushPromises()
})
