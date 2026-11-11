import { effectScope } from 'vue'
import { expect, it, vi } from 'vitest'

const hostPolicy = vi.hoisted(() => ({ favorites: true, editors: false }))
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
  useAppsStore: () => ({
    apps: { 'native-editor': { name: 'Native Editor' } },
    fileExtensions: hostPolicy.editors
      ? [
          {
            app: 'native-editor',
            extension: 'TXT',
            mimeType: 'text/plain',
            routeName: 'native-editor-route'
          },
          { app: 'missing-editor', extension: 'txt', routeName: 'missing-route' }
        ]
      : []
  }),
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

it('discovers only installed native editor routes without needing a real resource or credentials', async () => {
  hostPolicy.editors = true
  const scope = effectScope()
  const { context } = scope.run(() => useNativeOffice8({}))!
  await vi.waitFor(() => expect(context.value).toBeDefined())
  expect(await context.value!.services.integrations!()).toMatchObject({
    ok: true,
    value: {
      editors: [
        {
          action: 'editor-native-editor',
          label: 'Native Editor',
          extension: 'txt',
          mimeType: 'text/plain'
        }
      ]
    }
  })
  context.value?.dispose()
  scope.stop()
  hostPolicy.editors = false
})
