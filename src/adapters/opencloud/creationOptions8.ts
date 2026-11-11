import { fail } from '../../contracts/office'
import type { CreationFormat } from '../../administration/creation'
import { discoverProviderFormats8, type ProviderPort8 } from './providers8'
export function creationOptions8(
  port: ProviderPort8 & { refreshProviders?: () => Promise<void> },
  session: () => string | undefined
) {
  return async () => {
    const initial = session()
    if (!initial) return fail<CreationFormat[]>('unauthenticated')
    try {
      await port.refreshProviders?.()
      if (session() !== initial) return fail<CreationFormat[]>('unauthenticated')
      return discoverProviderFormats8(port)
    } catch {
      return fail<CreationFormat[]>(session() === initial ? 'unknown' : 'unauthenticated')
    }
  }
}
