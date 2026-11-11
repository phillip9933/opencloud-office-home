import { sdkRecord } from './metadata8'
import type { AppProviderCapability } from '@opencloud-eu/web-client/ocs'
import type { AppProviderService } from '@opencloud-eu/web-pkg'
import { officeApps } from '../../app/registry'
import { fail, ok, type Format, type OfficeCapabilities } from '../../contracts/office'

// These shapes come from the installed 8.x SDK. Web 8.2.1 loads `mimeTypes` from the
// unauthenticated app-registry list at boot, so the values describe the server, not a user.
export interface ProviderPort8 {
  appProviders: Pick<AppProviderService, 'mimeTypes'>
  capabilities: { filesAppProviders: readonly AppProviderCapability[] }
}

function hasNamedProvider(entry: Record<string, unknown>): boolean {
  // Providers are launched by name; the server already drops unnamed and desktop-only entries.
  return (
    Array.isArray(entry.app_providers) &&
    entry.app_providers.some((provider) => {
      const name = sdkRecord(provider)?.name
      return typeof name === 'string' && name.trim() !== ''
    })
  )
}

function matches(entry: Record<string, unknown>, format: Format): boolean {
  if (typeof entry.mime_type !== 'string' || entry.mime_type.toLowerCase() !== format.mimeType)
    return false
  // A present but contradictory extension is not treated as the family format.
  return entry.ext === undefined || String(entry.ext).toLowerCase() === format.extension
}

/**
 * DEV-LIMIT(DL-005): creation support derived from the 8.x registry; live provider acceptance remains open.
 */
export function createProviderCapabilities8(
  port: ProviderPort8,
  allowed: Partial<Record<'docs' | 'sheets' | 'slides', string[]>> = {}
): OfficeCapabilities {
  return {
    creationFormats(kind) {
      // Native Web posts to the first app-provider capability. Unknown enablement is not consent.
      const creation = sdkRecord(port.capabilities.filesAppProviders[0])
      if (
        creation?.enabled !== true ||
        typeof creation.new_url !== 'string' ||
        !creation.new_url.trim()
      )
        return Promise.resolve(fail('providerNotConfigured'))
      // Read on every call: the registry can change after the home screen loaded.
      const registry: unknown = port.appProviders.mimeTypes
      if (!Array.isArray(registry)) return Promise.resolve(fail('unknown'))
      const entries = registry.flatMap((value: unknown) => {
        const entry = sdkRecord(value)
        return entry && hasNamedProvider(entry) ? [entry] : []
      })
      const family = officeApps.find((app) => app.id === kind)!.formats
      const supported = family.filter((format) => entries.some((entry) => matches(entry, format)))
      if (!supported.length) return Promise.resolve(fail('providerNotConfigured'))
      return Promise.resolve(
        ok(
          supported
            .filter(
              (format) =>
                (!allowed[kind] || allowed[kind]!.includes(format.extension)) &&
                entries.some((entry) => matches(entry, format) && entry.allow_creation === true)
            )
            .map((format) => ({ ...format }))
        )
      )
    }
  }
}
