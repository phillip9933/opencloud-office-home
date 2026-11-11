import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { defineWebApplication, type AppMenuItemExtension } from '@opencloud-eu/web-pkg'
import '@opencloud-eu/extension-sdk/tailwind.css'
import './style.css'
import './styles/chrome.css'
import './styles/templates.css'
import './styles/files.css'
import { officeApps } from './app/registry'
import { createOfficeContext } from './app/context'
import { unconfiguredServices } from './adapters/opencloud/unconfigured'

export default defineWebApplication({
  setup() {
    const context = createOfficeContext(unconfiguredServices())
    const router = useRouter()
    return {
      appInfo: { id: 'office', name: 'Office', icon: 'file-text' },
      routes: [
        { path: '/', redirect: '/office/docs' },
        ...officeApps.map((app) => ({
          path: `/${app.id}`,
          name: app.id,
          component: () => import('./views/OfficeHome.vue'),
          props: { kind: app.id, context },
          meta: { authContext: 'user', title: app.label }
        }))
      ],
      extensions: computed<AppMenuItemExtension[]>(() =>
        context.menu.map((app) => ({
          id: `office.menu.${app.id}`,
          type: 'appMenuItem',
          label: () => app.label,
          icon: app.icon,
          handler: async () => {
            await router.push({ name: app.route })
          },
          priority: app.order
        }))
      )
    }
  }
})
