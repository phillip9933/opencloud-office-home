import { reactive } from 'vue'
import { officeApps } from '../app/registry'
import type { RecentEntry } from './recentView'
import {
  fail,
  refKey,
  type CreationRequest,
  type FileRecord,
  type FileRef,
  type Format,
  type HomeLocation,
  type OfficeKind,
  type OfficeServices,
  type RecentFilter,
  type Space,
  type Template
} from '../contracts/office'

import { attempt, errorText } from './errors'
import { recentLoader } from './loadRecent'
import { createOfficeFile, findCreation } from './creation'
export function defaultLocation(kind: OfficeKind): HomeLocation {
  return { kind, spaceId: '', folder: null, scroll: 0 }
}
export type FileMenuAction =
  'open' | 'openReadOnly' | 'showInFiles' | 'copyLink' | 'download' | 'share'
export function createHomeModel(
  services: OfficeServices,
  kind: OfficeKind,
  filter: RecentFilter = { favorites: false, tags: [] },
  templateFolder: () => FileRef | undefined = () => undefined
) {
  const state = reactive({
    location: defaultLocation(kind),
    spaces: [] as Space[],
    recent: [] as RecentEntry[],
    formats: [] as Format[],
    templates: [] as Template[],
    loading: false,
    recentLoading: false,
    spaceNote: '',
    error: '' as string,
    templateError: '',
    templateNote: '',
    recentNote: '',
    formatError: '',
    notice: '',
    mutation: false,
    opening: false,
    uncertain: false,
    destinationWritable: false,
    created: null as FileRecord | null
  })
  let generation = 0
  let abort = new AbortController()
  let active = false
  let disposed = false
  let pendingCreation: CreationRequest | undefined
  let recentRequest = 0
  let recentAbort = new AbortController()

  const loadRecent = recentLoader(services, kind, filter)

  // Reloads only Recent, for example after the filter changes, without touching the folder view.
  async function refreshRecent() {
    if (!active) return
    recentAbort.abort()
    recentAbort = new AbortController()
    const request = ++recentRequest
    state.recentLoading = true
    const result = await loadRecent(recentAbort.signal)
    if (!active || request !== recentRequest) return
    state.recentLoading = false
    state.recent = result.entries
    state.recentNote = result.note
  }

  function deactivate() {
    active = false
    generation++
    abort.abort()
    recentAbort.abort()
    state.loading = false
    state.recentLoading = false
    state.recent = []
    state.destinationWritable = false
  }

  async function load(location: HomeLocation) {
    active = true
    recentAbort.abort()
    state.recentLoading = false
    abort.abort()
    abort = new AbortController()
    const request = ++generation
    const current = () => request === generation && active
    const signal = abort.signal
    state.location = structuredClone(location)
    state.loading = true
    state.error = ''
    state.destinationWritable = false
    state.recent = []
    const [spaces, formats] = await Promise.all([
      attempt(() => services.catalog.listSpaces(signal)),
      attempt(() => services.capabilities.creationFormats(kind))
    ])
    if (!current()) return
    state.spaces = spaces.ok ? spaces.value.items : []
    state.spaceNote =
      spaces.ok && spaces.value.partial
        ? 'Some spaces could not be loaded. Retry loading to refresh them.'
        : ''
    state.formats = formats.ok
      ? formats.value.filter((format) =>
          officeApps
            .find((app) => app.id === kind)!
            .formats.some((f) => f.mimeType === format.mimeType && f.extension === format.extension)
        )
      : []
    const templates = spaces.ok
      ? await attempt(() => services.templates(kind, templateFolder()))
      : fail(spaces.error)
    if (!current()) return
    state.templates = templates.ok ? templates.value.items.filter((t) => t.kind === kind) : []
    state.templateNote =
      templates.ok && templates.value.partial
        ? 'Some templates could not be shown. The gallery reads up to 20 categories and 200 templates; check the source folder in Files.'
        : ''
    state.templateError = !spaces.ok || templates.ok ? '' : errorText[templates.error]
    // Keep "not configured" distinct from a configured editor that cannot create this family.
    state.formatError = !formats.ok
      ? errorText[formats.error]
      : state.formats.length
        ? ''
        : errorText.unsupportedType
    if (!spaces.ok) {
      state.error = errorText[spaces.error]
      state.loading = false
      return
    }
    const space = state.spaces.find((s) => s.id === location.spaceId) ?? state.spaces[0]
    if (location.spaceId && !state.spaces.some((s) => s.id === location.spaceId)) {
      state.error = errorText.spaceUnavailable
      state.loading = false
      return
    }
    if (!space) {
      state.loading = false
      return
    }
    if (space.id !== location.spaceId)
      state.location = {
        ...defaultLocation(kind),
        spaceId: space.id,
        folder: space.root
      }
    const folder = state.location.folder ?? space.root
    state.location.folder = { ...folder }
    const recentLoad = ++recentRequest
    const [destination, recent] = await Promise.all([
      attempt(() => services.catalog.resolve(folder, signal)),
      loadRecent(signal)
    ])
    if (!current()) return
    state.destinationWritable =
      destination.ok && destination.value.kind === 'folder' && destination.value.access.createChild
    // A remembered destination has no ancestor contract; display its verified folder name only.
    state.location.folderName =
      destination.ok && refKey(folder) !== refKey(space.root) ? destination.value.name : undefined
    if (!destination.ok) state.error = errorText[destination.error]
    // A filter change during this load already started a newer Recent request.
    if (recentLoad === recentRequest) {
      state.recent = recent.entries
      state.recentNote = recent.note
    }
    state.loading = false
  }

  // Native file actions; the host performs them and enforces permissions.
  async function runAction(action: FileMenuAction, file: FileRecord) {
    if (action === 'open' || action === 'openReadOnly') return open(file, action === 'openReadOnly')
    state.notice = ''
    if (action === 'copyLink') {
      try {
        if (!file.link) throw new Error('No link')
        await navigator.clipboard.writeText(file.link)
        state.notice = 'Link copied. People still need access to open it.'
      } catch {
        state.notice = 'The link could not be copied. Use Show in Files instead.'
      }
      return
    }
    const result = await attempt(() => services.actions[action](file))
    if (!result.ok) state.notice = errorText[result.error]
    else state.notice = result.value.message ?? ''
  }

  async function open(file: FileRecord, readOnly = false) {
    if (state.opening || state.mutation || file.kind !== 'file') return
    state.opening = true
    state.notice = ''
    const request = generation
    const resolved = await attempt(() => services.catalog.resolve(file.ref, abort.signal))
    if (!resolved.ok || !resolved.value.access.read) {
      // Transient transport or adapter failures do not prove a file was deleted or revoked.
      if (resolved.ok || resolved.error === 'forbiddenOrMissing') {
        state.recent = state.recent.filter((r) => refKey(r.file.ref) !== refKey(file.ref))
        services.recents.remove(file.ref)
      } else if (resolved.error === 'unauthenticated') {
        state.recent = []
      }
      state.notice = errorText[resolved.ok ? 'forbiddenOrMissing' : resolved.error]
    } else if (active && request === generation) {
      const launched = await attempt(() =>
        services.editor.open({
          file: resolved.value.ref,
          mode: resolved.value.access.write && !readOnly ? 'edit' : 'view'
        })
      )
      if (launched.ok) {
        services.recents.record(resolved.value.ref, kind)
        state.notice =
          launched.value.message ?? 'Open request accepted. Save status belongs to the editor.'
      } else state.notice = errorText[launched.error]
    }
    state.opening = false
  }

  async function create(name: string, extension: string, template?: Template, target?: FileRef) {
    const selected = target ?? state.location.folder
    if (state.mutation || state.opening || state.uncertain || !selected) return
    state.mutation = true
    state.notice = ''
    state.created = null
    const result = await createOfficeFile(
      services,
      kind,
      selected,
      name,
      extension,
      state.formats,
      template
    )
    if (disposed) return
    if (result.ok) {
      state.created = result.value.file
      state.notice = `Created ${result.value.file.name} in ${result.value.destinationName}. Use Open created file to continue.`
    } else {
      // Network/timeout/unknown can mean the mutation committed. No blind retry or pretend idempotency.
      pendingCreation = result.uncertain
      state.uncertain = !!pendingCreation
      state.notice = state.uncertain
        ? 'Creation may have completed. Use Check destination or inspect the folder in Files. Do not submit again.'
        : errorText[result.error]
    }
    state.mutation = false
  }

  async function reconcileCreation() {
    if (!pendingCreation || state.mutation || disposed) return
    state.mutation = true
    const request = generation
    const result = await findCreation(services, pendingCreation, abort.signal)
    state.mutation = false
    if (disposed || !active || generation !== request) return
    if (result.ok && result.value) {
      state.created = result.value
      state.uncertain = false
      pendingCreation = undefined
      state.notice =
        'Found a matching file in the destination. Open it to verify its contents before creating another copy.'
    } else {
      state.notice = result.ok
        ? 'No matching file was confirmed. Creation remains paused; check the destination in Files.'
        : `Creation remains paused. ${errorText[result.error]}`
    }
  }

  function dispose() {
    disposed = true
    pendingCreation = undefined
    deactivate()
    state.spaces = []
    state.templates = []
    state.formats = []
    state.created = null
    state.notice = ''
  }
  return {
    state,
    load,
    refreshRecent,
    deactivate,
    dispose,
    open,
    runAction,
    create,
    reconcileCreation
  }
}
export type HomeModel = ReturnType<typeof createHomeModel>
