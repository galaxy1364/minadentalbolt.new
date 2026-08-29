import { describe, it, expect } from 'vitest'
import {
  formatShelfLocation, hasShelfLocation, validateShelf, daysBetween,
  alarmInfo, suggestAlarmDate, readyForDelivery, sortByUrgency, summariseLab,
} from './labShelf'

const TODAY = '2026-08-29'

function order(over: Record<string, any> = {}) {
  return {
    id: over.id || 'o1',
    status: over.status || 'ordered',
    shelf: over.shelf !== undefined ? over.shelf : 'A',
    shelf_number: over.shelf_number !== undefined ? over.shelf_number : '3',
    shelf_space: over.shelf_space !== undefined ? over.shelf_space : '2',
    alarm_date: over.alarm_date !== undefined ? over.alarm_date : null,
    work_done: over.work_done !== undefined ? over.work_done : false,
    delivered: over.delivered !== undefined ? over.delivered : false,
  }
}

describe('formatShelfLocation', () => {
  it('joins the three parts', () => {
    expect(formatShelfLocation({ shelf: 'A', shelf_number: '3', shelf_space: '2' })).toBe('A-3-2')
  })

  it('returns null when nothing is recorded, so the UI can show a placeholder', () => {
    expect(formatShelfLocation({ shelf: null, shelf_number: null, shelf_space: null })).toBeNull()
    expect(formatShelfLocation({ shelf: '  ', shelf_number: '', shelf_space: null })).toBeNull()
  })

  it('skips blank parts instead of emitting empty separators', () => {
    expect(formatShelfLocation({ shelf: 'A', shelf_number: '', shelf_space: '2' })).toBe('A-2')
  })
})

describe('hasShelfLocation', () => {
  it('is true only when something is recorded', () => {
    expect(hasShelfLocation({ shelf: 'A', shelf_number: '1', shelf_space: '1' })).toBe(true)
    expect(hasShelfLocation({ shelf: null, shelf_number: null, shelf_space: null })).toBe(false)
  })
})

describe('validateShelf', () => {
  it('accepts a complete address', () => {
    expect(validateShelf({ shelf: 'A', shelf_number: '3', shelf_space: '2' })).toEqual([])
  })

  it('accepts a completely empty address', () => {
    expect(validateShelf({ shelf: null, shelf_number: null, shelf_space: null })).toEqual([])
  })

  it('rejects a partial address', () => {
    // "Shelf A" with no number still means opening every box on A.
    expect(validateShelf({ shelf: 'A', shelf_number: null, shelf_space: null })).toHaveLength(1)
    expect(validateShelf({ shelf: 'A', shelf_number: '3', shelf_space: '' })).toHaveLength(1)
  })

  it('treats whitespace as empty', () => {
    expect(validateShelf({ shelf: 'A', shelf_number: '  ', shelf_space: '2' })).toHaveLength(1)
  })
})

describe('daysBetween', () => {
  it('counts whole days forward and backward', () => {
    expect(daysBetween('2026-08-29', '2026-09-01')).toBe(3)
    expect(daysBetween('2026-09-01', '2026-08-29')).toBe(-3)
    expect(daysBetween('2026-08-29', '2026-08-29')).toBe(0)
  })

  it('ignores the time part, so a late-evening entry is still "today"', () => {
    expect(daysBetween('2026-08-29T23:59:00Z', '2026-08-29T00:01:00Z')).toBe(0)
  })

  it('crosses month and year boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('alarmInfo', () => {
  it('reports no alarm when none is set', () => {
    expect(alarmInfo(order({ alarm_date: null }), TODAY).state).toBe('none')
  })

  it('reports an upcoming alarm with days remaining', () => {
    const info = alarmInfo(order({ alarm_date: '2026-09-02' }), TODAY)
    expect(info.state).toBe('upcoming')
    expect(info.daysUntil).toBe(4)
  })

  it('reports an alarm due today', () => {
    const info = alarmInfo(order({ alarm_date: TODAY }), TODAY)
    expect(info.state).toBe('due')
    expect(info.daysUntil).toBe(0)
  })

  it('reports an overdue alarm with a positive day count in the label', () => {
    const info = alarmInfo(order({ alarm_date: '2026-08-25' }), TODAY)
    expect(info.state).toBe('overdue')
    expect(info.daysUntil).toBe(-4)
    expect(info.label).toContain('4')
  })

  it('never alarms on finished work', () => {
    // Chasing a case that is already back would train staff to ignore
    // the whole list.
    expect(alarmInfo(order({ alarm_date: '2026-08-01', work_done: true }), TODAY).state).toBe('none')
    expect(alarmInfo(order({ alarm_date: '2026-08-01', status: 'delivered' }), TODAY).state).toBe('none')
    expect(alarmInfo(order({ alarm_date: '2026-08-01', status: 'cancelled' }), TODAY).state).toBe('none')
  })
})

describe('suggestAlarmDate', () => {
  it('suggests a date two days before the deadline by default', () => {
    expect(suggestAlarmDate('2026-09-10', TODAY)).toBe('2026-09-08')
  })

  it('honours a custom lead time', () => {
    expect(suggestAlarmDate('2026-09-10', TODAY, 5)).toBe('2026-09-05')
  })

  it('returns null when the suggestion would land in the past', () => {
    // A reminder for a date already gone is noise, not help.
    expect(suggestAlarmDate('2026-08-29', TODAY, 5)).toBeNull()
  })

  it('returns null with no deadline', () => {
    expect(suggestAlarmDate(null, TODAY)).toBeNull()
  })

  it('allows a suggestion landing exactly on today', () => {
    expect(suggestAlarmDate('2026-08-31', TODAY, 2)).toBe('2026-08-29')
  })
})

describe('readyForDelivery', () => {
  it('includes work the lab has finished', () => {
    const list = [order({ id: 'a', work_done: true }), order({ id: 'b' })]
    expect(readyForDelivery(list).map((o) => o.id)).toEqual(['a'])
  })

  it('includes cases whose status says ready or received', () => {
    const list = [order({ id: 'a', status: 'ready' }), order({ id: 'b', status: 'received' })]
    expect(readyForDelivery(list).map((o) => o.id)).toEqual(['a', 'b'])
  })

  it('excludes cases already handed to the patient', () => {
    expect(readyForDelivery([order({ work_done: true, delivered: true })])).toEqual([])
  })

  it('excludes cancelled cases', () => {
    expect(readyForDelivery([order({ work_done: true, status: 'cancelled' })])).toEqual([])
  })
})

describe('sortByUrgency', () => {
  it('puts the most overdue first and unalarmed cases last', () => {
    const list = [
      order({ id: 'none', alarm_date: null }),
      order({ id: 'soon', alarm_date: '2026-08-31' }),
      order({ id: 'late', alarm_date: '2026-08-20' }),
      order({ id: 'today', alarm_date: TODAY }),
    ]
    expect(sortByUrgency(list, TODAY).map((o) => o.id)).toEqual(['late', 'today', 'soon', 'none'])
  })

  it('does not mutate the input', () => {
    const list = [order({ id: 'a', alarm_date: '2026-09-05' }), order({ id: 'b', alarm_date: '2026-08-20' })]
    sortByUrgency(list, TODAY)
    expect(list[0].id).toBe('a')
  })
})

describe('summariseLab', () => {
  it('counts live cases, ready cases and overdue alarms', () => {
    const list = [
      order({ id: 'a', work_done: true }),
      order({ id: 'b', alarm_date: '2026-08-20' }),
      order({ id: 'c', status: 'cancelled' }),
    ]
    const s = summariseLab(list, TODAY)
    expect(s.total).toBe(2)
    expect(s.readyForDelivery).toBe(1)
    expect(s.overdueAlarms).toBe(1)
  })

  it('flags only ready cases that lack a shelf address', () => {
    // A case still at the lab has nothing to store yet, so it must not
    // be nagged about.
    const list = [
      order({ id: 'ready-noshelf', work_done: true, shelf: null, shelf_number: null, shelf_space: null }),
      order({ id: 'still-out', shelf: null, shelf_number: null, shelf_space: null }),
    ]
    expect(summariseLab(list, TODAY).missingShelf).toBe(1)
  })

  it('returns zeroes for an empty list', () => {
    expect(summariseLab([], TODAY)).toEqual({ total: 0, readyForDelivery: 0, overdueAlarms: 0, missingShelf: 0 })
  })
})
