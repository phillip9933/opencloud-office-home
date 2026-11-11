import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PolicyIntegrations from '../../src/administration/PolicyIntegrations.vue'
import PolicyCreation from '../../src/administration/PolicyCreation.vue'
import OfficeAdministration from '../../src/views/OfficeAdministration.vue'
import { defaultPolicy } from '../../src/administration/policy'
import { fixtureIntegrations } from '../../src/fixtures/integrations'
import { fixtureServices } from '../../src/fixtures/services'
import { createOfficeContext } from '../../src/app/context'
import { fail, ok } from '../../src/contracts/office'
import { describeFolder } from '../../src/services/folderLabel'

function integrations() {
  const view = mount(PolicyIntegrations, {
    props: {
      draft: defaultPolicy(),
      directory: fixtureIntegrations(),
      loading: false,
      error: '',
      disabled: false,
      'onUpdate:draft': (value: ReturnType<typeof defaultPolicy>) => {
        void view.setProps({ draft: value })
      }
    }
  })
  return view
}
describe('admin configuration workflows', () => {
  it('keeps an invalid app URL error in the app section and clears it when corrected', async () => {
    const wrapper = integrations()
    await wrapper.find('input[maxlength="80"]').setValue('Test app')
    await wrapper.find('input[maxlength="2048"]').setValue('http://example.org')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add app')!
      .trigger('click')
    expect(wrapper.find('#admin-apps-heading').element.closest('section')!.textContent).toContain(
      'HTTPS URL'
    )
    expect(
      wrapper.find('#admin-formats-heading').element.closest('section')!.textContent
    ).not.toContain('HTTPS URL')
    await wrapper.find('input[maxlength="2048"]').setValue('https://example.org')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add app')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Website shortcut · no file integration')
    wrapper.unmount()
  })
  it('maps a discovered type to its installed editor and keeps shortcuts out of the choices', async () => {
    const wrapper = integrations()
    const select = wrapper
      .findAll('select')
      .find((select) => select.element.parentElement?.textContent?.includes('Backend file type'))!
    await select.setValue('txt:text/plain')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add file type')!
      .trigger('click')
    await flushPromises()
    const editor = wrapper.find('select[aria-label="Editor for Docs TXT"]')
    expect(editor.text()).toContain('Synthetic Text')
    expect(editor.text()).not.toContain('https://')
    await editor.setValue('editor-synthetic-text')
    await flushPromises()
    expect(wrapper.props('draft').handlers).toContainEqual({
      extension: 'txt',
      mimeType: 'text/plain',
      action: 'editor-synthetic-text'
    })
    await editor.setValue('')
    expect(wrapper.props('draft').handlers).toEqual([])
    wrapper.unmount()
  })
  it('requests an extension for MIME-only backend types while keeping the advertised MIME fixed', async () => {
    const wrapper = integrations()
    const directory = fixtureIntegrations()
    directory.formats.push({
      extension: '',
      mimeType: 'application/pdf',
      label: 'PDF',
      providers: ['PDF reader'],
      canCreate: false
    })
    await wrapper.setProps({ directory })
    const select = wrapper
      .findAll('select')
      .find((select) => select.element.parentElement?.textContent?.includes('Backend file type'))!
    await select.setValue(':application/pdf')
    expect(wrapper.find('input[placeholder="text/plain"]').exists()).toBe(false)
    await wrapper.find('input[placeholder="txt"]').setValue('.PDF')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add file type')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.props('draft').additionalFormats.docs).toContainEqual({
      extension: 'pdf',
      mimeType: 'application/pdf'
    })
    wrapper.unmount()
  })
  it('offers creation only for backend-advertised formats and refreshes provider loss', async () => {
    const directory = fixtureIntegrations()
    const view = mount(PolicyCreation, {
      props: { draft: defaultPolicy(), directory, loading: false, error: '', disabled: false }
    })
    expect(view.find('input[aria-label="ODT"]').exists()).toBe(true)
    expect(view.find('input[aria-label="DOCX"]').exists()).toBe(false)
    await view.setProps({
      directory: {
        ...directory,
        formats: directory.formats.map((format) => ({ ...format, canCreate: false }))
      }
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
