import { reactive, toRaw } from 'vue'
import { officeApps, validateMenu, type AppDescriptor } from './registry'
import type { HomeLocation, OfficeKind, OfficeServices } from '../contracts/office'
import { createHomeModel, type HomeModel } from '../services/home'
import type { RecentSort } from '../services/recentView'

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
  // Session-only view choices shared by the three apps; nothing about files is stored here.
  const preferences = reactive({ sort: 'opened' as RecentSort, layout: 'list' as 'list' | 'grid' })
  return {
    services,
    menu,
    preferences,
    views,
    lastView,
    model(kind: OfficeKind) {
      if (!models.has(kind)) models.set(kind, createHomeModel(services, kind))
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
