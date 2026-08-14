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
export const REQUIRE_LOGIN = false

export type Role = keyof typeof ROLES

const ALL_PATHS = [
  '/', '/patients', '/appointments', '/treatments', '/billing', '/laboratory',
  '/implants', '/insurance', '/inventory', '/prescriptions', '/radiology',
  '/staff', '/reports', '/waiting-list', '/settings',
]

/** Route path prefixes each role is allowed to open. '/' always included. */
const ROLE_ACCESS: Record<Role, string[]> = {
  owner: ALL_PATHS,
  doctor: ['/', '/patients', '/appointments', '/treatments', '/prescriptions', '/radiology', '/implants', '/waiting-list', '/reports', '/settings'],
  receptionist: ['/', '/patients', '/appointments', '/billing', '/waiting-list', '/insurance', '/settings'],
  assistant: ['/', '/patients', '/appointments', '/treatments', '/waiting-list', '/settings'],
  lab: ['/', '/laboratory', '/implants', '/settings'],
  accountant: ['/', '/billing', '/insurance', '/reports', '/settings'],
}

export function canAccess(role: string | null | undefined, path: string): boolean {
  if (!REQUIRE_LOGIN) return true
  if (!role || !(role in ROLE_ACCESS)) return path === '/' // unknown/missing role: dashboard only
  const allowed = ROLE_ACCESS[role as Role]
  if (path === '/') return true
  // patient detail route
  if (path.startsWith('/patients/')) return allowed.includes('/patients')
  return allowed.includes(path)
}

export function allowedPaths(role: string | null | undefined): string[] {
  if (!role || !(role in ROLE_ACCESS)) return ['/']
  return ROLE_ACCESS[role as Role]
}

export function roleLabel(role: string | null | undefined): string {
  if (!role || !(role in ROLES)) return 'کاربر'
  return ROLES[role as Role]
}
