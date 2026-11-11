import { reactive, toRaw, watch } from 'vue'
import { officeApps, validateMenu, type AppDescriptor } from './registry'
import type { HomeLocation, OfficeKind, OfficeServices, RecentFilter } from '../contracts/office'
import { createHomeModel, type HomeModel } from '../services/home'

export function createOfficeContext(
  services: OfficeServices,
  menuEntries: readonly AppDescriptor[] = officeApps,
  installedRoutes: ReadonlySet<string> = new Set(officeApps.map((app) => app.route))
) {
  const menu = validateMenu(menuEntries, installedRoutes)
  const models = new Map<OfficeKind, HomeModel>()
  const views = new Map<string, HomeLocation>()
  const lastView = new Map<OfficeKind, string>()
  let sequence = 0
  // View choices shared by the three apps, kept in the user's scoped browser store.
  const preferences = reactive(services.viewPreferences.load())
  watch(preferences, () => services.viewPreferences.save(toRaw(preferences)), { deep: true })
  // Filters are session-only so a forgotten filter cannot hide files on the next visit.
  const recentFilter = reactive<RecentFilter>({ favorites: false, tags: [] })
  return {
    services,
    menu,
    preferences,
    recentFilter,
    views,
    lastView,
    model(kind: OfficeKind) {
      if (!models.has(kind)) models.set(kind, createHomeModel(services, kind, recentFilter))
      return models.get(kind)!
    },
    saveView(location: HomeLocation) {
      const id = `v${++sequence}`
      views.set(id, structuredClone(toRaw(location)))
      lastView.set(location.kind, id)
      // Bound session-only navigation metadata; old history falls back safely to the app root.
      if (views.size > 100) views.delete(views.keys().next().value!)
      return id
    }
  }
}
export type OfficeContext = ReturnType<typeof createOfficeContext>
