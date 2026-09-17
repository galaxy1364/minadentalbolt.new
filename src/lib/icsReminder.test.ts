// @vitest-environment jsdom
// icsReminder.test.ts -- ICS calendar reminder generator (no fake assertions)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadICSReminder } from './icsReminder'

// ── DOM stubs (jsdom does not implement Blob URL or anchor click) ──
let createdObjectURL: string
let revokedObjectURL: string
let capturedBlobContent: string
let capturedDownloadAttr: string
let capturedHref: string
let clickCalled: boolean

beforeEach(() => {
  createdObjectURL = ''
  revokedObjectURL = ''
  capturedBlobContent = ''
  capturedDownloadAttr = ''
  capturedHref = ''
  clickCalled = false

  // Stub URL methods
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      // Read the blob synchronously via FileReaderSync alternative
      createdObjectURL = 'blob:test-url'
      return createdObjectURL
    },
    revokeObjectURL: (url: string) => {
      revokedObjectURL = url
    },
  })

  // Stub document.createElement to capture anchor attributes
  const origCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      const anchor = origCreate('a')
      Object.defineProperty(anchor, 'click', {
        value: () => { clickCalled = true },
        writable: true,
      })
      // Intercept href and download setters
      let _href = ''
      let _download = ''
      Object.defineProperty(anchor, 'href', {
        get: () => _href,
        set: (v) => { _href = v; capturedHref = v },
        configurable: true,
      })
      Object.defineProperty(anchor, 'download', {
        get: () => _download,
        set: (v) => { _download = v; capturedDownloadAttr = v },
        configurable: true,
      })
      return anchor
    }
    return origCreate(tag)
  })

  // Stub body append/remove so the invisible anchor is handled
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node as any)
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node as any)

  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// Helper: capture the raw ICS text from the last Blob created
async function captureIcsContent(opts: Parameters<typeof downloadICSReminder>[0]): Promise<string> {
  let lastBlob: Blob | null = null
  const origBlob = globalThis.Blob
  vi.stubGlobal('Blob', class extends origBlob {
    constructor(parts: BlobPart[], init?: BlobPropertyBag) {
      super(parts, init)
      lastBlob = this
    }
  })

  downloadICSReminder(opts)
  vi.runAllTimers() // flush revokeObjectURL setTimeout

  const text = lastBlob ? await (lastBlob as Blob).text() : ''
  vi.stubGlobal('Blob', origBlob)
  return text
}

// ─── Structure tests ──────────────────────────────────────────

describe('downloadICSReminder', () => {
  it('produces a VCALENDAR wrapper', async () => {
    const ics = await captureIcsContent({ title: 'Test', dueDate: '2026-10-01' })
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('contains a VEVENT block', async () => {
    const ics = await captureIcsContent({ title: 'Test', dueDate: '2026-10-01' })
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
  })

  it('includes two VALARM blocks (morning + midnight)', async () => {
    const ics = await captureIcsContent({ title: 'Test', dueDate: '2026-10-01' })
    const matches = ics.match(/BEGIN:VALARM/g) || []
    expect(matches.length).toBe(2)
  })

  it('encodes dueDate correctly as DTSTART DATE value', async () => {
    const ics = await captureIcsContent({ title: 'Test', dueDate: '2026-10-01' })
    expect(ics).toContain('DTSTART;VALUE=DATE:20261001')
  })

  it('includes the supplied title in SUMMARY', async () => {
    const ics = await captureIcsContent({ title: 'سررسید چک بانکی', dueDate: '2026-10-15' })
    expect(ics).toContain('SUMMARY:سررسید چک بانکی')
  })

  it('includes the description when provided', async () => {
    const ics = await captureIcsContent({
      title: 'یادآوری',
      dueDate: '2026-11-01',
      description: 'قسط اول',
    })
    expect(ics).toContain('DESCRIPTION:قسط اول')
  })

  it('omits DESCRIPTION line when no description is provided', async () => {
    const ics = await captureIcsContent({ title: 'یادآوری', dueDate: '2026-11-01' })
    // Description line should NOT appear in VEVENT header (only inside VALARMs is fine)
    const veventBlock = ics.split('BEGIN:VALARM')[0]
    const descriptionLinesInEvent = (veventBlock.match(/^DESCRIPTION:/gm) || [])
    expect(descriptionLinesInEvent.length).toBe(0)
  })

  it('replaces newlines in description with \\n escape', async () => {
    const ics = await captureIcsContent({
      title: 'یادآوری',
      dueDate: '2026-11-01',
      description: 'خط اول\nخط دوم',
    })
    expect(ics).toContain('DESCRIPTION:خط اول\\nخط دوم')
  })

  it('generates a unique UID containing the date', async () => {
    const ics = await captureIcsContent({ title: 'Test', dueDate: '2026-10-01' })
    const uidLine = ics.split('\r\n').find((l) => l.startsWith('UID:')) || ''
    expect(uidLine).toContain('20261001')
    expect(uidLine).toContain('@minadent')
  })

  it('uses the supplied filename for the download attribute', () => {
    downloadICSReminder({ title: 'T', dueDate: '2026-10-01', filename: 'invoice.ics' })
    expect(capturedDownloadAttr).toBe('invoice.ics')
  })

  it('defaults filename to reminder.ics when not provided', () => {
    downloadICSReminder({ title: 'T', dueDate: '2026-10-01' })
    expect(capturedDownloadAttr).toBe('reminder.ics')
  })

  it('triggers an anchor click (simulating file download)', () => {
    downloadICSReminder({ title: 'T', dueDate: '2026-10-01' })
    expect(clickCalled).toBe(true)
  })

  it('revokes the object URL after a timeout to prevent memory leak', () => {
    downloadICSReminder({ title: 'T', dueDate: '2026-10-01' })
    expect(revokedObjectURL).toBe('')   // not yet
    vi.runAllTimers()
    expect(revokedObjectURL).toBe('blob:test-url')
  })

  it('sets calendar content-type on the Blob', async () => {
    // Capture the Blob type property
    let capturedType = ''
    const origBlob = globalThis.Blob
    vi.stubGlobal('Blob', class extends origBlob {
      constructor(parts: BlobPart[], init?: BlobPropertyBag) {
        super(parts, init)
        capturedType = init?.type || ''
      }
    })
    downloadICSReminder({ title: 'T', dueDate: '2026-10-01' })
    vi.stubGlobal('Blob', origBlob)
    expect(capturedType).toContain('text/calendar')
  })
})

