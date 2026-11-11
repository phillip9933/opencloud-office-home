import { describe, expect, it, vi } from 'vitest'

vi.mock('@opencloud-eu/web-pkg', () => ({
  defineWebApplication: <T>(definition: T) => definition,
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('../../src/adapters/opencloud/host8', () => ({
  useNativeOffice8: () => ({ value: undefined })
}))

import application from '../../src/index'

describe('Office application registration', () => {
  it('registers three authenticated destinations and the matching native menu entries', () => {
    const definition = application.setup({ applicationConfig: {} })
    expect(definition.appInfo?.id).toBe('office')
    const routes = definition.routes
    if (!Array.isArray(routes)) throw new Error('Expected declarative office routes')
    expect(
      routes.slice(1).map((route) => [route.name, route.path, route.meta?.authContext])
    ).toEqual([
      ['docs', '/docs', 'user'],
      ['sheets', '/sheets', 'user'],
      ['slides', '/slides', 'user']
    ])
    expect(definition.extensions?.value.map((entry) => entry.id)).toEqual([
      'office.menu.docs',
      'office.menu.sheets',
      'office.menu.slides'
    ])
  })
})
