import { describe, expect, it } from 'vitest'
import { belongsTo } from '../../src/app/registry'
import type { FileRecord } from '../../src/contracts/office'

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
