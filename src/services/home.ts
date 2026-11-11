import { reactive, toRaw } from 'vue'
import { belongsTo, officeApps } from '../app/registry'
import type { RecentEntry } from './recentView'
import {
  fail,
  refKey,
  type AppError,
  type FileRecord,
  type Format,
  type HomeLocation,
  type OfficeKind,
  type OfficeServices,
  type RecentFilter,
  type Result,
  type Space,
  type Template
} from '../contracts/office'

export const errorText: Record<AppError, string> = {
  paginationUnavailable: 'Further pages cannot be loaded through this integration yet.',
  unauthenticated: 'Sign in again through OpenCloud.',
  forbiddenOrMissing: 'This item is unavailable or you no longer have access.',
  unsupportedType: 'This format is not supported by the configured editor.',
  editorUnavailable:
    'The OpenCloud integration has not been verified. File actions are unavailable.',
  providerNotConfigured:
    'No office editor is configured for these files on this OpenCloud server. Ask an administrator to add one.',
  conflict: 'A file with that name already exists. Choose another name.',
  quotaExceeded: 'There is not enough storage available.',
  invalidName: 'Enter a file name without slashes, control characters, or a different extension.',
  timeout: 'The result is uncertain. Check the destination in Files before trying again.',
  network: 'The service could not be reached. Try loading again.',
  unknown: 'The operation could not be completed.',
  cancelled: 'The operation was cancelled.'
}
export async function attempt<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await operation()
  } catch (error) {
    return fail(
      error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'network'
    )
  }
}
export function defaultLocation(kind: OfficeKind): HomeLocation {
  return { kind, spaceId: '', folder: null, trail: [], scroll: 0 }
}
export type FileMenuAction =
  'open' | 'openReadOnly' | 'showInFiles' | 'copyLink' | 'download' | 'share'
const simulated: Partial<Record<FileMenuAction, string>> = {
  showInFiles: 'Simulated: OpenCloud Files would open at this file.',
  share: 'Simulated: OpenCloud sharing would open for this file.',
  download: 'Simulated: the file would download through OpenCloud.'
}

function matchesFilter(file: FileRecord, filter: RecentFilter): boolean {
  return (
    (!filter.favorites || file.favorite === true) &&
    (!filter.tags.length || filter.tags.some((tag) => file.tags?.includes(tag)))
  )
}

export function createHomeModel(
  services: OfficeServices,
  kind: OfficeKind,
  filter: RecentFilter = { favorites: false, tags: [] }
) {
  const state = reactive({
    location: defaultLocation(kind),
    spaces: [] as Space[],
    rows: [] as FileRecord[],
    recent: [] as RecentEntry[],
    formats: [] as Format[],
    templates: [] as Template[],
    loading: false,
    partial: false,
    next: undefined as string | undefined,
    error: '' as string,
    templateError: '',
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
  let recentRequest = 0
  let recentAbort = new AbortController()

  // Merges browser-opened references and server changes, then applies the Recent filter to both.
  async function loadRecent(signal: AbortSignal) {
    const filterNow = structuredClone(toRaw(filter))
    const [recent, changed] = await Promise.all([
      Promise.all(
        services.recents.list(kind).map(async ({ ref, openedAt }) => {
          const resolved = await attempt(() => services.catalog.resolve(ref))
          if (!resolved.ok && resolved.error === 'forbiddenOrMissing') services.recents.remove(ref)
          return { resolved, openedAt }
        })
      ),
      attempt(() => services.catalog.recentlyChanged(kind, signal, filterNow))
    ])
    // Failed refreshes show no cached private metadata, including when only one recent failed.
    const opened = recent.every(
      ({ resolved }) => resolved.ok || resolved.error === 'forbiddenOrMissing'
    )
      ? recent.flatMap(({ resolved, openedAt }) =>
          resolved.ok && resolved.value.access.read && belongsTo(resolved.value, kind)
            ? [{ file: resolved.value, openedAt }]
            : []
        )
      : []
    // Server changes and browser opens are merged by identity; each keeps its own timestamp.
    // Only the server query sets modifiedAt here; an opened file's old change date is not "recent".
    const merged = new Map<string, RecentEntry>(
      opened.map((entry) => [refKey(entry.file.ref), entry])
    )
    for (const file of changed.ok ? changed.value.items : []) {
      if (!file.access.read || !belongsTo(file, kind)) continue
      const known = merged.get(refKey(file.ref))
      merged.set(refKey(file.ref), { ...known, file, modifiedAt: file.modifiedAt })
    }
    return {
      entries: [...merged.values()].filter((entry) => matchesFilter(entry.file, filterNow)),
      note: !changed.ok
        ? `Changes from other devices are unavailable. ${errorText[changed.error]}`
        : changed.value.partial
          ? 'OpenCloud returned only some recent changes; older ones may be missing.'
          : ''
    }
  }

  // Reloads only Recent, for example after the filter changes, without touching the folder view.
  async function refreshRecent() {
    if (!active) return
    recentAbort.abort()
    recentAbort = new AbortController()
    const request = ++recentRequest
    const result = await loadRecent(recentAbort.signal)
    if (!active || request !== recentRequest) return
    state.recent = result.entries
    state.recentNote = result.note
  }

  function deactivate() {
    active = false
    generation++
    abort.abort()
    recentAbort.abort()
    state.loading = false
    state.rows = []
    state.recent = []
    state.destinationWritable = false
  }

  async function load(location: HomeLocation, more = false) {
    active = true
    abort.abort()
    abort = new AbortController()
    const request = ++generation
    const current = () => request === generation && active
    const signal = abort.signal
    state.location = structuredClone(location)
    state.loading = true
    state.error = ''
    state.destinationWritable = false
    if (!more) {
      state.rows = []
      state.recent = []
      state.next = undefined
      state.partial = false
    }
    const [spaces, formats, templates] = await Promise.all([
      attempt(() => services.catalog.listSpaces(signal)),
      attempt(() => services.capabilities.creationFormats(kind)),
      attempt(() => services.templates(kind))
    ])
    if (!current()) return
    state.spaces = spaces.ok ? spaces.value : []
    state.formats = formats.ok
      ? formats.value.filter((format) =>
          officeApps
            .find((app) => app.id === kind)!
            .formats.some((f) => f.mimeType === format.mimeType && f.extension === format.extension)
        )
      : []
    state.templates = templates.ok ? templates.value.filter((t) => t.kind === kind) : []
    state.templateError = templates.ok ? '' : errorText[templates.error]
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
      state.error = errorText.forbiddenOrMissing
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
    const [destination, listing, recent] = await Promise.all([
      attempt(() => services.catalog.resolve(folder)),
      attempt(() =>
        services.catalog.list({
          folder,
          kind,
          cursor: more ? state.next : undefined,
          signal
        })
      ),
      loadRecent(signal)
    ])
    if (!current()) return
    state.destinationWritable =
      destination.ok && destination.value.kind === 'folder' && destination.value.access.createChild
    // A remembered folder arrives without a trail; name it from its live metadata.
    if (destination.ok && !state.location.trail.length && refKey(folder) !== refKey(space.root))
      state.location.trail = [{ name: destination.value.name, ref: { ...folder } }]
    if (listing.ok) {
      const rows = [...(more ? state.rows : []), ...listing.value.items].filter(
        (file) => file.access.read && belongsTo(file, kind)
      )
      state.rows = [...new Map(rows.map((file) => [refKey(file.ref), file])).values()]
      state.partial = listing.value.partial
      state.next = listing.value.next
    } else {
      state.rows = []
      state.error = errorText[listing.error]
    }
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
    else if (services.mode === 'fixture') state.notice = simulated[action] ?? ''
  }

  async function open(file: FileRecord, readOnly = false) {
    if (state.opening || state.mutation || file.kind !== 'file') return
    state.opening = true
    state.notice = ''
    const returnTo = structuredClone(toRaw(state.location))
    const request = generation
    const resolved = await attempt(() => services.catalog.resolve(file.ref))
    if (!resolved.ok || !resolved.value.access.read) {
      state.rows = state.rows.filter((r) => refKey(r.ref) !== refKey(file.ref))
      state.recent = state.recent.filter((r) => refKey(r.file.ref) !== refKey(file.ref))
      services.recents.remove(file.ref)
      state.notice = errorText[resolved.ok ? 'forbiddenOrMissing' : resolved.error]
    } else if (active && request === generation) {
      const launched = await attempt(() =>
        services.editor.open({
          file: resolved.value.ref,
          mode: resolved.value.access.write && !readOnly ? 'edit' : 'view',
          returnTo
        })
      )
      if (launched.ok) {
        services.recents.record(resolved.value.ref, kind)
        state.notice =
          services.mode === 'fixture'
            ? 'Simulated launch accepted. No editor was opened and no file was saved.'
            : 'Open request accepted. Save status belongs to the editor.'
      } else state.notice = errorText[launched.error]
    }
    state.opening = false
  }

  async function create(name: string, extension: string, template?: Template) {
    if (state.mutation || state.opening || state.uncertain || !state.location.folder) return
    const format = state.formats.find((f) => f.extension === extension)
    const stem = name.trim()
    if (
      !format ||
      !stem ||
      stem.length > 180 ||
      /[/\\]/.test(stem) ||
      Array.from(stem).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
      stem === '.' ||
      stem === '..' ||
      (stem.includes('.') && !stem.toLowerCase().endsWith(`.${extension}`))
    ) {
      state.notice = errorText['invalidName']
      return
    }
    state.mutation = true
    state.notice = ''
    state.created = null
    const destination = { ...state.location.folder }
    const resolved = await attempt(() => services.catalog.resolve(destination))
    const capabilities = await attempt(() => services.capabilities.creationFormats(kind))
    if (
      !resolved.ok ||
      !resolved.value.access.createChild ||
      !capabilities.ok ||
      !capabilities.value.some(
        (f) => f.mimeType === format.mimeType && f.extension === format.extension
      )
    ) {
      state.notice =
        resolved.ok && resolved.value.access.createChild
          ? errorText[capabilities.ok ? 'unsupportedType' : capabilities.error]
          : errorText.forbiddenOrMissing
      state.mutation = false
      return
    }
    if (template) {
      const source = await attempt(() => services.catalog.resolve(template.source))
      if (
        !source.ok ||
        !source.value.access.read ||
        template.kind !== kind ||
        template.format.mimeType !== format.mimeType
      ) {
        state.notice = errorText['forbiddenOrMissing']
        state.mutation = false
        return
      }
    }
    const input = {
      kind,
      destination,
      format,
      name: stem.toLowerCase().endsWith(`.${extension}`) ? stem : `${stem}.${extension}`
    }
    const result = await attempt(() =>
      template
        ? services.creation.fromTemplate({ ...input, template })
        : services.creation.blank(input)
    )
    if (result.ok) {
      state.created = result.value
      if (
        active &&
        state.location.folder &&
        refKey(state.location.folder) === refKey(destination)
      ) {
        state.rows = [
          result.value,
          ...state.rows.filter((r) => refKey(r.ref) !== refKey(result.value.ref))
        ]
      }
      state.notice = `Created ${result.value.name} in ${resolved.value.path ?? resolved.value.name}. Use Open created file to continue.`
    } else {
      // Network/timeout/unknown can mean the mutation committed. No blind retry or pretend idempotency.
      state.uncertain = ['network', 'timeout', 'unknown'].includes(result.error)
      state.notice = state.uncertain ? errorText.timeout : errorText[result.error]
    }
    state.mutation = false
  }

  function clearRecents() {
    // Clears this browser's opening history; changes recorded by OpenCloud stay listed.
    services.recents.clear()
    state.recent = state.recent.flatMap(({ file, modifiedAt }) =>
      modifiedAt === undefined ? [] : [{ file, modifiedAt }]
    )
  }
  return { state, load, refreshRecent, deactivate, open, runAction, create, clearRecents }
}
export type HomeModel = ReturnType<typeof createHomeModel>
