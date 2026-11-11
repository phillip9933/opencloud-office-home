import { fail, type OfficeServices } from '../../contracts/office'
import { createRecentStore } from '../../preferences/recents'

// DEV-LIMIT(DL-001): this is deliberately not an SDK implementation. No endpoint or provider is assumed.
// Replace only after release-specific adapter contracts and deployment checks pass.
export function unconfiguredServices(): OfficeServices {
  return {
    mode: 'unconfigured',
    catalog: {
      listSpaces() {
        return Promise.resolve(fail('editorUnavailable'))
      },
      list() {
        return Promise.resolve(fail('editorUnavailable'))
      },
      resolve() {
        return Promise.resolve(fail('editorUnavailable'))
      }
    },
    capabilities: {
      creationFormats() {
        return Promise.resolve(fail('editorUnavailable'))
      }
    },
    creation: {
      blank() {
        return Promise.resolve(fail('editorUnavailable'))
      },
      fromTemplate() {
        return Promise.resolve(fail('editorUnavailable'))
      }
    },
    editor: {
      open() {
        return Promise.resolve(fail('editorUnavailable'))
      }
    },
    templates: () => Promise.resolve(fail('editorUnavailable')),
    preview: () => Promise.resolve(fail('editorUnavailable')),
    recents: createRecentStore({
      instance: 'unconfigured',
      user: 'unconfigured'
    })
  }
}
