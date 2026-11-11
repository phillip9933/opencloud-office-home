import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CreatePanel from '../../src/components/CreatePanel.vue'
import { fixtureServices } from '../../src/fixtures/services'
import { createHomeModel, defaultLocation } from '../../src/services/home'
import { type FileRecord, type Result } from '../../src/contracts/office'

async function setup() {
  const services = fixtureServices()
  const model = createHomeModel(services, 'docs')
  await model.load(defaultLocation('docs'))
  const wrapper = mount(CreatePanel, {
    props: { noun: 'document', model, services, destination: 'Personal files' }
  })
  const opener = document.createElement('button')
  opener.textContent = 'Blank document'
  document.body.append(opener)
  opener.focus()
  // happy-dom does not implement scrolling; focus and mutation behavior still use the real component.
  const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
  return {
    wrapper,
    opener,
    model,
    services,
    close() {
      wrapper.unmount()
      model.dispose()
      opener.remove()
      scroll.mockRestore()
    }
  }
}
describe('inline creation', () => {
  it('creates nothing on open or cancel, hides a single format choice, and returns focus', async () => {
    const test = await setup()
    const blank = vi.spyOn(test.services.creation, 'blank')
    await test.wrapper.vm.open(undefined, test.opener)
    expect(test.wrapper.find('dialog').exists()).toBe(false)
    expect(test.wrapper.find('select').exists()).toBe(false)
    expect(test.wrapper.text()).toContain('ODT file')
    expect(blank).not.toHaveBeenCalled()
    await test.wrapper.get('section').trigger('keydown', { key: 'Escape' })
    expect(test.wrapper.find('section').exists()).toBe(false)
    expect(document.activeElement).toBe(test.opener)
    expect(blank).not.toHaveBeenCalled()
    test.close()
  })
  it('holds the one explicit creation while pending and retains fixable errors', async () => {
    const test = await setup()
    let finish!: (value: Result<FileRecord>) => void
    const blank = vi.spyOn(test.services.creation, 'blank').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    await test.wrapper.vm.open(undefined, test.opener)
    await test.wrapper.get('input').setValue('Reviewed name')
    await test.wrapper.get('form').trigger('submit')
    await flushPromises()
    await test.wrapper.get('form').trigger('submit')
    expect(blank).toHaveBeenCalledTimes(1)
    expect(test.wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    finish({ ok: false, error: 'conflict' })
    await flushPromises()
    expect(test.wrapper.text()).toContain('already exists')
    expect(test.wrapper.find('section').exists()).toBe(true)
    // A previous success must not make an invalid later submission look successful.
    test.model.state.created = {
      ref: { spaceId: 's', itemId: 'previous' },
      name: 'old.odt',
      kind: 'file',
      access: { read: true, write: true, createChild: false }
    }
    await test.wrapper.vm.open(undefined, test.opener)
    expect(test.model.state.created).toBeNull()
    test.close()
  })
})
