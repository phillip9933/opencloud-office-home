// Test-only host: acknowledge a fixture write ambiguously, without changing production code.
import { createApp, h } from 'vue'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import '@opencloud-eu/design-system/dist/design-system.css'
import '../../src/style.css'
import '../../src/styles/chrome.css'
import '../../src/styles/templates.css'
import '../../src/styles/files.css'
import '../../src/styles/forms.css'
import '../../src/styles/folders.css'
import '../../src/preview.css'
import OfficeHome from '../../src/views/OfficeHome.vue'
import OfficeSettings from '../../src/views/OfficeSettings.vue'
import { fixtureServices } from '../../src/fixtures/services'
import { createOfficeContext } from '../../src/app/context'
import { officeApps, officeRoute } from '../../src/app/registry'
const services = fixtureServices({ seedHistory: true })
const blank = services.creation.blank
services.creation.blank = async (input) => {
  if (input.name !== 'Unconfirmed.odt') await blank(input)
  return { ok: false, error: 'timeout', outcome: 'uncertain' }
}
const context = createOfficeContext(services)
if (new URLSearchParams(location.search).get('case') === 'load-failure') {
  context.preferences.lastFolder.docs = { spaceId: 'fixture-personal', itemId: 'reports' }
  const listSpaces = services.catalog.listSpaces
  let first = true
  services.catalog.listSpaces = (signal) => {
    if (first) {
      first = false
      return Promise.resolve({ ok: false, error: 'network' })
    }
    return listSpaces(signal)
  }
}
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/office/settings',
      name: 'office-settings',
      component: OfficeSettings,
      props: { context }
    },
    ...officeApps.map((app) => ({
      path: `/office/${app.id}`,
      name: officeRoute(app.id),
      component: OfficeHome,
      props: { kind: app.id, context }
    })),
    { path: '/:pathMatch(.*)*', redirect: '/office/docs' }
  ]
})
createApp({ render: () => h(RouterView) })
  .provide('$router', router)
  .use(router)
  .mount('#app')
