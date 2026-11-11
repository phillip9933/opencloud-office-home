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
  type Result,
  type Space,
  type Template
} from '../contracts/office'

export const errorText: Record<AppError, string> = {
  searchUnavailable:
    'Search has not been verified for this integration. Clear the search to browse folders.',
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
  return { kind, spaceId: '', folder: null, trail: [], text: '', scroll: 0 }
}

export function createHomeModel(services: OfficeServices, kind: OfficeKind) {
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

  function deactivate() {
    active = false
    generation++
    abort.abort()
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
        folder: space.root,
        text: location.text
      }
    const folder = state.location.folder ?? space.root
    state.location.folder = { ...folder }
    const [destination, listing, recent] = await Promise.all([
      attempt(() => services.catalog.resolve(folder)),
      attempt(() =>
        services.catalog.list({
          folder,
          kind,
          text: state.location.text,
          cursor: more ? state.next : undefined,
          signal
        })
      ),
      Promise.all(
        services.recents.list(kind).map(async ({ ref, openedAt }) => {
          const resolved = await attempt(() => services.catalog.resolve(ref))
          if (!resolved.ok && resolved.error === 'forbiddenOrMissing') services.recents.remove(ref)
          return { resolved, openedAt }
        })
      )
    ])
    if (!current()) return
    state.destinationWritable =
      destination.ok && destination.value.kind === 'folder' && destination.value.access.createChild
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
    // Failed refreshes show no cached private metadata, including when only one recent failed.
    state.recent = recent.every(
      ({ resolved }) => resolved.ok || resolved.error === 'forbiddenOrMissing'
    )
      ? recent.flatMap(({ resolved, openedAt }) =>
          resolved.ok && resolved.value.access.read && belongsTo(resolved.value, kind)
            ? [{ file: resolved.value, openedAt }]
            : []
        )
      : []
    state.loading = false
  }

  async function open(file: FileRecord) {
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
          mode: resolved.value.access.write ? 'edit' : 'view',
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
    services.recents.clear()
    state.recent = []
  }
  return { state, load, deactivate, open, create, clearRecents }
}
export type HomeModel = ReturnType<typeof createHomeModel>
