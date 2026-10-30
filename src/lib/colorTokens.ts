// Shared color tokens for contexts that cannot use Tailwind classes
// (inline `style` props, <canvas> drawing, Recharts props such as
// `fill`/`stroke`/`stopColor`, dynamic `color-mix()` CSS strings, etc.).
//
// These values must stay in lockstep with the `colors` palette in
// tailwind.config.js — do not hardcode a hex literal anywhere else in the
// app when a semantic token from this file (or a Tailwind class) covers
// the case. See docs/DESIGN-TOKENS.md §5 for the full policy and the
// documented exceptions (categorical multi-hue lists, dental/SVG diagrams,
// print/export HTML templates).

export const colorTokens = {
  primary: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
  secondary: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  accent: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
  success: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
  warning: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
  error: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
} as const

// Neutral axis/tick label color shared by every Recharts chart in the app
// (XAxis/YAxis `tick.fill`). Recharts only accepts literal color strings,
// so this constant is the "shared token" for that context instead of a
// Tailwind class.
export const CHART_AXIS_COLOR = colorTokens.secondary[400]
export const CHART_AXIS_COLOR_STRONG = colorTokens.secondary[500]
