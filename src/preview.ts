import { createApp, h } from 'vue'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import '@opencloud-eu/design-system/dist/design-system.css'
import './style.css'
import './styles/chrome.css'
import './styles/templates.css'
import './styles/files.css'
import './styles/forms.css'
import './preview.css'
import OfficeHome from './views/OfficeHome.vue'
import OfficeSettings from './views/OfficeSettings.vue'
import { OcSpinner } from '@opencloud-eu/design-system/components'
import { officeApps } from './app/registry'
import { createOfficeContext } from './app/context'
import { fixtureServices } from './fixtures/services'

const context = createOfficeContext(
  fixtureServices({ seedHistory: true, preferenceStorage: window.sessionStorage })
)
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
      name: app.route,
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
