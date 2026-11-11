import type { Result } from '../contracts/office'
import type { OfficePolicy } from './policy'

export interface PolicySnapshot {
  policy: OfficePolicy
  revision: string
  writable: boolean
}
/** Persistence must enforce authorization and conditional writes at its trusted boundary. */
export interface Administration {
  permitted(): boolean
  configured: boolean
  load(): Promise<Result<PolicySnapshot>>
  save(policy: OfficePolicy, revision: string): Promise<Result<PolicySnapshot>>
}
