// A fixed, consistent color palette for doctors — used everywhere an
// appointment/schedule item needs to visually show whose it is (the
// new-appointment wizard, the calendar module, appointment lists).
// Keeping this in one shared file means Settings (where the color is
// picked) and every place that displays it always agree.
export const DOCTOR_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#eab308', // yellow
  '#a855f7', // purple
  '#22c55e', // green
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
]

export function doctorColor(color: string | null | undefined, fallbackIndex = 0): string {
  return color || DOCTOR_COLOR_PALETTE[fallbackIndex % DOCTOR_COLOR_PALETTE.length]
}
