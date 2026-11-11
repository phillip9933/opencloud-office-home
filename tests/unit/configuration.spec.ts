import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TemplateStrip from '../../src/components/TemplateStrip.vue'
import { defaultConfiguration, parseConfiguration } from '../../src/configuration'
import { createProviderCapabilities8 } from '../../src/adapters/opencloud/providers8'
import { createOfficeContext } from '../../src/app/context'
import { fixtureServices } from '../../src/fixtures/services'

describe('static installation configuration', () => {
  it('directs users to the administrator when personal template selection is disabled', () => {
    const services = fixtureServices()
    services.configuration = { ...defaultConfiguration(), allowPersonalTemplates: false }
    const context = createOfficeContext(services)
    const wrapper = mount(TemplateStrip, {
      props: { kind: 'docs', noun: 'document', context, state: context.model('docs').state }
    })
    expect(wrapper.text()).toContain('Ask an administrator to configure the template folder.')
    expect(wrapper.text()).not.toContain('Choose a template folder in Settings.')
    wrapper.unmount()
    context.dispose()
  })
  it('applies the shared template policy even with an existing personal preference', async () => {
    const services = fixtureServices()
    const policy = parseConfiguration({
      ...defaultConfiguration(),
      templateFolder: { spaceId: 'shared', itemId: 'templates' },
      allowPersonalTemplates: false
    })
    services.configuration = policy
    const templates = vi.spyOn(services, 'templates')
    const context = createOfficeContext(services)
    context.preferences.templateFolder = { spaceId: 'personal', itemId: 'override' }
    await context.model('docs').load({ kind: 'docs', spaceId: '', folder: null, scroll: 0 })
    expect(templates).toHaveBeenCalledWith('docs', undefined)
    context.dispose()
  })
  it('keeps creation restrictions within built-in families and the backend allow-list', async () => {
    const policy = parseConfiguration({
      ...defaultConfiguration(),
      creationFormats: { docs: ['odt'] }
    })
    const registry = [
      {
        mime_type: 'application/vnd.oasis.opendocument.text',
        ext: 'odt',
        allow_creation: false,
        app_providers: [{ name: 'Office', icon: '', secure_view: false }]
      }
    ]
    const capabilities = createProviderCapabilities8(
      {
        appProviders: { mimeTypes: registry },
        capabilities: { filesAppProviders: [{ enabled: true, new_url: '/app/new' }] }
      },
      policy.creationFormats
    )
    expect(await capabilities.creationFormats('docs')).toEqual({ ok: true, value: [] })
    registry[0]!.allow_creation = true
    expect(await capabilities.creationFormats('docs')).toEqual({
      ok: true,
      value: [{ extension: 'odt', mimeType: registry[0]!.mime_type }]
    })
    expect(() =>
      parseConfiguration({ ...defaultConfiguration(), creationFormats: { docs: ['txt'] } })
    ).toThrow()
    expect(() =>
      parseConfiguration({ ...defaultConfiguration(), module: 'https://example.org/code.js' })
    ).toThrow()
  })
  it('uses defaults without setup and validates static installation fields', () => {
    expect(parseConfiguration(undefined)).toEqual(defaultConfiguration())
    expect(
      parseConfiguration({
        templateFolder: { spaceId: 'space', itemId: 'folder' },
        allowPersonalTemplates: false,
        creationFormats: { docs: [] }
      })
    ).toEqual({
      templateFolder: { spaceId: 'space', itemId: 'folder' },
      allowPersonalTemplates: false,
      creationFormats: { docs: [] }
    })
    for (const value of [
      null,
      [],
      { allowPersonalTemplates: 'false' },
      { creationFormats: { sheets: ['odt'] } },
      { creationFormats: { docs: ['odt', 'odt'] } },
      { templateFolder: { spaceId: 'space', itemId: '../file' } },
      { settingsFile: { spaceId: 'space', itemId: 'old' } },
      { policy: {} },
      { extra: 'x'.repeat(65536) }
    ]) {
      expect(() => parseConfiguration(value)).toThrow()
    }
  })
})
