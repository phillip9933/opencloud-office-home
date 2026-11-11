import type { AppError } from '../../contracts/office'
import { sdkRecord } from './metadata8'
// Preserve the HTTP category without retaining response bodies, URLs or personal data.
export class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`OpenCloud operation returned HTTP ${status}`)
    this.name = 'HttpStatusError'
  }
}

export function catalogError(error: unknown): AppError {
  const details = sdkRecord(error)
  if (details?.name === 'AbortError' || details?.code === 'ERR_CANCELED') return 'cancelled'
  const status = sdkRecord(details?.response)?.status ?? details?.statusCode ?? details?.status
  if (status === 401) return 'unauthenticated'
  if (status === 403 || status === 404) return 'forbiddenOrMissing'
  if (status === 409 || status === 412) return 'conflict'
  if (status === 507) return 'quotaExceeded'
  if (status === 408 || status === 504 || details?.code === 'ECONNABORTED') return 'timeout'
  if (details?.code === 'ERR_NETWORK') return 'network'
  return 'unknown'
}
