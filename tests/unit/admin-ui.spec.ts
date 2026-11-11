import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PolicyCreation from '../../src/administration/PolicyCreation.vue'
import OfficeAdministration from '../../src/views/OfficeAdministration.vue'
import { defaultPolicy } from '../../src/administration/policy'
import { fixtureCreationOptions } from '../../src/fixtures/creation'
import { fixtureServices } from '../../src/fixtures/services'
import { createOfficeContext } from '../../src/app/context'
import { fail, ok } from '../../src/contracts/office'
import { describeFolder } from '../../src/services/folderLabel'

describe('admin configuration workflows', () => {
  it('offers creation only for backend-advertised formats and refreshes provider loss', async () => {
    const formats = fixtureCreationOptions()
    const view = mount(PolicyCreation, {
      props: { draft: defaultPolicy(), formats, loading: false, error: '', disabled: false }
    })
    expect(view.find('input[aria-label="ODT"]').exists()).toBe(true)
    expect(view.find('input[aria-label="DOCX"]').exists()).toBe(false)
    await view.setProps({
      formats: formats.map((format) => ({ ...format, canCreate: false }))
    })
    expect(view.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(view.text()).toContain('No creation formats are advertised')
    view.unmount()
  })
  it('explains disconnected saving beside the disabled action', async () => {
    const services = fixtureServices()
    services.administration = {
      configured: false,
      permitted: () => true,
      load: vi
        .fn()
        .mockResolvedValue(ok({ policy: defaultPolicy(), revision: 'static', writable: false })),
      save: vi.fn()
    }
    const context = createOfficeContext(services)
    const view = mount(OfficeAdministration, {
      props: { context },
      global: { stubs: { AppSidebar: true, RouterLink: true } }
    })
    await flushPromises()
    expect(view.find('#admin-save-state').text()).toContain('Shared saving is not connected')
    expect(view.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(view.find('button[type="submit"]').attributes('aria-describedby')).toBe(
      'admin-save-state'
    )
    view.unmount()
    context.dispose()
  })
  it('clears stale write permission when a configuration reload fails', async () => {
    const services = fixtureServices()
    const save = vi.fn()
    services.administration = {
      configured: true,
      permitted: () => true,
      load: vi
        .fn()
        .mockResolvedValueOnce(ok({ policy: defaultPolicy(), revision: '"one"', writable: true }))
        .mockResolvedValueOnce(fail('forbiddenOrMissing')),
      save
    }
    const context = createOfficeContext(services)
    const view = mount(OfficeAdministration, {
      props: { context },
      global: { stubs: { AppSidebar: true, RouterLink: true } }
    })
    await flushPromises()
    await view.find('input[type="checkbox"]').setValue(false)
    expect(view.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await view
      .findAll('button')
      .find((button) => /^(Reload configuration|Discard draft and reload)$/.test(button.text()))!
      .trigger('click')
    await flushPromises()
    expect(view.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await view.find('form').trigger('submit')
    expect(save).not.toHaveBeenCalled()
    view.unmount()
    context.dispose()
  })
  it('switches sections by keyboard and preserves a draft across tabs and capability refresh', async () => {
    const services = fixtureServices()
    services.administration = {
      configured: true,
      permitted: () => true,
      load: vi
        .fn()
        .mockResolvedValue(ok({ policy: defaultPolicy(), revision: '"one"', writable: true })),
      save: vi.fn()
    }
    const context = createOfficeContext(services)
    const view = mount(OfficeAdministration, {
      props: { context },
      attachTo: document.body,
      global: { stubs: { AppSidebar: true, RouterLink: true } }
    })
    await flushPromises()
    await view.find('input[type="checkbox"]').setValue(false)
    await view.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
    expect(view.find('#admin-tab-1').attributes('aria-selected')).toBe('true')
    expect(document.activeElement?.id).toBe('admin-tab-1')
    await view
      .findAll('button')
      .find((button) => button.text() === 'Refresh capabilities')!
      .trigger('click')
    await flushPromises()
    await view.find('[role="tablist"]').trigger('keydown', { key: 'End' })
    expect(view.find('#admin-tab-2').attributes('aria-selected')).toBe('true')
    await view.find('[role="tablist"]').trigger('keydown', { key: 'Home' })
    expect((view.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    expect(view.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(view.text()).not.toContain('App shortcuts')
    view.unmount()
    context.dispose()
  })
  it('names nested folders even when an ID-addressed response has path /', async () => {
    const services = fixtureServices()
    const spaces = await services.catalog.listSpaces(new AbortController().signal)
    if (!spaces.ok) throw new Error('Fixture spaces missing')
    const ref = { spaceId: spaces.value[0]!.id, itemId: 'nested' }
    vi.spyOn(services.catalog, 'resolve').mockResolvedValue(
      ok({
        ref,
        kind: 'folder',
        name: 'Template samples',
        path: '/',
        access: { read: true, write: true, createChild: true }
      })
    )
    expect(await describeFolder(services.catalog, ref, new AbortController().signal)).toEqual(
      ok('Personal files / Template samples')
    )
  })
})
