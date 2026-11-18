import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { createOfficeContext } from '../../src/app/context'
import AllFiles from '../../src/components/AllFiles.vue'
import { ok, type FileRecord } from '../../src/contracts/office'
import { fixtureServices } from '../../src/fixtures/services'

it('pages through returned files and discloses incomplete results', async () => {
  const services = fixtureServices()
  const items: FileRecord[] = Array.from({ length: 26 }, (_, index) => ({
    ref: { spaceId: 'fixture-personal', itemId: `report-${index + 1}` },
    name: `Report ${index + 1}.odt`,
    kind: 'file',
    access: { read: true, write: true, createChild: false }
  }))
  vi.spyOn(services.catalog, 'allFiles').mockResolvedValue(ok({ items, partial: true }))
  const context = createOfficeContext(services)
  const wrapper = mount(AllFiles, {
    props: { context, kind: 'docs', waiting: false, opening: false }
  })
  await flushPromises()
  expect(wrapper.text()).toContain('OpenCloud returned only some results')
  expect(wrapper.text()).toContain('Page 1 of 2')
  expect(wrapper.text()).not.toContain('Report 26.odt')

  const pageButtons = wrapper.get('nav[aria-label="File pages"]').findAll('button')
  await pageButtons[1]!.trigger('click')
  expect(wrapper.text()).toContain('Page 2 of 2')
  expect(wrapper.text()).toContain('Report 26.odt')
  expect(wrapper.text()).not.toContain('Report 1.odt')
  expect(pageButtons[1]!.attributes('aria-disabled')).toBe('true')
  await pageButtons[0]!.trigger('click')
  expect(wrapper.text()).toContain('Report 1.odt')

  wrapper.unmount()
  context.dispose()
})
