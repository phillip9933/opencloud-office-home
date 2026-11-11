import { expect, it } from 'vitest'
import { fixtureServices } from '../../src/fixtures/services'
import { createDetailLoader } from '../../src/services/details'
import { ok, type FileRecord, type Result } from '../../src/contracts/office'

it('bounds optional metadata reads and discards cancelled or disposed results', async () => {
  const catalog = fixtureServices().catalog
  const pending: ((value: Result<FileRecord>) => void)[] = []
  let active = 0
  let maximum = 0
  catalog.resolve = () => {
    active++
    maximum = Math.max(maximum, active)
    return new Promise((resolve) =>
      pending.push((value) => {
        active--
        resolve(value)
      })
    )
  }
  const loader = createDetailLoader(catalog)
  const controller = new AbortController()
  const reads = Array.from({ length: 9 }, (_, index) =>
    loader.load({ spaceId: 'synthetic', itemId: `${index}` }, controller.signal)
  )
  expect(pending).toHaveLength(4)
  controller.abort()
  const record: FileRecord = {
    ref: { spaceId: 'synthetic', itemId: '0' },
    name: 'Synthetic.odt',
    kind: 'file',
    access: { read: true, write: false, createChild: false }
  }
  for (const finish of pending.splice(0)) finish(ok(record))
  expect(await Promise.all(reads)).toEqual(
    Array.from({ length: 9 }, () => ({ ok: false, error: 'cancelled' }))
  )
  expect(maximum).toBe(4)
  const later = loader.load(record.ref, new AbortController().signal)
  loader.dispose()
  for (const finish of pending.splice(0)) finish(ok(record))
  expect(await later).toEqual({ ok: false, error: 'cancelled' })
  expect(await loader.load(record.ref, new AbortController().signal)).toEqual({
    ok: false,
    error: 'cancelled'
  })
})
