import { computed, defineAsyncComponent, defineComponent, h, type VNode } from 'vue'
import { defineWebApplication, useRouter, type AppMenuItemExtension } from '@opencloud-eu/web-pkg'
import '@opencloud-eu/extension-sdk/tailwind.css'
import './style.css'
import './styles/chrome.css'
import './styles/templates.css'
import './styles/files.css'
import './styles/forms.css'
import { officeApps } from './app/registry'
import { useNativeOffice8 } from './adapters/opencloud/host8'
const OfficeHome = defineAsyncComponent(() => import('./views/OfficeHome.vue'))
const OfficeSettings = defineAsyncComponent(() => import('./views/OfficeSettings.vue'))

// All authenticated route wrappers use the same session-aware rendering boundary.
function authenticatedPage(render: () => VNode) {
  return defineComponent({ setup: () => render })
}

export default defineWebApplication({
  setup({ applicationConfig }) {
    const context = useNativeOffice8(applicationConfig)
    const router = useRouter()
    return {
      appInfo: { id: 'office', name: 'Office Home', icon: 'file-text' },
      routes: [
        { path: '/', redirect: '/office/docs' },
        {
          path: '/settings',
          name: 'settings',
          component: authenticatedPage(() =>
            context.value
              ? h(OfficeSettings, { key: context.value.id, context: context.value })
              : h('p', { role: 'status' }, 'Waiting for OpenCloud sign-in…')
          ),
          meta: { authContext: 'user', title: 'Office settings' }
        },
        ...officeApps.map((app) => ({
          path: `/${app.id}`,
          name: app.id,
          component: authenticatedPage(() =>
            context.value
              ? h(OfficeHome, { key: context.value.id, kind: app.id, context: context.value })
              : h('p', { role: 'status' }, 'Waiting for OpenCloud sign-in…')
          ),
          meta: { authContext: 'user', title: app.label }
        }))
      ],
      extensions: computed<AppMenuItemExtension[]>(() => [
        {
          id: 'office.menu.home',
          type: 'appMenuItem',
          label: () => 'Office',
          icon: 'file-text',
          handler: async () => {
            const kind = context.value?.preferences.lastKind ?? 'docs'
            const view = context.value?.lastView.get(kind)
            await router.push({ name: `office-${kind}`, query: view ? { view } : {} })
          },
          priority: 40
        }
      ])
    }
  }
})
