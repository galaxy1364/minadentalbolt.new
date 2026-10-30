// icsReminder.ts — generates a downloadable .ics calendar file with a
// real alarm (VALARM), for due dates (installments, cheques, personal
// finance) that need an actual phone notification. Web apps can't
// create native OS alarms directly (a real browser platform
// limitation) — importing a .ics into the phone's calendar app is the
// closest genuine equivalent: a real, native alert at the real time.
export function downloadICSReminder(opts: {
  title: string
  description?: string
  dueDate: string // YYYY-MM-DD
  filename?: string
}) {
  const dt = opts.dueDate.replace(/-/g, '')
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `${dt}-${Math.random().toString(36).slice(2)}@minadent`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MinaDent//Reminder//FA',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    `SUMMARY:${opts.title}`,
    opts.description ? `DESCRIPTION:${opts.description.replace(/\n/g, '\\n')}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT9H', // alerts at 9:00 the morning of the due date
    'ACTION:DISPLAY',
    `DESCRIPTION:${opts.title}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:PT0S', // also alerts at midnight the day itself, as a same-day nudge
    'ACTION:DISPLAY',
    `DESCRIPTION:${opts.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts.filename || 'reminder.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
