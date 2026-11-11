import { shallowRef, ref, watch, onScopeDispose } from 'vue'
import {
  useAppProviderService,
  useAbility,
  useAuthStore,
  useCapabilityStore,
  useClientService,
  useConfigStore,
  useDownloadFile,
  useFileActions,
  useFolderLink,
  usePreviewService,
  useUserStore,
  useRouter,
  useAppsStore
} from '@opencloud-eu/web-pkg'
import { createOfficeContext, type OfficeContext } from '../../app/context'
import { createNativeServices8 } from './native8'
import { openNativeEditor8 } from './editorRoute8'
import { configurationRef, defaultPolicy, parsePolicy } from '../../administration/policy'
import { createPolicyStore8 } from './policy8'

/** Bind only to the host's public composables. The app never copies or persists auth tokens. */
export function useNativeOffice8(applicationConfig: unknown) {
  const client = useClientService()
  const ability = useAbility()
  const config = useConfigStore()
  const auth = useAuthStore()
  const user = useUserStore()
  const providers = useAppProviderService()
  const capabilities = useCapabilityStore()
  const preview = usePreviewService()
  const actions = useFileActions()
  const { getParentFolderLink } = useFolderLink()
  const { downloadFile } = useDownloadFile()
  const router = useRouter()
  const apps = useAppsStore()
  const context = shallowRef<OfficeContext>()
  const status = ref('Waiting for OpenCloud sign-in…')
  let generation = 0
  let disposeAdapter: (() => void) | undefined
  const session = () =>
    auth.userContextReady && user.user?.id
      ? JSON.stringify([config.serverUrl, user.user.id, generation])
      : undefined
  onScopeDispose(() => {
    generation++
    context.value?.dispose()
    disposeAdapter?.()
    context.value = undefined
  })

  watch(
    () => [auth.userContextReady, user.user?.id, config.serverUrl],
    async () => {
      generation++
      const revision = generation
      context.value?.dispose()
      disposeAdapter?.()
      context.value = undefined
      status.value = 'Waiting for OpenCloud sign-in…'
      if (!auth.userContextReady || !user.user?.id || !config.serverUrl) return
      status.value = 'Loading Office configuration…'
      let policy
      let administration
      try {
        const raw =
          applicationConfig && typeof applicationConfig === 'object'
            ? (applicationConfig as Record<string, unknown>)
            : {}
        const templates =
          raw.templateFolder === undefined ? undefined : configurationRef(raw.templateFolder)
        const fallback =
          raw.policy === undefined
            ? { ...defaultPolicy(), ...(templates ? { templateFolder: templates } : {}) }
            : parsePolicy(raw.policy)
        administration = createPolicyStore8(
          { drives: client.graphAuthenticated.drives, webdav: client.webdav },
          raw.settingsFile === undefined ? undefined : configurationRef(raw.settingsFile),
          fallback,
          () => ability.can('update-all', 'Setting'),
          session
        )
        const loaded = await administration.load()
        if (revision !== generation) return
        if (!loaded.ok) {
          status.value =
            'Office configuration is unavailable. Ask an administrator to check its file access and contents.'
          return
        }
        policy = loaded.value.policy
      } catch {
        status.value =
          'Office configuration is invalid. Ask an administrator to check the app configuration.'
        return
      }
      if (revision !== generation || !auth.userContextReady || !user.user?.id) return
      let storage: Storage | undefined
      try {
        storage = window.localStorage
      } catch {
        /* Host/browser policy can require memory-only choices. */
      }
      const native = createNativeServices8(
        {
          drives: client.graphAuthenticated.drives,
          tags: client.graphAuthenticated.tags,
          activities: client.graphAuthenticated.activities,
          webdav: client.webdav,
          appProviders: providers,
          capabilities,
          refreshProviders: () => providers.loadData(),
          editorRegistrations: () =>
            apps.fileExtensions.flatMap((extension) => {
              const route = extension.routeName || extension.app
              if (!extension.app || !route || !router.hasRoute(route)) return []
              const label =
                typeof extension.label === 'function' ? extension.label() : extension.label
              return [
                {
                  action: `editor-${extension.app}`,
                  label: label || apps.apps[extension.app]?.name || extension.app,
                  extension: extension.extension?.toLowerCase(),
                  mimeType: extension.mimeType?.toLowerCase()
                }
              ]
            }),
          requestNew: (url) => client.httpAuthenticated.post(url),
          open: (item, mode) => openNativeEditor8(actions, router, item, mode, policy.handlers),
          async files({ resource }, sharing) {
            const route = getParentFolderLink(resource)
            if (!route.name || !router.hasRoute(route.name)) return false
            return !(await router.push({
              ...route,
              query: {
                ...route.query,
                scrollTo: resource.id,
                ...(sharing ? { details: 'sharing' } : {})
              }
            }))
          },
          download: ({ resource, space }) => downloadFile(space, resource),
          preview: ({ resource, space }, signal) =>
            preview.loadPreview({ space, resource, dimensions: [480, 360] }, false, true, signal)
        },
        {
          instance: config.serverUrl,
          user: user.user.id,
          session,
          storage,
          templateFolder: policy.templateFolder,
          policy,
          administration,
          filters: {
            favorites: ability.can('read', 'Favorite'),
            tags: capabilities.filesTags === true
          }
        }
      )
      disposeAdapter = native.dispose
      context.value = createOfficeContext(native.services)
    },
    { immediate: true, flush: 'sync' }
  )
  return { context, status }
}
