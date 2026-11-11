import { belongsTo, officeApps } from '../app/registry'
import {
  fail,
  ok,
  RECENT_CHANGE_DAYS,
  refKey,
  type CatalogQuery,
  type CreationRequest,
  type FileRecord,
  type FileRef,
  type OfficeKind,
  type OfficeServices,
  type Page,
  type Result
} from '../contracts/office'
import { createRecentStore } from '../preferences/recents'
import { createViewPreferenceStore } from '../preferences/view'
import { folderTemplates } from '../services/templates'
import { syntheticPreview } from './previews'
import { fixtureIntegrations } from './integrations'

const DAY = 86_400_000
const access = { read: true, write: true, createChild: true }
const readOnly = { read: true, write: false, createChild: false }
const mime: Record<string, string> = {
  odt: 'application/vnd.oasis.opendocument.text',
  ott: 'application/vnd.oasis.opendocument.text-template',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  ots: 'application/vnd.oasis.opendocument.spreadsheet-template',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  otp: 'application/vnd.oasis.opendocument.presentation-template',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png'
}

// Synthetic administrator template folder: root files are General, subfolders are categories.
const templateFiles: [category: string, file: string, preview: boolean][] = [
  ['', 'Letterhead.ott', true],
  ['Business', 'Business letter.ott', true],
  ['Business', 'Meeting minutes.ott', true],
  ['Business', 'Project brief.odt', true],
  ['Business', 'Expense report.ots', true],
  ['Business', 'Invoice.ots', true],
  ['Business', 'Project timeline.ods', false],
  ['Business', 'Quarterly review.otp', true],
  ['Business', 'Product pitch.otp', true],
  ['Personal', 'Resume.ott', true],
  ['Personal', 'Event invitation.ott', true],
  ['Personal', 'Household budget.ots', true],
  ['Personal', 'Habit tracker.ots', true],
  ['Personal', 'Photo album.otp', true],
  ['Education', 'Lesson plan.ott', true],
  ['Education', 'Gradebook.ots', true],
  ['Education', 'Science fair.otp', true]
]

export function fixtureServices(
  options: {
    now?: () => number
    seedHistory?: boolean
    // Where view preferences live; the preview passes sessionStorage so they survive a reload.
    preferenceStorage?: {
      getItem(key: string): string | null
      setItem(key: string, value: string): void
    }
  } = {}
): OfficeServices {
  const now = options.now ?? Date.now
  // DEV-LIMIT(DL-002): synthetic, session-only operations for the separate preview entrypoint.
  const root = { spaceId: 'fixture-personal', itemId: 'root' }
  const team = { spaceId: 'fixture-team', itemId: 'root' }
  const templatesRoot = { spaceId: 'fixture-templates', itemId: 'root' }
  const folder = { spaceId: root.spaceId, itemId: 'reports' }
  const records: FileRecord[] = []
  const parents = new Map<string, string>()
  const previews = new Map<string, string>()
  function add(record: FileRecord, parent?: FileRef) {
    records.push(record)
    if (parent) parents.set(refKey(record.ref), refKey(parent))
    return record
  }
  function file(ref: FileRef, name: string, path: string, parent: FileRef, rights = access) {
    const extension = name.slice(name.lastIndexOf('.') + 1)
    return add(
      {
        ref,
        name,
        kind: 'file',
        path,
        mimeType: mime[extension],
        access: rights,
        owner: 'Synthetic owner',
        createdAt: now() - 60 * 86400000
      },
      parent
    )
  }
  add({ ref: root, name: 'Personal files', kind: 'folder', path: '/Personal files', access })
  add({ ref: team, name: 'Team space', kind: 'folder', path: '/Team space', access })
  add(
    { ref: templatesRoot, name: 'Templates', kind: 'folder', path: '/Templates', access: readOnly },
    undefined
  )
  add(
    { ref: folder, name: 'Reports', kind: 'folder', path: '/Personal files/Reports', access },
    root
  )
  for (const app of officeApps) {
    const [primary, secondary] = app.formats
    file(
      { ...root, itemId: app.id },
      `Project ${app.label}.${primary.extension}`,
      '/Personal files',
      root
    )
    file(
      { ...root, itemId: `read-${app.id}` },
      `Shared ${app.label}.${secondary.extension}`,
      '/Personal files/Reports',
      folder,
      readOnly
    )
  }
  const extra: [string, string][] = [
    ['handbook', 'Team handbook.docx'],
    ['notes', 'Meeting notes 4 November.odt'],
    ['expenses', 'Expense log.ods'],
    ['inventory', 'Studio inventory.xlsx'],
    ['kickoff', 'Kickoff deck.odp'],
    ['training', 'Onboarding training.pptx']
  ]
  for (const [id, name] of extra) file({ ...team, itemId: id }, name, '/Team space', team)

  const categories = new Map<string, FileRef>()
  for (const [category, name, hasPreview] of templateFiles) {
    let parent = templatesRoot
    if (category) {
      if (!categories.has(category)) {
        const ref = { ...templatesRoot, itemId: `category-${category.toLowerCase()}` }
        add(
          { ref, name: category, kind: 'folder', path: '/Templates', access: readOnly },
          templatesRoot
        )
        categories.set(category, ref)
      }
      parent = categories.get(category)!
    }
    const path = category ? `/Templates/${category}` : '/Templates'
    const id = `template-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const template = file({ ...templatesRoot, itemId: id }, name, path, parent, readOnly)
    if (hasPreview) {
      const image = file(
        { ...templatesRoot, itemId: `${id}-preview` },
        `${name.slice(0, name.lastIndexOf('.'))}.png`,
        path,
        parent,
        readOnly
      )
      const kind = officeApps.find((app) => belongsTo(template, app.id))!.id
      previews.set(refKey(image.ref), syntheticPreview(kind, name))
    }
  }

  // Seeded browser history so the date groups are visible in the preview.
  const seeded: [FileRef, OfficeKind, number][] = [
    [{ ...root, itemId: 'docs' }, 'docs', 2 * 3600_000],
    [{ ...team, itemId: 'notes' }, 'docs', 3 * DAY],
    [{ ...team, itemId: 'handbook' }, 'docs', 12 * DAY],
    [{ ...root, itemId: 'read-docs' }, 'docs', 45 * DAY],
    [{ ...root, itemId: 'sheets' }, 'sheets', 1 * DAY],
    [{ ...team, itemId: 'expenses' }, 'sheets', 9 * DAY],
    [{ ...team, itemId: 'inventory' }, 'sheets', 40 * DAY],
    [{ ...team, itemId: 'kickoff' }, 'slides', 5 * DAY],
    [{ ...root, itemId: 'slides' }, 'slides', 20 * DAY]
  ]
  // Synthetic changes made in OpenCloud, for example by a colleague on another device.
  const changes: [FileRef, number][] = [
    [{ ...team, itemId: 'handbook' }, 1 * DAY],
    [{ ...team, itemId: 'expenses' }, 2 * DAY],
    [{ ...team, itemId: 'training' }, 4 * DAY],
    [{ ...team, itemId: 'kickoff' }, 3 * DAY],
    [{ ...team, itemId: 'inventory' }, 50 * DAY],
    [{ ...root, itemId: 'docs' }, 6 * DAY]
  ]
  if (options.seedHistory)
    for (const [ref, age] of changes) {
      const record = records.find((r) => refKey(r.ref) === refKey(ref))
      if (record) record.modifiedAt = now() - age
    }
  // Synthetic favorites and tags, as OpenCloud would report them on each resource.
  const labels: [string, boolean, string[]][] = [
    ['docs', true, ['Client']],
    ['handbook', false, ['Onboarding']],
    ['notes', true, []],
    ['sheets', false, ['Finance', 'Q4']],
    ['expenses', true, ['Finance']],
    ['kickoff', false, ['Client', 'Q4']],
    ['training', true, ['Onboarding']]
  ]
  for (const [id, favorite, tags] of labels) {
    const record = records.find((r) => r.kind === 'file' && r.ref.itemId === id)
    if (record) Object.assign(record, favorite ? { favorite } : {}, tags.length ? { tags } : {})
  }
  // Synthetic sharing, locks and private links; the domain is reserved and never contacted.
  for (const record of records) {
    if (record.kind !== 'file') continue
    record.link = `https://cloud.example/f/${encodeURIComponent(record.ref.itemId)}`
    if (record.ref.spaceId === team.spaceId) record.shared = true
  }
  const kickoff = records.find((r) => r.ref.itemId === 'kickoff')
  if (kickoff) kickoff.lock = { owner: 'Synthetic colleague' }
  const history = new Map<string, string>()
  if (options.seedHistory)
    history.set(
      JSON.stringify(['office-recents', 1, 'fixture', 'synthetic-preview']),
      JSON.stringify(seeded.map(([ref, kind, age]) => ({ ref, kind, openedAt: now() - age })))
    )

  async function listChildren(query: CatalogQuery): Promise<Result<Page<FileRecord>>> {
    // Delay deliberately makes cancellation and fast route switching visible in the preview.
    await new Promise((resolve) => setTimeout(resolve, 80))
    if (query.signal.aborted) return fail('cancelled')
    const items = records.filter(
      (r) =>
        parents.get(refKey(r.ref)) === refKey(query.folder) &&
        (query.kind === 'any' || belongsTo(r, query.kind))
    )
    return ok({ items, partial: false })
  }
  let counter = 0
  function create(input: CreationRequest) {
    if (
      records.some(
        (r) => parents.get(refKey(r.ref)) === refKey(input.destination) && r.name === input.name
      )
    )
      return Promise.resolve(fail<FileRecord>('conflict'))
    const record = file(
      { spaceId: input.destination.spaceId, itemId: `created-${++counter}` },
      input.name,
      '/Fixture destination',
      input.destination
    )
    return Promise.resolve(ok(record))
  }
  const services: OfficeServices = {
    mode: 'fixture',
    integrations: () => Promise.resolve(ok(fixtureIntegrations())),
    catalog: {
      listSpaces() {
        return Promise.resolve(
          ok([
            { id: root.spaceId, name: 'Personal files', root },
            { id: team.spaceId, name: 'Team space', root: team },
            { id: templatesRoot.spaceId, name: 'Templates', root: templatesRoot }
          ])
        )
      },
      resolve(ref) {
        const record = records.find((r) => refKey(r.ref) === refKey(ref))
        return Promise.resolve(record ? ok(record) : fail('forbiddenOrMissing'))
      },
      list: listChildren,
      search(kind, term) {
        return Promise.resolve(
          ok({
            items: records.filter(
              (r) =>
                r.kind === 'file' &&
                belongsTo(r, kind) &&
                r.name.toLowerCase().includes(term.toLowerCase())
            ),
            partial: false
          })
        )
      },
      recentlyChanged(kind, _signal, filter) {
        const since = now() - RECENT_CHANGE_DAYS * DAY
        const items = records
          .filter(
            (r) =>
              r.kind === 'file' &&
              r.modifiedAt !== undefined &&
              r.modifiedAt >= since &&
              belongsTo(r, kind) &&
              (!filter.favorites || r.favorite) &&
              (!filter.tags.length || filter.tags.some((tag) => r.tags?.includes(tag)))
          )
          .sort((a, b) => b.modifiedAt! - a.modifiedAt!)
        return Promise.resolve(ok({ items, partial: false }))
      },
      latestActivity(ref) {
        const record = records.find((r) => refKey(r.ref) === refKey(ref))
        if (!record) return Promise.resolve(fail('forbiddenOrMissing'))
        return Promise.resolve(
          ok(
            record.modifiedAt === undefined
              ? null
              : { text: `Synthetic colleague updated ${record.name}`, at: record.modifiedAt }
          )
        )
      },
      listTags() {
        return Promise.resolve(ok([...new Set(records.flatMap((r) => r.tags ?? []))].sort()))
      }
    },
    capabilities: {
      creationFormats(kind) {
        return Promise.resolve(ok([officeApps.find((a) => a.id === kind)!.formats[0]]))
      }
    },
    actions: {
      showInFiles: () => Promise.resolve(ok(undefined)),
      share: () => Promise.resolve(ok(undefined)),
      download: () => Promise.resolve(ok(undefined))
    },
    creation: { blank: create, fromTemplate: create },
    editor: {
      open() {
        return Promise.resolve(ok({ status: 'launchAccepted' }))
      }
    },
    recents: createRecentStore(
      { instance: 'fixture', user: 'synthetic-preview' },
      {
        getItem: (key) => history.get(key) ?? null,
        setItem: (key, value) => void history.set(key, value),
        removeItem: (key) => void history.delete(key)
      },
      now
    ),
    templateFolderDefault: templatesRoot,
    templates(kind, folder) {
      // The template folder is a separate source, so it does not share the browse catalog object.
      const source = { ...services.catalog, list: listChildren }
      return folderTemplates(source, folder ?? templatesRoot, kind, new AbortController().signal)
    },
    filters: { favorites: true, tags: true },
    viewPreferences: createViewPreferenceStore(
      { instance: 'fixture', user: 'synthetic-preview' },
      options.preferenceStorage ?? {
        getItem: (key) => history.get(key) ?? null,
        setItem: (key, value) => void history.set(key, value)
      }
    ),
    preview(ref) {
      // Like OpenCloud 9.0.0, only images have previews; office documents fall back to a card.
      const url = previews.get(refKey(ref))
      return Promise.resolve(url ? ok({ url, release() {} }) : fail('unsupportedType'))
    }
  }
  return services
}
