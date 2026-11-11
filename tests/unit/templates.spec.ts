import { describe, expect, it, vi } from 'vitest'
import { resultFormat } from '../../src/app/registry'
import {
  fail,
  ok,
  refKey,
  type CatalogQuery,
  type FileCatalog,
  type FileRecord,
  type FileRef
} from '../../src/contracts/office'
import { folderTemplates, GENERAL_CATEGORY } from '../../src/services/templates'
import { fixtureServices } from '../../src/fixtures/services'

const readOnly = { read: true, write: false, createChild: false }
const root: FileRef = { spaceId: 'templates', itemId: 'root' }
function item(id: string, name: string, mimeType?: string, kind: 'file' | 'folder' = 'file') {
  return {
    ref: { spaceId: 'templates', itemId: id },
    name,
    kind,
    ...(mimeType ? { mimeType } : {}),
    access: readOnly
  } satisfies FileRecord
}
function catalog(children: Record<string, FileRecord[]>): FileCatalog {
  return {
    listSpaces: () => Promise.resolve(ok([])),
    resolve: () => Promise.resolve(fail('forbiddenOrMissing')),
    recentlyChanged: () => Promise.resolve(ok({ items: [], partial: false })),
    search: () => Promise.resolve(ok({ items: [], partial: false })),
    listTags: () => Promise.resolve(ok([])),
    latestActivity: () => Promise.resolve(ok(null)),
    list: vi.fn((query: CatalogQuery) => {
      const items = children[refKey(query.folder)]
      return Promise.resolve(items ? ok({ items, partial: false }) : fail('forbiddenOrMissing'))
    })
  }
}
const signal = new AbortController().signal

describe('administrator template folder', () => {
  const business = item('business', 'Business', undefined, 'folder')
  const source = catalog({
    [refKey(root)]: [
      item('letterhead', 'Letterhead.ott', 'application/vnd.oasis.opendocument.text-template'),
      item('letterhead-png', 'letterhead.PNG', 'image/png'),
      item('notes', 'notes.txt', 'text/plain'),
      business
    ],
    [refKey(business.ref)]: [
      item('report', 'Report.docx'),
      item('budget', 'Budget.ots', 'application/vnd.oasis.opendocument.spreadsheet-template'),
      item('budget-preview', 'Budget.png', 'image/png')
    ]
  })
  it('uses root files as General, subfolders as categories and same-name images as previews', async () => {
    const docs = await folderTemplates(source, root, 'docs', signal)
    expect(docs).toEqual({
      ok: true,
      value: [
        expect.objectContaining({
          name: 'Letterhead',
          category: GENERAL_CATEGORY,
          format: expect.objectContaining({ extension: 'odt' }),
          preview: { spaceId: 'templates', itemId: 'letterhead-png' }
        }),
        expect.objectContaining({ name: 'Report', category: 'Business' })
      ]
    })
    if (docs.ok) expect(docs.value[1]).not.toHaveProperty('preview')
    const sheets = await folderTemplates(source, root, 'sheets', signal)
    expect(sheets.ok && sheets.value.map((t) => [t.name, t.format.extension, !!t.preview])).toEqual(
      [['Budget', 'ods', true]]
    )
  })
  it('only lists the folder: no copy, upload or recursive crawl beyond one level', async () => {
    await folderTemplates(source, root, 'slides', signal)
    expect(source.list).toHaveBeenCalledTimes(2)
    for (const [query] of vi.mocked(source.list).mock.calls) expect(query.kind).toBe('any')
  })
  it('reports an unreadable template folder instead of an empty gallery', async () => {
    const broken = catalog({ [refKey(root)]: [business] })
    expect(await folderTemplates(broken, root, 'docs', signal)).toEqual({
      ok: false,
      error: 'forbiddenOrMissing'
    })
  })
  it('maps ODF template containers to the editable format they create', () => {
    const ots = item('t', 'Plan.ots', 'application/vnd.oasis.opendocument.spreadsheet-template')
    expect(resultFormat(ots, 'sheets')?.extension).toBe('ods')
    expect(resultFormat(ots, 'docs')).toBeUndefined()
    expect(resultFormat(item('x', 'Deck.PPTX'), 'slides')?.extension).toBe('pptx')
  })
  it('creates a new document from a fixture template without touching the source', async () => {
    const services = fixtureServices()
    const templates = await services.templates('slides')
    if (!templates.ok) throw new Error('fixture templates missing')
    expect(new Set(templates.value.map((t) => t.category))).toEqual(
      new Set(['Business', 'Personal', 'Education'])
    )
    const source = templates.value[0]!
    const created = await services.creation.fromTemplate({
      kind: 'slides',
      destination: { spaceId: 'fixture-personal', itemId: 'root' },
      name: 'Deck.odp',
      format: source.format,
      template: source
    })
    expect(created.ok && created.value.name).toBe('Deck.odp')
    const unchanged = await services.catalog.resolve(source.source)
    expect(unchanged.ok && unchanged.value.access.write).toBe(false)
  })
})
