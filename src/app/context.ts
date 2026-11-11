import { reactive, toRaw, watch } from 'vue'
import { officeApps, validateMenu, type AppDescriptor } from './registry'
import type {
  FileRef,
  HomeLocation,
  OfficeKind,
  OfficeServices,
  RecentFilter
} from '../contracts/office'
import { createHomeModel, type HomeModel } from '../services/home'
import { createDetailLoader } from '../services/details'

export function createOfficeContext(
  services: OfficeServices,
  menuEntries: readonly AppDescriptor[] = services.applications ?? officeApps,
  installedRoutes: ReadonlySet<string> = new Set(officeApps.map((app) => app.route))
) {
  const details = createDetailLoader(services.catalog)
  const menu = validateMenu(menuEntries, installedRoutes)
  const models = new Map<OfficeKind, HomeModel>()
  const views = new Map<string, HomeLocation>()
  const lastView = new Map<OfficeKind, string>()
  let sequence = 0
  // View keys must not repeat across page loads: a stale key in the URL would otherwise be
  // replaced by an identical one, which the router treats as no navigation.
  const session = Math.random().toString(36).slice(2, 8)
  // View choices shared by the three apps, kept in the user's scoped browser store.
  const preferences = reactive(services.viewPreferences.load())
  const stopPreferences = watch(
    preferences,
    () => services.viewPreferences.save(toRaw(preferences)),
    { deep: true }
  )
  // Filters are session-only so a forgotten filter cannot hide files on the next visit.
  const recentFilter = reactive<RecentFilter>({ favorites: false, tags: [] })
  return {
    id: session,
    dispose() {
      stopPreferences()
      details.dispose()
      for (const model of models.values()) model.dispose()
      models.clear()
      views.clear()
      lastView.clear()
    },
    services,
    details,
    menu,
    preferences,
    recentFilter,
    views,
    lastView,
    model(kind: OfficeKind) {
      if (!models.has(kind))
        models.set(
          kind,
          createHomeModel(services, kind, recentFilter, () =>
            services.policy?.allowPersonalTemplates === false
              ? undefined
              : preferences.templateFolder
          )
        )
      return models.get(kind)!
    },
    rememberCreation(kind: OfficeKind, extension: string, folder: FileRef) {
      preferences.lastFormat[kind] = extension
      preferences.lastFolder[kind] = { spaceId: folder.spaceId, itemId: folder.itemId }
      preferences.createdCount = Math.min(preferences.createdCount + 1, 1000)
    },
    forgetFolder(kind: OfficeKind) {
      delete preferences.lastFolder[kind]
    },
    saveView(location: HomeLocation) {
      const id = `v${session}.${++sequence}`
      views.set(id, structuredClone(toRaw(location)))
      lastView.set(location.kind, id)
      // Bound session-only navigation metadata; old history falls back safely to the app root.
      if (views.size > 100) views.delete(views.keys().next().value!)
      return id
    }
  }
}
export type OfficeContext = ReturnType<typeof createOfficeContext>
