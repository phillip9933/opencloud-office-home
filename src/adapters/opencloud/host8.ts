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
  useRouter
} from '@opencloud-eu/web-pkg'
import { createOfficeContext, type OfficeContext } from '../../app/context'
import { createNativeServices8 } from './native8'
import { openNativeEditor8 } from './editorRoute8'
import { parseConfiguration } from '../../configuration'

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
    () => {
      generation++
      context.value?.dispose()
      disposeAdapter?.()
      context.value = undefined
      status.value = 'Waiting for OpenCloud sign-in…'
      if (!auth.userContextReady || !user.user?.id || !config.serverUrl) return
      status.value = 'Loading Office configuration…'
      let configuration
      try {
        configuration = parseConfiguration(applicationConfig)
      } catch {
        status.value =
          'Office configuration is invalid. Ask an administrator to check the app’s config.json.'
        return
      }
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
          requestNew: (url) => client.httpAuthenticated.post(url),
          open: (item, mode) => openNativeEditor8(actions, router, item, mode),
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
          configuration,
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
