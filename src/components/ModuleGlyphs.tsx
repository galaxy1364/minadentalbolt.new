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

// انبار — a tooth with a small stacked-boxes mark.
export function GlyphInventory({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="14.4" y="1.6" width="2.6" height="2.6" rx="0.5" fill="currentColor" />
      <rect x="17.4" y="1.6" width="2.6" height="2.6" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="15.9" y="4.5" width="2.6" height="2.6" rx="0.5" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

// نسخه — a tooth with a small pill/capsule mark.
export function GlyphPrescriptions({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="14.4" y="3.6" width="6.2" height="2.8" rx="1.4" fill="currentColor" transform="rotate(-35 17.5 5)" />
      <path d="M15.6 4.9l3.8-2.6" stroke="white" strokeOpacity="0.7" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  )
}

// رادیولوژی — a tooth with a small X-ray scan-frame mark.
export function GlyphRadiology({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M14.6 2h1.6M20.4 2h-1.6M14.6 7h1.6M20.4 7h-1.6M14.6 2v1.6M14.6 5.4V7M20.4 2v1.6M20.4 5.4V7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M15.4 4.5h4.2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

// پرسنل — a tooth with a small ID-badge/lanyard mark.
export function GlyphStaff({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="15.3" y="2.2" width="4.4" height="5.2" rx="1" fill="currentColor" />
      <circle cx="17.5" cy="4" r="0.9" fill="white" fillOpacity="0.85" />
      <path d="M16 6.4c0-.7.6-1.1 1.5-1.1s1.5.4 1.5 1.1" stroke="white" strokeOpacity="0.85" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      <path d="M16.7 1v1.4M18.3 1v1.4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  )
}

// گزارش‌ها — a tooth with a small bar/pie chart mark.
export function GlyphReports({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="14.6" y="4.6" width="1.5" height="2.6" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="16.7" y="3.2" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.8" />
      <rect x="18.8" y="1.6" width="1.5" height="5.6" rx="0.5" fill="currentColor" />
    </svg>
  )
}

// انتظار — a tooth with a small hourglass mark.
export function GlyphWaitingList({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <path d="M15.3 1.8h4.4M15.3 7h4.4M15.5 1.9c0 1.7 1 2.5 2 2.5s2-.8 2-2.5M15.5 6.9c0-1.7 1-2.5 2-2.5s2 .8 2 2.5" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  )
}

// تنظیمات — a tooth with a small gear mark.
export function GlyphSettings({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <circle cx="17.5" cy="4.3" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17.5" cy="4.3" r="0.5" fill="currentColor" />
      <path d="M17.5 1.4v1M17.5 6.2v1M20.4 4.3h-1M15.6 4.3h-1M19.6 2.2l-.7.7M16.1 6.4l-.7.7M19.6 6.4l-.7-.7M16.1 2.2l-.7-.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

// بایگانی — a tooth with a small archive-box mark.
export function GlyphArchive({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="14.5" y="1.8" width="6" height="2" rx="0.6" fill="currentColor" />
      <path d="M15 3.8h5v2.8a1 1 0 01-1 1h-3a1 1 0 01-1-1V3.8z" fill="currentColor" opacity="0.85" />
      <path d="M16.5 5h2" stroke="white" strokeOpacity="0.7" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  )
}

// تقویم — a tooth with a small full-month calendar grid mark.
export function GlyphCalendar({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={toothPath} fill="currentColor" fillOpacity="0.95" />
      <rect x="14.6" y="1.8" width="5.8" height="5.2" rx="1" fill="currentColor" />
      <path d="M14.6 3.4h5.8" stroke="white" strokeOpacity="0.6" strokeWidth="0.6" />
      <circle cx="15.9" cy="4.9" r="0.5" fill="white" fillOpacity="0.8" />
      <circle cx="17.5" cy="4.9" r="0.5" fill="white" fillOpacity="0.8" />
      <circle cx="15.9" cy="6.2" r="0.5" fill="white" fillOpacity="0.8" />
    </svg>
  )
}
