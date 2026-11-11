import { describe, expect, it } from 'vitest'
import { belongsTo, officeApps, validateMenu } from '../../src/app/registry'
import type { FileRecord } from '../../src/contracts/office'

const routes = new Set(officeApps.map((app) => app.route))
const file: FileRecord = {
  ref: { spaceId: 'space', itemId: 'opaque/id' },
  name: 'REPORT.DOCX',
  kind: 'file',
  access: { read: true, write: false, createChild: false }
}
describe('family classification', () => {
  it('keeps folders, recognizes mixed-case extensions and rejects conflicting MIME metadata', () => {
    expect(belongsTo(file, 'docs')).toBe(true)
    expect(belongsTo(file, 'slides')).toBe(false)
    expect(belongsTo({ ...file, mimeType: 'application/x-unknown' }, 'docs')).toBe(false)
    expect(belongsTo({ ...file, kind: 'folder' }, 'sheets')).toBe(true)
  })
})
describe('administrator-reviewed catalog', () => {
  it('permits a fourth installed destination without changing office descriptors', () => {
    const photo = {
      ...officeApps[0],
      id: 'photo',
      label: 'Photo',
      icon: 'image',
      route: 'photo-home',
      order: 40,
      formats: [],
      templateFormats: []
    }
    expect(validateMenu([...officeApps, photo], new Set([...routes, 'photo-home']))).toHaveLength(4)
  })
  it.each([
    { script: 'alert(1)' },
    { url: 'javascript:alert(1)' },
    { module: 'https://unapproved.example/app.js' },
    { route: 'unknown' },
    { schemaVersion: 2 },
    { order: -1 },
    { icon: '<svg onload=evil>' },
    { formats: [{ extension: '../bad', mimeType: 'text/plain' }] },
    { templateFormats: [{ extension: 'ott', mimeType: 'text/plain', creates: 'exe' }] }
  ])('rejects unapproved fields or destinations %j', (change) => {
    expect(() => validateMenu([{ ...officeApps[0], ...change }], routes)).toThrow()
  })
  it('rejects duplicate identities and safely leaves text labels as text', () => {
    expect(() => validateMenu([officeApps[0], officeApps[0]], routes)).toThrow()
    expect(
      validateMenu([{ ...officeApps[0], label: '<script>unsafe</script>' }], routes)[0]!.label
    ).toContain('<script>')
  })
})
