import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { officeRoute } from '../../src/app/registry'

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
  it('retains authenticated Office URLs under the store installation ID', async () => {
    const definition = application.setup({ applicationConfig: {} })
    const appId = definition.appInfo?.id
    expect(appId).toBe('office-home')
    const routes = definition.routes
    if (!Array.isArray(routes)) throw new Error('Expected declarative office routes')
    // OpenCloud Web 8.2 prefixes app paths and route names in container/api.ts.
    for (const route of routes) {
      route.path = `/${appId}${route.path}`
      for (const child of route.children ?? []) {
        if (child.name) child.name = `${appId}-${String(child.name)}`
      }
    }
    const router = createRouter({ history: createMemoryHistory(), routes })
    for (const page of ['docs', 'sheets', 'slides', 'draw', 'settings'] as const) {
      const path = `/office/${page}`
      expect(router.resolve({ name: officeRoute(page) }).path).toBe(path)
      expect(router.resolve(path).meta.authContext).toBe('user')
    }
    for (const root of ['/office', '/office-home']) {
      await router.push(`${root}?view=favorites`)
      expect(router.currentRoute.value.fullPath).toBe('/office/docs?view=favorites')
    }
    expect(definition.extensions?.value.map((entry) => entry.id)).toEqual(['office.menu.home'])
  })
})
