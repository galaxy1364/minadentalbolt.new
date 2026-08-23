/**
 * Role-based access control.
 *
 * Every staff row in `users.role` must be one of ROLES below. The admin
 * (owner) sets each staff member's role when creating their account; this
 * map controls which modules/routes that role can see and open.
 */

export const ROLES = {
  owner: 'مدیر کلینیک',
  doctor: 'پزشک',
  receptionist: 'منشی',
  assistant: 'دستیار',
  lab: 'لابراتوار',
  accountant: 'حسابدار',
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
  doctor: ['/', '/patients', '/appointments', '/treatments', '/prescriptions', '/radiology', '/implants', '/waiting-list', '/reports', '/settings', '/calendar'],
  receptionist: ['/', '/patients', '/appointments', '/billing', '/waiting-list', '/insurance', '/archive', '/settings', '/calendar', '/sms', '/reminders'],
  assistant: ['/', '/patients', '/appointments', '/treatments', '/waiting-list', '/settings', '/calendar'],
  lab: ['/', '/laboratory', '/implants', '/settings', '/calendar'],
  accountant: ['/', '/billing', '/insurance', '/reports', '/archive', '/settings', '/personal-finance', '/reminders'],
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

