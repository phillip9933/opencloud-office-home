import { belongsTo, officeApps } from '../app/registry'
import {
  fail,
  ok,
  refKey,
  type FileRecord,
  type OfficeServices,
  type CreationRequest
} from '../contracts/office'
import { createRecentStore } from '../preferences/recents'

export function fixtureServices(): OfficeServices {
  // DEV-LIMIT(DL-002): synthetic, session-only operations for the separate preview entrypoint.
  const access = { read: true, write: true, createChild: true }
  const root = { spaceId: 'fixture-personal', itemId: 'root' }
  const team = { spaceId: 'fixture-team', itemId: 'root' }
  const folder = { spaceId: root.spaceId, itemId: 'reports' }
  const records: FileRecord[] = [
    {
      ref: root,
      name: 'Personal files',
      kind: 'folder',
      path: '/Personal files',
      access
    },
    {
      ref: team,
      name: 'Team space',
      kind: 'folder',
      path: '/Team space',
      access
    },
    {
      ref: folder,
      name: 'Reports',
      kind: 'folder',
      path: '/Personal files/Reports',
      access
    },
    ...officeApps.flatMap((app) => [
      {
        ref: { spaceId: root.spaceId, itemId: app.id },
        name: `Project ${app.label}.${app.formats[0]!.extension}`,
        kind: 'file' as const,
        path: '/Personal files',
        mimeType: app.formats[0]!.mimeType,
        access
      },
      {
        ref: { spaceId: root.spaceId, itemId: `read-${app.id}` },
        name: `Shared ${app.label}.${app.formats[1]!.extension}`,
        kind: 'file' as const,
        path: '/Personal files/Reports',
        mimeType: app.formats[1]!.mimeType,
        access: { read: true, write: false, createChild: false }
      }
    ])
  ]
  const parents = new Map(
    records
      .slice(2)
      .map((r) => [refKey(r.ref), r.ref.itemId.startsWith('read-') ? refKey(folder) : refKey(root)])
  )
  let counter = 0
  function create(input: CreationRequest) {
    if (
      records.some(
        (r) => parents.get(refKey(r.ref)) === refKey(input.destination) && r.name === input.name
      )
    )
      return Promise.resolve(fail<FileRecord>('conflict'))
    const record: FileRecord = {
      ref: {
        spaceId: input.destination.spaceId,
        itemId: `created-${++counter}`
      },
      name: input.name,
      kind: 'file',
      mimeType: input.format.mimeType,
      path: '/Fixture destination',
      access
    }
    records.push(record)
    parents.set(refKey(record.ref), refKey(input.destination))
    return Promise.resolve(ok(record))
  }
  return {
    mode: 'fixture',
    catalog: {
      listSpaces() {
        return Promise.resolve(
          ok([
            { id: root.spaceId, name: 'Personal files', root },
            { id: team.spaceId, name: 'Team space', root: team }
          ])
        )
      },
      resolve(ref) {
        const record = records.find((r) => refKey(r.ref) === refKey(ref))
        return Promise.resolve(record ? ok(record) : fail('forbiddenOrMissing'))
      },
      async list(query) {
        // Delay deliberately makes cancellation and fast route switching visible in the preview.
        await new Promise((resolve) => setTimeout(resolve, 80))
        if (query.signal.aborted) return fail('cancelled')
        const items = records.filter(
          (r) =>
            parents.get(refKey(r.ref)) === refKey(query.folder) &&
            belongsTo(r, query.kind) &&
            r.name.toLowerCase().includes(query.text.toLowerCase())
        )
        return ok({ items, partial: false })
      }
    },
    capabilities: {
      creationFormats(kind) {
        return Promise.resolve(ok([officeApps.find((a) => a.id === kind)!.formats[0]!]))
      }
    },
    creation: { blank: create, fromTemplate: create },
    editor: {
      open() {
        return Promise.resolve(ok({ status: 'launchAccepted' }))
      }
    },
    recents: createRecentStore({
      instance: 'fixture',
      user: 'synthetic-preview'
    }),
    templates(kind) {
      return Promise.resolve(
        ok([
          {
            id: `managed-${kind}`,
            name: `Example ${kind} template`,
            kind,
            source: { spaceId: root.spaceId, itemId: kind },
            format: officeApps.find((a) => a.id === kind)!.formats[0]!
          }
        ])
      )
    }
  }
}
