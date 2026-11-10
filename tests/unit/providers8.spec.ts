import type { MimeType } from '@opencloud-eu/web-pkg'
import type { AppProviderCapability } from '@opencloud-eu/web-client/ocs'
import { describe, expect, it } from 'vitest'
import {
  createProviderCapabilities8,
  type ProviderPort8
} from '../../src/adapters/opencloud/providers8'
import { createHomeModel, defaultLocation } from '../../src/services/home'
import { fixtureServices } from '../../src/fixtures/services'
import type { OfficeKind } from '../../src/contracts/office'

// Captured unauthenticated from an OpenCloud 9.0.0 server running Web 8.2.1 on 2026-11-11.
// `/app/list` is a public, user-independent endpoint there; it advertised no providers.
const liveCapability: AppProviderCapability = {
  enabled: true,
  version: '1.1.0',
  apps_url: '/app/list',
  open_url: '/app/open',
  new_url: '/app/new'
}
const liveRegistry: MimeType[] = []

// Synthetic entries in the Web 8.2.1 MimeTypesToAppsSchema shape; not a captured provider.
const odt: MimeType = {
  mime_type: 'application/vnd.oasis.opendocument.text',
  ext: 'odt',
  name: 'OpenDocument',
  allow_creation: true,
  default_application: 'Synthetic Editor',
  app_providers: [{ name: 'Synthetic Editor', icon: '', secure_view: false }]
}
const docx: MimeType = {
  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ext: 'docx',
  allow_creation: false,
  app_providers: [{ name: 'Synthetic Editor', icon: '', secure_view: false }]
}
const ods: MimeType = {
  mime_type: 'application/vnd.oasis.opendocument.spreadsheet',
  ext: 'ods',
  allow_creation: true,
  app_providers: [{ name: 'Synthetic Editor', icon: '', secure_view: false }]
}

function port(mimeTypes: unknown, capabilities: unknown[] = [liveCapability]): ProviderPort8 {
  return {
    appProviders: { mimeTypes: mimeTypes as MimeType[] },
    capabilities: { filesAppProviders: capabilities as AppProviderCapability[] }
  }
}
const formats = (p: ProviderPort8, kind: OfficeKind) =>
  createProviderCapabilities8(p).creationFormats(kind)

describe('8.x provider capability candidate', () => {
  it.each<OfficeKind>(['docs', 'sheets', 'slides'])(
    'reports the captured empty registry as not configured for %s',
    async (kind) => {
      expect(await formats(port(liveRegistry), kind)).toEqual({
        ok: false,
        error: 'providerNotConfigured'
      })
    }
  )
  it('shows the not-configured reason on a home screen instead of creation controls', async () => {
    const services = fixtureServices()
    services.capabilities = createProviderCapabilities8(port(liveRegistry))
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.formats).toEqual([])
    expect(home.state.formatError).toContain('No office editor is configured')
    await home.create('Draft', 'odt')
    expect(home.state.created).toBeNull()
  })
  it('offers only family formats the registry allows creating', async () => {
    const p = port([odt, docx, ods])
    expect(await formats(p, 'docs')).toEqual({
      ok: true,
      value: [{ extension: 'odt', mimeType: odt.mime_type }]
    })
    expect(await formats(p, 'sheets')).toEqual({
      ok: true,
      value: [{ extension: 'ods', mimeType: ods.mime_type }]
    })
    expect(await formats(p, 'slides')).toEqual({ ok: false, error: 'providerNotConfigured' })
  })
  it('distinguishes an editor that opens but cannot create from no editor', async () => {
    const services = fixtureServices()
    services.capabilities = createProviderCapabilities8(port([docx]))
    expect(await services.capabilities.creationFormats('docs')).toEqual({ ok: true, value: [] })
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.formatError).toContain('not supported by the configured editor')
  })
  it.each([
    ['disabled', [{ ...liveCapability, enabled: false }]],
    ['unknown enablement', [{ new_url: '/app/new' }]],
    ['missing creation endpoint', [{ enabled: true }]],
    ['absent', []]
  ])('refuses creation when the app-provider capability is %s', async (_label, capabilities) => {
    expect(await formats(port([odt], capabilities), 'docs')).toEqual({
      ok: false,
      error: 'providerNotConfigured'
    })
  })
  it('ignores unnamed providers, contradictory extensions and malformed entries', async () => {
    const registry = [
      { ...odt, app_providers: [{ name: ' ', icon: '' }] },
      { ...odt, ext: 'ott' },
      { ...odt, mime_type: 42 },
      null,
      'text'
    ]
    expect(await formats(port(registry), 'docs')).toEqual({
      ok: false,
      error: 'providerNotConfigured'
    })
    expect(await formats(port({ 'mime-types': [odt] }), 'docs')).toEqual({
      ok: false,
      error: 'unknown'
    })
  })
  it('rechecks the registry so a provider removed after loading blocks creation', async () => {
    const p = port([odt])
    const services = fixtureServices()
    services.capabilities = createProviderCapabilities8(p)
    const home = createHomeModel(services, 'docs')
    await home.load(defaultLocation('docs'))
    expect(home.state.formats.map((f) => f.extension)).toEqual(['odt'])
    p.appProviders.mimeTypes = []
    await home.create('Draft', 'odt')
    expect(home.state.created).toBeNull()
    expect(home.state.notice).toContain('No office editor is configured')
  })
})
