/**
 * Role-based access control.
 *
 * Every staff row in `users.role` must be one of ROLES below. The admin
 * (owner) sets each staff member's role when creating their account; this
 * map controls which modules/routes that role can see and open.
 */

/**
 * MOD-FIX-017 | یک واژگان نقش برای کل برنامه
 *
 * `Staff.tsx` ده نقش داشت و این فایل شش‌تا، با فقط چهار مورد مشترک.
 * هر کارمندی با نقشی که فقط در فهرست کارکنان بود — مدیر، تکنسین
 * لابراتوار، بهداشتکار — به `canAccess` می‌رسید، در هیچ نقشه‌ای پیدا
 * نمی‌شد، و **فقط داشبورد** می‌گرفت.
 *
 * At the time this was written the live clinic had five staff and three
 * of them held such a role, so three of five people could open nothing.
 * The two vocabularies each looked complete on their own, which is why
 * neither read as wrong.
 *
 * Values match what `staff.role` already stores, so no data changes.
 * Non-clinical roles are listed explicitly with dashboard-only access
 * rather than left out — an omission reads as an oversight, a deliberate
 * empty list reads as a decision.
 */
export const ROLES = {
  owner: 'مدیر کلینیک',
  manager: 'مدیر',
  doctor: 'پزشک',
  receptionist: 'پذیرش',
  assistant: 'دستیار دندانپزشک',
  hygienist: 'بهداشتکار',
  lab_technician: 'تکنسین لابراتوار',
  accountant: 'حسابدار',
  cleaner: 'نظافتچی',
  security: 'نگهبان',
  other: 'سایر',
} as const

// Mirrors Layout's REQUIRE_LOGIN flag: while login is disabled, nobody has
// a role yet, so role-based restrictions must not block navigation either.
export const REQUIRE_LOGIN = true

export type Role = keyof typeof ROLES

const ALL_PATHS = [
  '/', '/patients', '/appointments', '/treatments', '/billing', '/laboratory',
  '/implants', '/insurance', '/inventory', '/prescriptions', '/radiology',
  '/staff', '/reports', '/waiting-list', '/settings', '/archive', '/calendar', '/personal-finance', '/sms', '/reminders',
]

/** Route path prefixes each role is allowed to open. '/' always included. */
const ROLE_ACCESS: Record<Role, string[]> = {
  owner: ALL_PATHS,
  // A manager runs the clinic day to day but is not its owner. Everything
  // except the owner's private books.
  manager: ALL_PATHS.filter((p) => p !== '/personal-finance'),
  // Doctors send work to the lab, so they can see what they sent — the
  // treatment form creates the order and previously the doctor could not
  // then look at it.
  doctor: ['/', '/patients', '/appointments', '/treatments', '/prescriptions', '/radiology', '/implants', '/laboratory', '/waiting-list', '/reports', '/settings', '/calendar'],
  receptionist: ['/', '/patients', '/appointments', '/billing', '/waiting-list', '/insurance', '/archive', '/settings', '/calendar', '/sms', '/reminders'],
  assistant: ['/', '/patients', '/appointments', '/treatments', '/waiting-list', '/settings', '/calendar'],
  hygienist: ['/', '/patients', '/appointments', '/treatments', '/waiting-list', '/settings', '/calendar'],
  lab_technician: ['/', '/laboratory', '/implants', '/settings', '/calendar'],
  accountant: ['/', '/billing', '/insurance', '/reports', '/archive', '/settings', '/personal-finance', '/reminders'],
  // Present on the payroll, not users of the clinical system. Listed so
  // the absence is a decision rather than a gap.
  cleaner: ['/'],
  security: ['/'],
  other: ['/'],
}

export function canAccess(role: string | null | undefined, path: string): boolean {
  if (!REQUIRE_LOGIN) return true
  if (!role) return path === '/'
  const allowed = permissionOverrides?.[role] ?? (role in ROLE_ACCESS ? ROLE_ACCESS[role as Role] : null)
  if (!allowed) return path === '/' // unknown role (no override loaded yet, not a built-in): dashboard only
  if (path === '/') return true
  // patient detail route
  if (path.startsWith('/patients/')) return allowed.includes('/patients')
  return allowed.includes(path)
}

export function allowedPaths(role: string | null | undefined): string[] {
  if (!role) return ['/']
  return permissionOverrides?.[role] ?? (role in ROLE_ACCESS ? ROLE_ACCESS[role as Role] : ['/'])
}

export function roleLabel(role: string | null | undefined): string {
  if (!role || !(role in ROLES)) return 'کاربر'
  return ROLES[role as Role]
}

// ── Database-backed permission overrides ────────────────────────────────
// canAccess() stays synchronous (it's called during render, on every
// route/nav-item check) by reading from an in-memory map that's populated
// once — via loadRolePermissionOverrides() in api.ts — from the
// role_permissions table. Until that map is loaded (first paint, or
// offline before the initial sync), or for a role it has no entry for,
// canAccess() falls straight back to the hardcoded ROLE_ACCESS/ALL_PATHS
// above. This is the safety net that makes it impossible for a half-loaded
// permissions table to lock a real role out of the whole app.
let permissionOverrides: Record<string, string[]> | null = null

export function setPermissionOverrides(overrides: Record<string, string[]> | null): void {
  permissionOverrides = overrides
}

export function getAllModulePaths(): string[] {
  return ALL_PATHS
}

