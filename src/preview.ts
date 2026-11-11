import { createApp, h } from 'vue'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import '@opencloud-eu/design-system/dist/design-system.css'
import './style.css'
import './preview.css'
import OfficeHome from './views/OfficeHome.vue'
import { OcSpinner } from '@opencloud-eu/design-system/components'
import { officeApps } from './app/registry'
import { createOfficeContext } from './app/context'
import { fixtureServices } from './fixtures/services'

const context = createOfficeContext(fixtureServices({ seedHistory: true }))
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
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
  .component('OcSpinner', OcSpinner)
  .use(router)
  .mount('#app')
