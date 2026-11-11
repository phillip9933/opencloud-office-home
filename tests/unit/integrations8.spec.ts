import { describe, it, expect } from 'vitest'
import type { MimeType } from '@opencloud-eu/web-pkg'
import {
  discoverProviderFormats8,
  createProviderCapabilities8
} from '../../src/adapters/opencloud/providers8'
import { integrationDirectory8 } from '../../src/adapters/opencloud/integrations8'
import { matchingEditors } from '../../src/administration/integrations'
const odt = {
  ext: 'odt',
  mime_type: 'application/vnd.oasis.opendocument.text',
  name: 'Document',
  allow_creation: true,
  app_providers: [{ name: 'Editor', icon: '', secure_view: false }]
}
const port = () => ({
  appProviders: {
    mimeTypes: [
      odt,
      { ...odt, ext: 'pdf', mime_type: 'application/pdf', allow_creation: false }
    ] as MimeType[]
  },
  capabilities: { filesAppProviders: [{ enabled: true, new_url: '/app/new' }] }
})
describe('installed integration inventory', () => {
  it('reports backend creation independently of Office restrictions and rechecks provider removal', async () => {
    const p = port()
    expect(
      await createProviderCapabilities8(p, undefined, { docs: [] }).creationFormats('docs')
    ).toEqual({ ok: true, value: [] })
    expect(discoverProviderFormats8(p)).toMatchObject({
      ok: true,
      value: [
        { extension: 'odt', canCreate: true, providers: ['Editor'] },
        { extension: 'pdf', canCreate: false }
      ]
    })
    p.capabilities.filesAppProviders[0]!.enabled = false
    expect(discoverProviderFormats8(p)).toMatchObject({
      ok: true,
      value: [{ canCreate: false }, { canCreate: false }]
    })
    p.appProviders.mimeTypes = []
    expect(discoverProviderFormats8(p)).toEqual({ ok: true, value: [] })
  })
  it('retains MIME-only backend entries without inventing an extension', () => {
    const p = port()
    p.appProviders.mimeTypes[1] = { mime_type: 'application/pdf', app_providers: odt.app_providers }
    expect(discoverProviderFormats8(p)).toMatchObject({
      ok: true,
      value: [
        { extension: 'odt' },
        { extension: '', mimeType: 'application/pdf', canCreate: false }
      ]
    })
  })
  it('rejects malformed registry entries and never invents editors or a signed-in context', async () => {
    const p = port()
    p.appProviders.mimeTypes.push(
      { ...odt, ext: '../bad' },
      { ...odt, ext: 'other', app_providers: [{ name: '', icon: '', secure_view: false }] }
    )
    let session: string | undefined = 'one'
    const directory = integrationDirectory8(p, () => session)
    expect(await directory()).toMatchObject({
      ok: true,
      value: { editors: [], formats: [{ extension: 'odt' }, { extension: 'pdf' }] }
    })
    session = undefined
    expect(await directory()).toEqual({ ok: false, error: 'unauthenticated' })
  })
  it('refreshes backend metadata and discards a result after the account changes', async () => {
    const p = port()
    let current: string | undefined = 'one'
    let complete: () => void = () => undefined
    const directory = integrationDirectory8(
      {
        ...p,
        refreshProviders: () =>
          new Promise<void>((resolve) => {
            complete = resolve
          })
      },
      () => current
    )
    const pending = directory()
    current = 'two'
    complete()
    expect(await pending).toEqual({ ok: false, error: 'unauthenticated' })
    const refreshed = integrationDirectory8(
      {
        ...p,
        refreshProviders: () => {
          p.appProviders.mimeTypes = []
          return Promise.resolve()
        }
      },
      () => current
    )
    expect(await refreshed()).toEqual({ ok: true, value: { formats: [], editors: [] } })
  })
  it('matches registered editor types, excludes mismatches and deduplicates action choices', () => {
    const directory = {
      formats: [],
      editors: [
        { action: 'editor-text', label: 'Text', extension: 'txt', mimeType: 'text/plain' },
        { action: 'editor-text', label: 'Text duplicate', extension: 'txt' },
        { action: 'editor-pdf', label: 'PDF', extension: 'pdf' },
        { action: 'editor-image', label: 'Image', mimeType: 'image' }
      ]
    }
    expect(
      matchingEditors(directory, { extension: 'txt', mimeType: 'text/plain' }).map(
        (editor) => editor.action
      )
    ).toEqual(['editor-text'])
    expect(
      matchingEditors(directory, { extension: 'png', mimeType: 'image/png' }).map(
        (editor) => editor.action
      )
    ).toEqual(['editor-image'])
    expect(
      matchingEditors(directory, { extension: 'txt', mimeType: 'application/pdf' }).map(
        (editor) => editor.action
      )
    ).toEqual(['editor-text'])
  })
})
