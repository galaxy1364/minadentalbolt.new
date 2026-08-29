// ToothNotesPanel.tsx — chairside clinical notes pinned to a tooth.
// Three capture modes (typed / sketch / voice) because that is how a
// dentist actually records mid-procedure: hands busy, patient in the
// chair, no time to type a paragraph. Everything is written to IndexedDB
// first and queued for sync, so it works with the clinic's internet down.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Pencil, Type as TypeIcon, Trash2, Play, Plus, X } from 'lucide-react'
import { PalmerToothPicker } from './PalmerToothPicker'
import { Card, Button, Input, Badge } from './ui'
import { fetchToothNotes, createToothNote, archiveToothNote } from '../lib/api'
import { h } from '../lib/haptics'
import {
  emptyDraft, validateDraft, filterNotes, countByTooth, formatDuration,
  NOTE_COLORS, KIND_LABELS, MAX_AUDIO_SECONDS,
} from '../lib/toothNotes'
import type { ToothNote, ToothNoteKind } from '../types'
import type { NoteFilter, ToothNoteDraft } from '../lib/toothNotes'

interface Props { patientId: string; authorName?: string | null }

export function ToothNotesPanel({ patientId, authorName = null }: Props) {
  const [notes, setNotes] = useState<ToothNote[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState<ToothNoteDraft>(emptyDraft())
  const [filter, setFilter] = useState<NoteFilter>({ toothFdi: null, kind: null, query: '' })

  const load = async () => {
    setLoading(true)
    try { setNotes(await fetchToothNotes(patientId)) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [patientId])

  const shown = useMemo(() => filterNotes(notes, filter), [notes, filter])
  const perTooth = useMemo(() => countByTooth(notes), [notes])
  const errors = validateDraft(draft)

  const save = async () => {
    if (errors.length) return
    await createToothNote({
      patient_id: patientId,
      tooth_fdi: draft.toothFdi,
      kind: draft.kind,
      body: draft.body.trim() || null,
      attachment_data_url: draft.attachmentDataUrl,
      duration_sec: draft.durationSec,
      color: draft.color,
      author_name: authorName,
      is_active: true,
    })
    h.success()
    setDraft(emptyDraft())
    setComposing(false)
    await load()
  }

  const remove = async (id: string) => {
    await archiveToothNote(id)
    await load()
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">یادداشت‌های دندانی</h3>
            <Badge color="slate">{shown.length} مورد</Badge>
          </div>
          <Button onClick={() => { setComposing((v) => !v); h.tap() }}>
            {composing ? <><X size={16} /> بستن</> : <><Plus size={16} /> یادداشت جدید</>}
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input
            label="جستجو در یادداشت‌ها"
            value={filter.query}
            onChange={(v) => setFilter((f) => ({ ...f, query: v }))}
            placeholder="متن یادداشت..."
          />
          <div>
            <span className="block text-sm text-slate-600 mb-1">نوع</span>
            <div className="flex flex-wrap gap-1">
              <FilterChip active={filter.kind === null} onClick={() => setFilter((f) => ({ ...f, kind: null }))}>همه</FilterChip>
              {(Object.keys(KIND_LABELS) as ToothNoteKind[]).map((k) => (
                <FilterChip key={k} active={filter.kind === k} onClick={() => setFilter((f) => ({ ...f, kind: k }))}>
                  {KIND_LABELS[k]}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        {/* Filtering by clicking the tooth itself, mirroring how a doctor
            thinks: pick the tooth, then read what was recorded on it. */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600">فیلتر بر اساس دندان</span>
            {filter.toothFdi && (
              <button type="button" className="text-xs text-blue-600" onClick={() => setFilter((f) => ({ ...f, toothFdi: null }))}>
                حذف فیلتر دندان
              </button>
            )}
          </div>
          <PalmerToothPicker
            label=""
            value={filter.toothFdi || ''}
            onChange={(fdi) => setFilter((f) => ({ ...f, toothFdi: fdi || null }))}
          />
          {Object.keys(perTooth).length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              دندان‌های دارای یادداشت: {Object.entries(perTooth).map(([t, c]) => `${t} (${c})`).join('، ')}
            </p>
          )}
        </div>
      </Card>

      {composing && (
        <Composer draft={draft} setDraft={setDraft} errors={errors} onSave={save} />
      )}

      {loading ? (
        <Card className="p-4"><p className="text-slate-500 text-sm">در حال بارگذاری…</p></Card>
      ) : shown.length === 0 ? (
        <Card className="p-4"><p className="text-slate-500 text-sm">یادداشتی برای این فیلتر ثبت نشده است.</p></Card>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => <NoteCard key={n.id} note={n} onRemove={() => remove(n.id)} />)}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs border transition ${
        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function Composer({ draft, setDraft, errors, onSave }: {
  draft: ToothNoteDraft
  setDraft: (u: (d: ToothNoteDraft) => ToothNoteDraft) => void
  errors: string[]
  onSave: () => void
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-1 mb-3">
        {(Object.keys(KIND_LABELS) as ToothNoteKind[]).map((k) => (
          <FilterChip key={k} active={draft.kind === k} onClick={() => setDraft((d) => ({ ...d, kind: k, attachmentDataUrl: null, durationSec: null }))}>
            <span className="inline-flex items-center gap-1">
              {k === 'text' ? <TypeIcon size={13} /> : k === 'drawing' ? <Pencil size={13} /> : <Mic size={13} />}
              {KIND_LABELS[k]}
            </span>
          </FilterChip>
        ))}
      </div>

      <PalmerToothPicker
        label="دندان (اختیاری — خالی یعنی یادداشت عمومی)"
        value={draft.toothFdi || ''}
        onChange={(fdi) => setDraft((d) => ({ ...d, toothFdi: fdi || null }))}
      />

      <div className="mt-3">
        {draft.kind === 'text' && (
          <textarea
            dir="rtl"
            rows={4}
            className="w-full rounded-lg border border-slate-200 p-3 text-sm"
            placeholder="یادداشت را وارد کنید…"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
        )}
        {draft.kind === 'drawing' && (
          <SketchPad
            value={draft.attachmentDataUrl}
            onChange={(url) => setDraft((d) => ({ ...d, attachmentDataUrl: url }))}
          />
        )}
        {draft.kind === 'audio' && (
          <AudioRecorder
            onRecorded={(url, sec) => setDraft((d) => ({ ...d, attachmentDataUrl: url, durationSec: sec }))}
            dataUrl={draft.attachmentDataUrl}
            durationSec={draft.durationSec}
          />
        )}
      </div>

      <div className="mt-3">
        <span className="block text-sm text-slate-600 mb-1">رنگ (اختیاری)</span>
        <div className="flex flex-wrap gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`رنگ ${c}`}
              onClick={() => setDraft((d) => ({ ...d, color: d.color === c ? null : c }))}
              className={`w-7 h-7 rounded-full border-2 ${draft.color === c ? 'border-slate-800' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 text-xs text-red-600 list-disc pr-5 space-y-0.5">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      {/* Disabled purely on the shared validator — a required field must
          block, never merely warn. */}
      <Button className="mt-3" onClick={onSave} disabled={errors.length > 0}>ذخیره یادداشت</Button>
    </Card>
  )
}

function SketchPad({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!
    const r = c.getBoundingClientRect()
    // Canvas backing store is fixed-size while the element is fluid, so
    // pointer coordinates must be scaled or strokes drift from the finger.
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const ctx = ref.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.beginPath(); ctx.moveTo(x, y)
  }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = ref.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a'
    ctx.lineTo(x, y); ctx.stroke()
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(ref.current!.toDataURL('image/png'))
  }
  const clear = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={ref}
        width={600}
        height={260}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full rounded-lg border border-slate-200 bg-white touch-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button variant="secondary" onClick={clear}>پاک کردن</Button>
        <span className="text-xs text-slate-500">{value ? 'رسم ذخیره شد' : 'با انگشت یا قلم رسم کنید'}</span>
      </div>
    </div>
  )
}

function AudioRecorder({ onRecorded, dataUrl, durationSec }: {
  onRecorded: (url: string, sec: number) => void
  dataUrl: string | null
  durationSec: number | null
}) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<number | null>(null)

  const stop = () => {
    recorderRef.current?.stop()
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    if (timerRef.current) window.clearInterval(timerRef.current)
    setRecording(false)
  }

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const reader = new FileReader()
        // Stored as a data URL rather than an object URL: object URLs die
        // with the page, and this clip must survive offline in IndexedDB.
        reader.onloadend = () => onRecorded(String(reader.result), Math.max(1, elapsed))
        reader.readAsDataURL(blob)
      }
      recorderRef.current = rec
      rec.start()
      setElapsed(0)
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        setElapsed((s) => {
          const next = s + 1
          if (next >= MAX_AUDIO_SECONDS) stop()
          return next
        })
      }, 1000)
    } catch {
      setError('دسترسی به میکروفون ممکن نشد')
    }
  }

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current) }, [])

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-3">
        <Button variant={recording ? 'danger' : 'primary'} onClick={recording ? stop : start}>
          <Mic size={16} /> {recording ? 'توقف ضبط' : 'شروع ضبط'}
        </Button>
        <span className="font-mono text-sm">{formatDuration(recording ? elapsed : durationSec || 0)}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">حداکثر {MAX_AUDIO_SECONDS} ثانیه — در ضمائم پرونده ذخیره می‌شود.</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {dataUrl && !recording && <audio className="mt-2 w-full" controls src={dataUrl} />}
    </div>
  )
}

function NoteCard({ note, onRemove }: { note: ToothNote; onRemove: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {note.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: note.color }} />}
          <Badge color="blue">{note.tooth_fdi ? `دندان ${note.tooth_fdi}` : 'یادداشت عمومی'}</Badge>
          <Badge color="slate">{KIND_LABELS[note.kind]}</Badge>
          {note.kind === 'audio' && note.duration_sec != null && (
            <span className="text-xs text-slate-500 font-mono">{formatDuration(note.duration_sec)}</span>
          )}
        </div>
        <button type="button" aria-label="بایگانی یادداشت" onClick={onRemove} className="text-slate-400 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      </div>

      {note.body && <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>}
      {note.kind === 'drawing' && note.attachment_data_url && (
        <img src={note.attachment_data_url} alt="یادداشت دست‌نویس" className="mt-2 rounded border border-slate-200 max-w-full" />
      )}
      {note.kind === 'audio' && note.attachment_data_url && (
        <div className="mt-2 flex items-center gap-2">
          <Play size={14} className="text-slate-400" />
          <audio className="w-full" controls src={note.attachment_data_url} />
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        {note.author_name ? `${note.author_name} — ` : ''}{new Date(note.created_at).toLocaleString('fa-IR')}
      </p>
    </Card>
  )
}
