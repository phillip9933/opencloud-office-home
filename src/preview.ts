import { createApp, h } from 'vue'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import '@opencloud-eu/design-system/dist/design-system.css'
import './style.css'
import './styles/chrome.css'
import './styles/templates.css'
import './styles/files.css'
import './styles/forms.css'
import './styles/folders.css'
import './preview.css'
import OfficeHome from './views/OfficeHome.vue'
import OfficeSettings from './views/OfficeSettings.vue'
import { OcSpinner } from '@opencloud-eu/design-system/components'
import { officeApps, officeRoute } from './app/registry'
import { createOfficeContext } from './app/context'
import { fixtureServices } from './fixtures/services'

const services = fixtureServices({
  delayMs: 80,
  seedHistory: true,
  preferenceStorage: window.sessionStorage
})
const context = createOfficeContext(services)
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
  .component('OcSpinner', OcSpinner)
  .use(router)
  .mount('#app')
