// ModuleGlyphs.tsx — v2: each module's own real-world symbol (calendar,
// person, stethoscope, wallet, flask, etc.) is now the DOMINANT, full-
// size shape — not a shared tooth outline with a tiny corner badge.
// The earlier design made every icon read as "a tooth" from a normal
// glance, with the actually-distinguishing element too small to
// register — exactly the complaint: "they all look the same." Flipped
// the emphasis: the job-specific symbol carries the silhouette, a
// small tooth mark (bottom-right) is the only shared brand accent.

type GlyphProps = { size?: number | string; strokeWidth?: number | string }

// Small consistent brand accent — a simplified tooth mark, used at
// reduced size in the corner of every glyph below.
const toothAccent = (
  <path
    d="M19.5 15.2c-.6 0-1.1.2-1.4.7-.3.4-.3 1-.2 1.6.1.6.2 1.3.4 2 .1.3.2.6.2.8.1.2.2.2.3.1.1-.1.2-.3.2-.5 0-.2.1-.3.1-.5 0 .1 0 .3.1.5 0 .2.1.4.2.5.1.1.2.1.3-.1.1-.2.2-.5.2-.8.2-.7.3-1.4.4-2 .1-.6.1-1.2-.2-1.6-.3-.5-.8-.7-1.4-.7z"
    fill="white"
    fillOpacity="0.95"
  />
)

// نوبت‌دهی — a bold calendar page IS the icon; tooth mark bottom-right.
export function GlyphAppointments({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="4" width="16" height="15" rx="2.6" fill="currentColor" />
      <rect x="2.5" y="4" width="16" height="4.6" rx="2.6" fill="currentColor" fillOpacity="0.6" />
      <path d="M6.3 2.2v3.6M14.7 2.2v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="6.7" cy="12.4" r="1.15" fill="white" fillOpacity="0.9" />
      <circle cx="10.5" cy="12.4" r="1.15" fill="white" fillOpacity="0.9" />
      <circle cx="6.7" cy="16" r="1.15" fill="white" fillOpacity="0.9" />
      <circle cx="14.3" cy="12.4" r="1.15" fill="white" fillOpacity="0.55" />
      {toothAccent}
    </svg>
  )
}

// بیماران — a warm, rounded person silhouette as the main shape.
export function GlyphPatients({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="7.2" r="4" fill="currentColor" />
      <path d="M3.5 20c0-4.6 3.1-7.2 7-7.2s7 2.6 7 7.2" fill="currentColor" />
      {toothAccent}
    </svg>
  )
}

// درمان — a full stethoscope shape, the actual instrument, not a hint of one.
export function GlyphTreatments({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2.5v5.3c0 2.6 2 4.6 4.6 4.6s4.6-2 4.6-4.6V2.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M10.6 12.4v2.4c0 2.7 2.2 4.6 4.9 4.6 2.5 0 4.6-1.9 4.8-4.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <circle cx="20.2" cy="14.6" r="2.3" fill="currentColor" />
      <circle cx="5" cy="2.3" r="1.5" fill="currentColor" />
      <circle cx="11" cy="2.3" r="1.5" fill="currentColor" />
      {toothAccent}
    </svg>
  )
}

// مالی — a full wallet shape with a coin, currency the dominant read.
export function GlyphBilling({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="18" height="13.5" rx="2.8" fill="currentColor" />
      <rect x="5" y="3" width="13" height="4.6" rx="2" fill="currentColor" fillOpacity="0.65" />
      <circle cx="15.6" cy="12.9" r="3" fill="white" fillOpacity="0.92" />
      <path d="M15.6 11.3v3.2M14.7 12v-.1c0-.5.4-.8 1-.8.6 0 1 .3 1 .8 0 1.1-2 .7-2 1.8 0 .5.4.8 1 .8.6 0 1-.3 1-.8" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      {toothAccent}
    </svg>
  )
}

// لابراتوار — a large erlenmeyer flask with liquid & bubbles.
export function GlyphLaboratory({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9.5 2.2h5v5.6l4.6 8.6c.9 1.7-.4 3.6-2.3 3.6H7.2c-1.9 0-3.2-1.9-2.3-3.6l4.6-8.6V2.2Z" fill="currentColor" />
      <rect x="8.8" y="1.8" width="6.4" height="1.8" rx="0.9" fill="currentColor" />
      <path d="M6.7 15.3h10.6" stroke="white" strokeOpacity="0.5" strokeWidth="1.3" />
      <circle cx="10" cy="17.6" r="0.9" fill="white" fillOpacity="0.6" />
      <circle cx="14.2" cy="18.4" r="1.2" fill="white" fillOpacity="0.6" />
      <circle cx="12" cy="16.2" r="0.7" fill="white" fillOpacity="0.5" />
      {toothAccent}
    </svg>
  )
}

// داشبورد — a real speedometer dial with needle, full-size.
export function GlyphDashboard({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2.2 16A9.8 9.8 0 0 1 21.8 16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.32" />
      <path d="M2.2 16A9.8 9.8 0 0 1 16.6 4" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="16" r="2" fill="currentColor" />
      <path d="M12 16 17 9.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {toothAccent}
    </svg>
  )
}

// ایمپلنت — a large implant screw/fixture with thread detail, the dominant shape.
export function GlyphImplants({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8.5 2h7l1.2 2.2-1.2 13.8a2 2 0 0 1-2 1.8h-1.8a2 2 0 0 1-2-1.8L8.5 4.2 8.5 2Z" fill="currentColor" />
      <path d="M7.6 6h8.8M7.9 8.3h8.2M8.2 10.6h7.6M8.5 12.9h7M8.8 15.2h6.4" stroke="white" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
      {toothAccent}
    </svg>
  )
}

// بیمه — a full shield with a checkmark, the dominant shape.
export function GlyphInsurance({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 20 5v6c0 5-3.4 8.4-8 9.6C7.4 19.4 4 16 4 11V5l8-3Z" fill="currentColor" />
      <path d="M8.4 11.4l2.4 2.4 4.8-5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {toothAccent}
    </svg>
  )
}

// انبار — three bold stacked boxes, the dominant shape.
export function GlyphInventory({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="3" width="8.4" height="8.4" rx="1.4" fill="currentColor" />
      <rect x="12.1" y="3" width="8.4" height="8.4" rx="1.4" fill="currentColor" fillOpacity="0.65" />
      <rect x="7.3" y="12.3" width="8.4" height="8.4" rx="1.4" fill="currentColor" fillOpacity="0.85" />
      {toothAccent}
    </svg>
  )
}

// نسخه — a large pill/capsule, the dominant shape.
export function GlyphPrescriptions({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="8.3" width="19" height="7.4" rx="3.7" fill="currentColor" transform="rotate(-30 11 12)" />
      <path d="M8.2 8.6l5.6 6.8" stroke="white" strokeOpacity="0.75" strokeWidth="1.1" strokeLinecap="round" />
      {toothAccent}
    </svg>
  )
}

// رادیولوژی — a bold X-ray scan frame with corner brackets.
export function GlyphRadiology({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 7V3.5h4M17 3.5h4V7M3 13v3.5h4M21 13v3.5h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="12" cy="10.2" r="3.4" fill="currentColor" />
      <path d="M10.4 10.2l1.2 1.2 2.2-2.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {toothAccent}
    </svg>
  )
}

// پرسنل — a large ID badge on a lanyard, the dominant shape.
export function GlyphStaff({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9.5 1.5l2.5 3 2.5-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="5" y="4.5" width="14" height="15" rx="2.6" fill="currentColor" />
      <circle cx="12" cy="9.6" r="2.5" fill="white" fillOpacity="0.9" />
      <path d="M8 16.2c0-1.9 1.7-3 4-3s4 1.1 4 3" stroke="white" strokeOpacity="0.9" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {toothAccent}
    </svg>
  )
}

// گزارش‌ها — bold ascending bar chart, the dominant shape.
export function GlyphReports({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="12.5" width="4.4" height="7.5" rx="1.2" fill="currentColor" fillOpacity="0.55" />
      <rect x="9.8" y="8" width="4.4" height="12" rx="1.2" fill="currentColor" fillOpacity="0.8" />
      <rect x="17.1" y="2.5" width="4.4" height="17.5" rx="1.2" fill="currentColor" />
      {toothAccent}
    </svg>
  )
}

// انتظار — a large hourglass, the dominant shape.
export function GlyphWaitingList({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.5 2.5h13M4.5 19.5h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.5 2.8c0 4.3 2.7 6.2 5.3 6.2s5.3-1.9 5.3-6.2M5.5 19.2c0-4.3 2.7-6.2 5.3-6.2s5.3 1.9 5.3 6.2" fill="currentColor" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
      {toothAccent}
    </svg>
  )
}

// تنظیمات — a large gear, the dominant shape.
export function GlyphSettings({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="3.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="11" cy="11" r="1.1" fill="currentColor" />
      <path
        d="M11 3.5v2.2M11 16.3v2.2M18.5 11h-2.2M5.7 11H3.5M16.2 5.8l-1.5 1.5M7.3 14.7l-1.5 1.5M16.2 16.2l-1.5-1.5M7.3 7.3L5.8 5.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {toothAccent}
    </svg>
  )
}

// بایگانی — a large archive box with lid, the dominant shape.
export function GlyphArchive({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="3" width="16" height="4.6" rx="1.3" fill="currentColor" />
      <path d="M3.4 8.4h14.2v7.2a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2V8.4Z" fill="currentColor" fillOpacity="0.85" />
      <path d="M7.5 11.4h5" stroke="white" strokeOpacity="0.75" strokeWidth="1.4" strokeLinecap="round" />
      {toothAccent}
    </svg>
  )
}

// تقویم — a large month-grid calendar with date dots, the dominant shape.
export function GlyphCalendar({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="4" width="16.5" height="15" rx="2.6" fill="currentColor" />
      <path d="M6 2v3.6M15.5 2v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M2.5 8.6h16.5" stroke="white" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="6.2" cy="12" r="1" fill="white" fillOpacity="0.85" /><circle cx="10.7" cy="12" r="1" fill="white" fillOpacity="0.85" /><circle cx="15.2" cy="12" r="1" fill="white" fillOpacity="0.5" />
      <circle cx="6.2" cy="15.6" r="1" fill="white" fillOpacity="0.85" /><circle cx="10.7" cy="15.6" r="1" fill="white" fillOpacity="0.5" />
      {toothAccent}
    </svg>
  )
}

// مالی شخصی — a large piggy bank, the dominant shape.
export function GlyphPersonalFinance({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <ellipse cx="10.5" cy="12" rx="8" ry="6" fill="currentColor" />
      <circle cx="18.3" cy="8.6" r="2.3" fill="currentColor" />
      <path d="M6.5 12h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 17v2M13.5 17v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 11.5c0 1.6 1 2.5 2.2 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {toothAccent}
    </svg>
  )
}

// پیامک — a large speech/message bubble, the dominant shape.
export function GlyphSms({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2.5 4.8A2.3 2.3 0 0 1 4.8 2.5h14.4a2.3 2.3 0 0 1 2.3 2.3v8.4a2.3 2.3 0 0 1-2.3 2.3H9l-4.6 3.9v-3.9H4.8a2.3 2.3 0 0 1-2.3-2.3V4.8Z" fill="currentColor" />
      <circle cx="7.5" cy="9" r="1.1" fill="white" /><circle cx="12" cy="9" r="1.1" fill="white" /><circle cx="16.5" cy="9" r="1.1" fill="white" />
      {toothAccent}
    </svg>
  )
}

// یادآوری‌ها — a large alarm bell, the dominant shape.
export function GlyphReminders({ size = 24 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2.2c-3.1 0-5.2 2.2-5.2 5.2 0 4.2-1.2 5.6-2.1 6.5-.4.4-.1 1.1.5 1.1h13.6c.6 0 .9-.7.5-1.1-.9-.9-2.1-2.3-2.1-6.5 0-3-2.1-5.2-5.2-5.2z" fill="currentColor" />
      <path d="M9.6 17.4a2.4 2.4 0 0 0 4.8 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="1.7" r="1.3" fill="currentColor" />
      {toothAccent}
    </svg>
  )
}
