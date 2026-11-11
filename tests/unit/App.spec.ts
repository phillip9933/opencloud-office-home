import { describe, expect, it, vi } from 'vitest'

vi.mock('@opencloud-eu/web-pkg', () => ({
  defineWebApplication: <T>(definition: T) => definition,
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('../../src/adapters/opencloud/host8', () => ({
  useNativeOffice8: () => ({
    context: { value: undefined },
    status: { value: 'Waiting for OpenCloud sign-in…' }
  })
}))

import application from '../../src/index'

describe('Office application registration', () => {
  it('registers one Office menu entry and authenticated family/settings destinations', () => {
    const definition = application.setup({ applicationConfig: {} })
    expect(definition.appInfo?.id).toBe('office')
    const routes = definition.routes
    if (!Array.isArray(routes)) throw new Error('Expected declarative office routes')
    expect(
      routes.slice(1).map((route) => [route.name, route.path, route.meta?.authContext])
    ).toEqual([
      ['settings', '/settings', 'user'],
      ['administration', '/admin', 'user'],
      ['docs', '/docs', 'user'],
      ['sheets', '/sheets', 'user'],
      ['slides', '/slides', 'user']
    ])
    expect(definition.extensions?.value.map((entry) => entry.id)).toEqual(['office.menu.home'])
  })
})
