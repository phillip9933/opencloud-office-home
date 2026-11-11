import { defaultPolicy, parsePolicy } from '../administration/policy'
import type { Administration } from '../administration/store'
import { fail, ok } from '../contracts/office'
/** DEV-LIMIT(DL-002): synthetic policy storage for browser journeys, excluded from the native entry graph. */
export function fixtureAdministration(storage: Storage, permitted: boolean): Administration {
  const key = 'office-preview-policy'
  let revision = '"preview-1"'
  return {
    configured: true,
    permitted: () => permitted,
    load() {
      const raw = storage.getItem(key)
      return Promise.resolve(
        ok({
          policy: raw ? parsePolicy(JSON.parse(raw)) : defaultPolicy(),
          revision,
          writable: permitted
        })
      )
    },
    save(policy, expected) {
      if (!permitted) return Promise.resolve(fail('forbiddenOrMissing'))
      if (expected !== revision) return Promise.resolve(fail('conflict'))
      storage.setItem(key, JSON.stringify(parsePolicy(policy)))
      revision = `"preview-${Date.now()}"`
      return Promise.resolve(ok({ policy: parsePolicy(policy), revision, writable: true }))
    }
  }
}
