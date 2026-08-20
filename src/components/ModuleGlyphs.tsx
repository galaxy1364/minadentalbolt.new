// ModuleGlyphs.tsx — real custom icon marks, hand-drawn in SVG, one
// per primary module. Not a recolored generic lucide-react shape: each
// glyph fuses a small tooth silhouette (the brand's own motif, matching
// the logo) with an element specific to that module's job, so
// نوبت‌دهی actually looks different in SILHOUETTE from درمان, not just
// in color. Rendered at 24x24 viewBox so they drop into ModuleIconBadge
// exactly like a lucide icon would (same size prop, same currentColor
// fill via `fill="currentColor"` throughout).

type GlyphProps = { size?: number | string; strokeWidth?: number | string }

const toothPath = 'M12 3.4c-1.5 0-2.7.5-3.3 1.6-.6 1-.7 2.3-.5 3.7.2 1.5.6 3.2 1 4.9.2.8.4 1.5.5 1.9.1.3.4.5.7.3.3-.2.4-.7.6-1.3.1-.4.2-.8.2-1.1 0 .3.1.7.2 1.1.2.6.3 1.1.6 1.3.3.2.6 0 .7-.3.1-.4.3-1.1.5-1.9.4-1.7.8-3.4 1-4.9.2-1.4.1-2.7-.5-3.7-.6-1.1-1.8-1.6-3.3-1.6z'

// نوبت‌دهی — a tooth wearing a small calendar-page fold on its
// shoulder, with a dot marking "today".
export function GlyphAppointments({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="13.5" y="2.5" width="7" height="6" rx="1.4" fill="currentColor" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M15 2.5v1.6M19 2.5v1.6" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round" />
      <circle cx="17" cy="6.2" r="1" fill="white" />
    </svg>
  )
}

// بیماران — a tooth with a small person silhouette nested at its base,
// like the tooth is "holding" the patient it represents.
export function GlyphPatients({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <circle cx="17.3" cy="4.3" r="2" fill="currentColor" />
      <path d="M14 9.5c0-2 1.5-3 3.3-3s3.3 1 3.3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// درمان — a tooth with a stethoscope head resting against it.
export function GlyphTreatments({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M15 2.2v2.6c0 1.4 1 2.4 2.3 2.4s2.3-1 2.3-2.4V2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="19.6" cy="8.6" r="1.5" fill="currentColor" />
      <circle cx="15" cy="1.9" r="0.9" fill="currentColor" />
    </svg>
  )
}

// مالی — a tooth with a coin/wallet-slot mark, using the classic
// currency-slot notch as the distinguishing shape.
export function GlyphBilling({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <circle cx="17.5" cy="4.5" r="3.1" fill="currentColor" />
      <path d="M17.5 2.9v3.2M16.6 3.5c0-.5.4-.8 1-.8.7 0 1.1.4 1.1.9 0 1.1-2.1.7-2.1 1.9 0 .5.5.9 1.1.9.6 0 1-.3 1-.8" stroke="white" strokeOpacity="0.85" strokeWidth="0.7" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// لابراتوار — a tooth beside a small flask/beaker shape.
export function GlyphLaboratory({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M16 1.6h3v1l1.6 3.4c.4.8-.2 1.8-1.1 1.8h-3c-.9 0-1.5-1-1.1-1.8L16 2.6z" fill="currentColor" />
      <path d="M16.3 5.3h2.4" stroke="white" strokeOpacity="0.6" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="17.9" cy="7" r="0.5" fill="white" fillOpacity="0.8" />
    </svg>
  )
}

// داشبورد — a tooth centered inside a speedometer/gauge arc.
export function GlyphDashboard({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 15.5a8.5 8.5 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M12 15.5 15 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" />
      <g transform="translate(6.2 -5.5) scale(0.55)">
        <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      </g>
    </svg>
  )
}

// ایمپلنت — a tooth with a small implant screw/fixture beside it.
export function GlyphImplants({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M17.5 1.6v3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.6 3.4h3.8M15.9 4.7h3.2M16.2 6h2.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <circle cx="17.5" cy="1.6" r="1.3" fill="currentColor" />
    </svg>
  )
}

// بیمه — a tooth guarded by a small shield-check mark.
export function GlyphInsurance({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M17.5 1.4 20 2.3v2c0 1.6-1 2.9-2.5 3.4-1.5-.5-2.5-1.8-2.5-3.4v-2z" fill="currentColor" />
      <path d="M16.3 4.1l.9.9 1.5-1.7" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// مالی شخصی — a tooth beside a small piggy-bank silhouette.
export function GlyphPersonalFinance({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <ellipse cx="17.5" cy="4.6" rx="3" ry="2.3" fill="currentColor" />
      <circle cx="20" cy="3.2" r="0.9" fill="currentColor" />
      <path d="M15.5 4.6h.01" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.5 6.6v1M18.5 6.6v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

// پیامک — a tooth with a small speech/message bubble.
export function GlyphSms({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M14.3 1.8h5.4c.7 0 1.3.6 1.3 1.3v2.4c0 .7-.6 1.3-1.3 1.3h-3.4l-1.7 1.5V6.8h-.3c-.7 0-1.3-.6-1.3-1.3V3.1c0-.7.6-1.3 1.3-1.3z" fill="currentColor" />
      <circle cx="16" cy="4.1" r="0.5" fill="white" />
      <circle cx="17.5" cy="4.1" r="0.5" fill="white" />
      <circle cx="19" cy="4.1" r="0.5" fill="white" />
    </svg>
  )
}

// یادآوری‌ها — a tooth with a small alarm-bell mark.
export function GlyphReminders({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M17.5 1.9c-1.4 0-2.4 1-2.4 2.4 0 1.6-.4 2-.9 2.5h6.6c-.5-.5-.9-.9-.9-2.5 0-1.4-1-2.4-2.4-2.4z" fill="currentColor" />
      <path d="M16.5 7.2a1 1 0 002 0" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <circle cx="17.5" cy="1.6" r="0.6" fill="currentColor" />
    </svg>
  )
}
