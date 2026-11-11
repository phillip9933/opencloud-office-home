import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TemplateStrip from '../../src/components/TemplateStrip.vue'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultPolicy,
  parsePolicy,
  policyApplications,
  shortcutHref
} from '../../src/administration/policy'
import { createPolicyStore8, type PolicyPort8 } from '../../src/adapters/opencloud/policy8'
import { createProviderCapabilities8 } from '../../src/adapters/opencloud/providers8'
import { createOfficeContext } from '../../src/app/context'
import { fixtureServices } from '../../src/fixtures/services'

describe('administrator configuration validation and enforcement', () => {
  it('directs users to the administrator when personal template selection is disabled', () => {
    const services = fixtureServices()
    services.policy = { ...defaultPolicy(), allowPersonalTemplates: false }
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
    const policy = parsePolicy({
      ...defaultPolicy(),
      templateFolder: { spaceId: 'shared', itemId: 'templates' },
      allowPersonalTemplates: false
    })
    services.policy = policy
    const templates = vi.spyOn(services, 'templates')
    const context = createOfficeContext(services)
    context.preferences.templateFolder = { spaceId: 'personal', itemId: 'override' }
    await context
      .model('docs')
      .load({ kind: 'docs', spaceId: '', folder: null, trail: [], scroll: 0 })
    expect(templates).toHaveBeenCalledWith('docs', undefined)
    context.dispose()
  })
  it('allows additional formats without overriding the server creation allow-list', async () => {
    const policy = parsePolicy({
      ...defaultPolicy(),
      additionalFormats: { docs: [{ extension: 'txt', mimeType: 'text/plain' }] },
      creationFormats: { docs: ['txt'] }
    })
    const registry = [
      {
        mime_type: 'text/plain',
        ext: 'txt',
        allow_creation: false,
        app_providers: [{ name: 'Native text', icon: '', secure_view: false }]
      }
    ]
    const capabilities = createProviderCapabilities8(
      {
        appProviders: { mimeTypes: registry },
        capabilities: { filesAppProviders: [{ enabled: true, new_url: '/app/new' }] }
      },
      policyApplications(policy),
      policy.creationFormats
    )
    expect(await capabilities.creationFormats('docs')).toEqual({ ok: true, value: [] })
    registry[0]!.allow_creation = true
    expect(await capabilities.creationFormats('docs')).toEqual({
      ok: true,
      value: [{ extension: 'txt', mimeType: 'text/plain' }]
    })
  })
  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'http://example.org',
    'https://user:secret@example.org',
    'https://example.org/?access_token=secret',
    '//example.org',
    '/\\example.org'
  ])('refuses executable, credential-bearing or insecure shortcut %s', (href) => {
    expect(() => shortcutHref(href)).toThrow()
  })
  it('normalizes safe links and refuses duplicate formats and remote executable fields', () => {
    expect(shortcutHref('https://example.org')).toBe('https://example.org/')
    expect(shortcutHref('/photos?view=grid')).toBe('/photos?view=grid')
    expect(() =>
      parsePolicy({
        ...defaultPolicy(),
        additionalFormats: { docs: [{ extension: 'odt', mimeType: 'text/plain' }] }
      })
    ).toThrow()
    expect(() =>
      parsePolicy({ ...defaultPolicy(), module: 'https://example.org/code.js' })
    ).toThrow()
    expect(() =>
      parsePolicy({
        ...defaultPolicy(),
        handlers: [{ extension: 'txt', mimeType: 'text/plain', action: 'https://example.org' }]
      })
    ).toThrow()
  })
})

function setup() {
  let session: string | undefined = 'session-a'
  let admin = true
  let policy = defaultPolicy()
  let etag = '"one"'
  const resource: Resource = {
    id: 'config',
    fileId: 'config',
    path: '/',
    name: 'office-home.settings.json',
    size: 300,
    isFolder: false,
    permissions: 'RDNVWZP',
    canDownload: () => true,
    canCreate: () => false
  }
  // Only metadata fields consumed by this port are relevant to this synthetic drive.
  const space = { id: 'space', driveType: 'project', disabled: false } as SpaceResource
  const port = {
    drives: {
      listMyDrives: vi.fn<PolicyPort8['drives']['listMyDrives']>().mockResolvedValue([space])
    },
    webdav: {
      getFileInfo: vi.fn<PolicyPort8['webdav']['getFileInfo']>().mockResolvedValue(resource),
      getFileContents: vi.fn<PolicyPort8['webdav']['getFileContents']>().mockImplementation(() =>
        Promise.resolve({
          body: JSON.stringify(policy),
          headers: { ETag: etag }
        })
      ),
      putFileContents: vi
        .fn<PolicyPort8['webdav']['putFileContents']>()
        .mockImplementation((_space, options) => {
          if (options?.previousEntityTag !== etag) return Promise.reject({ status: 412 })
          policy = parsePolicy(JSON.parse(String(options?.content)))
          etag = '"two"'
          return Promise.resolve(resource)
        })
    }
  } satisfies PolicyPort8
  const store = createPolicyStore8(
    port,
    { spaceId: 'space', itemId: 'config' },
    defaultPolicy(),
    () => admin,
    () => session
  )
  return {
    port,
    store,
    resource,
    setAdmin: (value: boolean) => {
      admin = value
    },
    logout: () => {
      session = undefined
    },
    setEtag: (value: string) => {
      etag = value
    }
  }
}
describe('native configuration file boundary', () => {
  it('uses canonical file identity and a conditional write, then confirms the saved policy', async () => {
    const t = setup()
    const loaded = await t.store.load()
    expect(loaded.ok && loaded.value.writable).toBe(true)
    const policy = { ...defaultPolicy(), allowPersonalTemplates: false }
    const saved = await t.store.save(policy, '"one"')
    expect(saved.ok && saved.value.policy.allowPersonalTemplates).toBe(false)
    expect(t.port.webdav.putFileContents.mock.calls[0]![1]).toMatchObject({
      parentFolderId: 'config',
      previousEntityTag: '"one"',
      overwrite: true
    })
    expect(t.port.webdav.putFileContents).toHaveBeenCalledOnce()
  })
  it('refuses non-administrators and read-only files before a write', async () => {
    const t = setup()
    t.setAdmin(false)
    expect(await t.store.save(defaultPolicy(), '"one"')).toEqual({
      ok: false,
      error: 'forbiddenOrMissing'
    })
    t.setAdmin(true)
    t.resource.permissions = 'R'
    t.resource.canCreate = () => false
    expect(await t.store.save(defaultPolicy(), '"one"')).toEqual({
      ok: false,
      error: 'forbiddenOrMissing'
    })
    expect(t.port.webdav.putFileContents).not.toHaveBeenCalled()
  })
  it('does not overwrite a changed configuration or accept an unguarded revision', async () => {
    const t = setup()
    t.setEtag('"newer"')
    expect(await t.store.save(defaultPolicy(), '"one"')).toEqual({ ok: false, error: 'conflict' })
    expect(await t.store.save(defaultPolicy(), '')).toEqual({ ok: false, error: 'conflict' })
    expect(t.port.webdav.putFileContents).toHaveBeenCalledOnce()
  })
  it('propagates a server authorization denial without trying another destination', async () => {
    const t = setup()
    t.port.webdav.putFileContents.mockRejectedValue({ status: 403 })
    expect(await t.store.save(defaultPolicy(), '"one"')).toEqual({
      ok: false,
      error: 'forbiddenOrMissing'
    })
    expect(t.port.webdav.putFileContents).toHaveBeenCalledOnce()
  })
  it('rejects identity substitution, missing revisions and late responses after logout', async () => {
    const t = setup()
    t.resource.fileId = 'other'
    expect((await t.store.load()).ok).toBe(false)
    expect(t.port.webdav.getFileContents).not.toHaveBeenCalled()
    t.resource.fileId = 'config'
    t.setEtag('weak')
    expect(await t.store.load()).toEqual({ ok: false, error: 'unsupportedType' })
    t.port.webdav.getFileContents.mockImplementation(() => {
      t.logout()
      return Promise.resolve({ body: '{}', headers: { ETag: '"one"' } })
    })
    expect(await t.store.load()).toEqual({ ok: false, error: 'unauthenticated' })
  })
  it('locks repeated saves and reports an uncertain response without retrying', async () => {
    const t = setup()
    let finish!: () => void
    t.port.webdav.putFileContents.mockImplementation(
      () =>
        new Promise((_, reject) => {
          finish = () => reject({ code: 'ERR_NETWORK' })
        })
    )
    const pending = t.store.save(defaultPolicy(), '"one"')
    await vi.waitFor(() => expect(t.port.webdav.putFileContents).toHaveBeenCalledOnce())
    expect(await t.store.save(defaultPolicy(), '"one"')).toEqual({ ok: false, error: 'conflict' })
    finish()
    expect(await pending).toEqual({ ok: false, error: 'network' })
    expect(t.port.webdav.putFileContents).toHaveBeenCalledOnce()
  })
})
