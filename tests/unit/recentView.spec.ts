import { describe, expect, it } from 'vitest'
import { groupRecents, sortRecents, type RecentEntry } from '../../src/services/recentView'

const DAY = 86_400_000
// Noon local time keeps the calendar-day boundaries deterministic.
const now = new Date(2026, 10, 11, 12).getTime()
function entry(name: string, ageDays: number): RecentEntry {
  return {
    file: {
      ref: { spaceId: 's', itemId: name },
      name,
      kind: 'file',
      access: { read: true, write: false, createChild: false }
    },
    openedAt: now - ageDays * DAY
  }
}
const entries = [
  entry('report 10.odt', 45),
  entry('Agenda.odt', 0.1),
  entry('report 9.odt', 3),
  entry('budget.odt', 12)
]

describe('recently opened presentation', () => {
  it('groups newest first by the local day the file was opened', () => {
    expect(
      groupRecents(entries, 'opened', now).map((g) => [g.label, g.entries.map((e) => e.file.name)])
    ).toEqual([
      ['Today', ['Agenda.odt']],
      ['Previous 7 days', ['report 9.odt']],
      ['Previous 30 days', ['budget.odt']],
      ['Earlier', ['report 10.odt']]
    ])
  })
  it('puts yesterday evening in the 7-day group even within 24 hours', () => {
    const lateYesterday = {
      ...entry('late.odt', 0),
      openedAt: new Date(2026, 10, 10, 23).getTime()
    }
    expect(groupRecents([lateYesterday], 'opened', now)[0]!.label).toBe('Previous 7 days')
  })
  it('sorts names case-insensitively with natural numbers and without date groups', () => {
    expect(sortRecents(entries, 'name').map((e) => e.file.name)).toEqual([
      'Agenda.odt',
      'budget.odt',
      'report 9.odt',
      'report 10.odt'
    ])
    expect(groupRecents(entries, 'name', now)).toHaveLength(1)
    expect(groupRecents([], 'name', now)).toEqual([])
  })
})
