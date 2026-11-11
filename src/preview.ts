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
import OfficeAdministration from './views/OfficeAdministration.vue'
import { fixtureAdministration } from './fixtures/administration'
import { policyApplications } from './administration/policy'
import { OcSpinner } from '@opencloud-eu/design-system/components'
import { officeApps } from './app/registry'
import { createOfficeContext } from './app/context'
import { fixtureServices } from './fixtures/services'

const services = fixtureServices({ seedHistory: true, preferenceStorage: window.sessionStorage })
services.administration = fixtureAdministration(
  window.sessionStorage,
  new URL(window.location.href).searchParams.get('admin') === '1'
)
const policySnapshot = await services.administration.load()
if (policySnapshot.ok) {
  services.policy = policySnapshot.value.policy
  services.applications = policyApplications(policySnapshot.value.policy)
  services.templateFolderDefault = services.policy.templateFolder ?? services.templateFolderDefault
}
const context = createOfficeContext(services)
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/office/admin',
      name: 'office-administration',
      component: OfficeAdministration,
      props: { context }
    },
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
