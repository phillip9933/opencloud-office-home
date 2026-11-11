import { effectScope } from 'vue'
import { expect, it, vi } from 'vitest'

const hostPolicy = vi.hoisted(() => ({ favorites: true }))
vi.mock('@opencloud-eu/web-pkg', () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      action === 'read' && subject === 'Favorite' && hostPolicy.favorites
  }),
  useClientService: () => ({
    graphAuthenticated: { drives: {}, tags: {}, activities: {} },
    webdav: {}
  }),
  useConfigStore: () => ({ serverUrl: 'https://cloud.example' }),
  useAuthStore: () => ({ userContextReady: true }),
  useUserStore: () => ({ user: { id: 'synthetic-user' } }),
  useAppProviderService: () => ({ mimeTypes: [], loadData: () => Promise.resolve() }),
  useCapabilityStore: () => ({ filesAppProviders: [], filesTags: false }),
  usePreviewService: () => ({ loadPreview: vi.fn() }),
  useFileActions: () => ({ getAllOpenWithActions: vi.fn() }),
  useFolderLink: () => ({ getParentFolderLink: vi.fn() }),
  useDownloadFile: () => ({ downloadFile: vi.fn() }),
  // The native Favorites view is not named files-favorites. Its visibility follows ability.
  useRouter: () => ({ hasRoute: (name: string) => name === 'native-editor-route', push: vi.fn() })
}))
import { useNativeOffice8 } from '../../src/adapters/opencloud/host8'

it.each([true, false])(
  'uses native Favorite read ability (%s) instead of a guessed route name',
  async (allowed) => {
    hostPolicy.favorites = allowed
    const scope = effectScope()
    const { context } = scope.run(() => useNativeOffice8({}))!
    await vi.waitFor(() => expect(context.value?.services.filters.favorites).toBe(allowed))
    context.value?.dispose()
    scope.stop()
  }
)

it('exposes backend creation capabilities without app-registration customization', async () => {
  const scope = effectScope()
  const { context } = scope.run(() => useNativeOffice8({}))!
  await vi.waitFor(() => expect(context.value).toBeDefined())
  expect(await context.value!.services.creationOptions!()).toEqual({ ok: true, value: [] })
  context.value?.dispose()
  scope.stop()
})
