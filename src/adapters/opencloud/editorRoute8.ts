import type { useFileActions, useRouter } from '@opencloud-eu/web-pkg'
import type { NativeResource8 } from './native8'
import type { FileHandlerPreference } from '../../administration/policy'

/** Use the host's ordered native handlers; no file or credential URL is built here. */
export async function openNativeEditor8(
  actions: Pick<ReturnType<typeof useFileActions>, 'getAllOpenWithActions'>,
  router: Pick<ReturnType<typeof useRouter>, 'push'>,
  item: NativeResource8,
  mode: 'view' | 'edit',
  handlers: readonly FileHandlerPreference[] = []
): Promise<boolean> {
  const options = { space: item.space, resources: [item.resource] }
  const preference = handlers.find(
    (handler) =>
      item.file.mimeType === handler.mimeType &&
      item.file.name.toLowerCase().endsWith(`.${handler.extension}`)
  )
  const candidates = actions.getAllOpenWithActions(options)
  const action = candidates.find(
    (candidate) => candidate.route && (!preference || candidate.name === preference.action)
  )
  const route = action?.route?.(options)
  if (!route || typeof route === 'string') return false
  const external = action!.name.startsWith('editor-external-')
  // The generic native-app contract does not promise a forced read-only session for an
  // otherwise writable file. Do not silently turn the explicit read-only action into editing.
  if (!external && mode === 'view' && item.file.access.write) return false
  return !(await router.push(
    external
      ? { ...route, query: { ...route.query, view_mode: mode === 'view' ? 'read' : 'write' } }
      : route
  ))
}
