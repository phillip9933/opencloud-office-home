import { computed, defineAsyncComponent, defineComponent, h } from 'vue'
import { defineWebApplication, useRouter, type AppMenuItemExtension } from '@opencloud-eu/web-pkg'
import '@opencloud-eu/extension-sdk/tailwind.css'
import './style.css'
import './styles/chrome.css'
import './styles/templates.css'
import './styles/files.css'
import { officeApps } from './app/registry'
import { useNativeOffice8 } from './adapters/opencloud/host8'
const OfficeHome = defineAsyncComponent(() => import('./views/OfficeHome.vue'))

export default defineWebApplication({
  setup({ applicationConfig }) {
    const context = useNativeOffice8(applicationConfig)
    const router = useRouter()
    return {
      appInfo: { id: 'office', name: 'Office Home', icon: 'file-text' },
      routes: [
        { path: '/', redirect: '/office/docs' },
        ...officeApps.map((app) => ({
          path: `/${app.id}`,
          name: app.id,
          component: defineComponent({
            setup: () => () =>
              context.value
                ? h(OfficeHome, { key: context.value.id, kind: app.id, context: context.value })
                : h('p', { role: 'status' }, 'Waiting for OpenCloud sign-in…')
          }),
          meta: { authContext: 'user', title: app.label }
        }))
      ],
      extensions: computed<AppMenuItemExtension[]>(() =>
        officeApps.map((app) => ({
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
