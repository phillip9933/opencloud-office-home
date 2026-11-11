import { expect, it, vi } from 'vitest'
import { fixtureServices } from '../../src/fixtures/services'
import { describeFolder } from '../../src/services/folderLabel'
import { ok } from '../../src/contracts/office'
it('names nested folders even when an ID-addressed response has path /', async () => {
  const services = fixtureServices()
  const spaces = await services.catalog.listSpaces(new AbortController().signal)
  if (!spaces.ok) throw new Error('Fixture spaces missing')
  const ref = { spaceId: spaces.value[0]!.id, itemId: 'nested' }
  vi.spyOn(services.catalog, 'resolve').mockResolvedValue(
    ok({
      ref,
      kind: 'folder',
      name: 'Template samples',
      path: '/',
      access: { read: true, write: true, createChild: true }
    })
  )
  expect(await describeFolder(services.catalog, ref, new AbortController().signal)).toEqual(
    ok('Personal files / Template samples')
  )
})
