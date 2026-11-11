import { fail, ok } from '../../contracts/office'
import type { IntegrationDirectory, RegisteredEditor } from '../../administration/integrations'
import { discoverProviderFormats8, type ProviderPort8 } from './providers8'

/** Read installed registrations only; per-resource native checks still own every launch. */
export function integrationDirectory8(
  port: ProviderPort8 & {
    editorRegistrations?: () => RegisteredEditor[]
    refreshProviders?: () => Promise<void>
  },
  session: () => string | undefined
) {
  return async () => {
    const initial = session()
    if (!initial) return fail<IntegrationDirectory>('unauthenticated')
    try {
      await port.refreshProviders?.()
      if (session() !== initial) return fail<IntegrationDirectory>('unauthenticated')
      const formats = discoverProviderFormats8(port)
      if (!formats.ok) return formats
      const editors = (port.editorRegistrations?.() ?? []).filter(
        (editor) =>
          /^[a-zA-Z0-9._/-]{1,150}$/.test(editor.action) &&
          typeof editor.label === 'string' &&
          editor.label.length > 0 &&
          editor.label.length <= 150 &&
          (!editor.extension || /^[a-z0-9]{1,12}$/.test(editor.extension)) &&
          (!editor.mimeType || /^[a-z0-9.+-]+(?:\/[a-z0-9.+-]+)?$/.test(editor.mimeType))
      )
      return ok({ formats: formats.value, editors })
    } catch {
      return fail<IntegrationDirectory>(session() === initial ? 'unknown' : 'unauthenticated')
    }
  }
}
