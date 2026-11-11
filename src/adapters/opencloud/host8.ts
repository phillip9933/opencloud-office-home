import { shallowRef, watch } from 'vue'
import {
  useAppProviderService,
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
import type { FileRef } from '../../contracts/office'
import { createNativeServices8 } from './native8'

function templateFolder(config: unknown): FileRef | undefined {
  if (!config || typeof config !== 'object' || !('templateFolder' in config)) return undefined
  const folder = config.templateFolder
  if (!folder || typeof folder !== 'object' || !('spaceId' in folder) || !('itemId' in folder))
    throw new Error('Office templateFolder requires canonical spaceId and itemId')
  const { spaceId, itemId } = folder
  const valid = (id: unknown): id is string =>
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= 2048 &&
    !/[/\\?#%\u0000-\u001f]/.test(id)
  if (!valid(spaceId) || !valid(itemId))
    throw new Error('Office templateFolder requires canonical spaceId and itemId')
  return { spaceId, itemId }
}

/** Bind only to the host's public composables. The app never copies or persists auth tokens. */
export function useNativeOffice8(applicationConfig: unknown) {
  const client = useClientService()
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
  const templates = templateFolder(applicationConfig)
  let generation = 0
  let disposeAdapter: (() => void) | undefined
  const session = () =>
    auth.userContextReady && user.user?.id
      ? JSON.stringify([config.serverUrl, user.user.id, generation])
      : undefined

  watch(
    () => [auth.userContextReady, user.user?.id, config.serverUrl],
    () => {
      generation++
      context.value?.dispose()
      disposeAdapter?.()
      context.value = undefined
      if (!auth.userContextReady || !user.user?.id || !config.serverUrl) return
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
          async open({ resource, space }, mode) {
            const options = { space, resources: [resource] }
            const action = actions
              .getAllOpenWithActions(options)
              .find((item) => item.name.startsWith('editor-external-') && item.route)
            const route = action?.route?.(options)
            if (!route || typeof route === 'string') return false
            // Web 8.2.1's external editor forwards view_mode to the app-provider. 'read' cannot
            // silently become 'write', even for an otherwise writable file.
            return !(await router.push({
              ...route,
              query: { ...route.query, view_mode: mode === 'view' ? 'read' : 'write' }
            }))
          },
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
          templateFolder: templates,
          filters: {
            favorites:
              'favorites' in capabilities.capabilities.files &&
              capabilities.capabilities.files.favorites === true,
            tags: capabilities.filesTags === true
          }
        }
      )
      disposeAdapter = native.dispose
      context.value = createOfficeContext(native.services)
    },
    { immediate: true, flush: 'sync' }
  )
  return context
}
