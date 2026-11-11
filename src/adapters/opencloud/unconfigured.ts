import { fail, type OfficeServices } from '../../contracts/office'
import { createRecentStore } from '../../preferences/recents'
import { createViewPreferenceStore } from '../../preferences/view'

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
      },
      recentlyChanged() {
        return Promise.resolve(fail('editorUnavailable'))
      },
      search() {
        return Promise.resolve(fail('editorUnavailable'))
      },
      listTags() {
        return Promise.resolve(fail('editorUnavailable'))
      },
      latestActivity() {
        return Promise.resolve(fail('editorUnavailable'))
      }
    },
    actions: {
      showInFiles: () => Promise.resolve(fail('editorUnavailable')),
      share: () => Promise.resolve(fail('editorUnavailable')),
      download: () => Promise.resolve(fail('editorUnavailable'))
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
    filters: { favorites: false, tags: false },
    viewPreferences: createViewPreferenceStore({ instance: 'unconfigured', user: 'unconfigured' }),
    recents: createRecentStore({
      instance: 'unconfigured',
      user: 'unconfigured'
    })
  }
}
