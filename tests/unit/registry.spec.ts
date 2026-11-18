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
  it('classifies editable ODG drawings independently from images, PDFs and other office files', () => {
    const drawing = { ...file, name: 'DIAGRAM.ODG' }
    expect(belongsTo(drawing, 'draw')).toBe(true)
    expect(belongsTo(drawing, 'slides')).toBe(false)
    expect(
      belongsTo({ ...drawing, mimeType: 'application/vnd.oasis.opendocument.graphics' }, 'draw')
    ).toBe(true)
    expect(belongsTo({ ...drawing, mimeType: 'application/pdf' }, 'draw')).toBe(false)
    expect(belongsTo({ ...file, name: 'diagram.svg' }, 'draw')).toBe(false)
  })
})
