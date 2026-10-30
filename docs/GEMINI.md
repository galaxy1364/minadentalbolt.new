# Antigravity Autonomous Master Configuration & Autostart Protocol

## 1. Startup & Session Autostart Protocol (MANDATORY)
Whenever Antigravity starts or receives a request in this project, it must automatically activate and enforce the complete suite of Enterprise Mobile & Full-Stack rules:

### A. Full-Stack 0-to-100 & Modular Architecture
- **Skill**: `full-stack-programming` & `mobile-modular-architecture`
- **Zero Placeholders**: Absolute prohibition of dummy handlers `onClick={() => {}}`, mocked returns, or unfinished UI stubs.
- **Modular Decoupling**: Isolate domain logic, state hooks, and UI presentation cleanly.
- **Defensive Typing & Resilience**: Zero unhandled rejections, strict TypeScript contracts, and Error Boundaries.

### B. Mobile Native UX (Apple HIG & Android Material 3)
- **Skill**: `ios-fluid-ux-27` & `sterile-touch-ergonomics`
- **Sterile Touch Targets**: Every interactive element (buttons, toggles, icon triggers, tabs) must have a minimum hit target of **48x48px**.
- **Dock-Scroll Navigation**: Horizontal tab lists must scroll smoothly with hidden scrollbars (`overflow-x-auto hide-scrollbar scroll-smooth whitespace-nowrap`).
- **Safe-Area Insets**: Content containers and bottom bars must respect notch and navigation insets (`padding-bottom: calc(... + env(safe-area-inset-bottom))`).
- **Fluid 120Hz Scrolling**: Eliminate heavy `backdrop-blur` on mobile viewports; use hardware-accelerated transforms and optimized radial gradients.
- **Tactile Haptic Feedback**: Every touch interaction triggers `h.tap()`.

### C. Universal Persian RTL & Clinical Standards
- **Skill**: `accessibility-wcag22` & `dental-clinical-workflow`
- **Universal Persian Numerals**: Convert all dynamic numbers and counters using `toPersianDigits()`.
- **Jalali Date Formatting**: Format all dates with `toJalaliStringPretty()`.
- **Directional Icons**: Respect RTL layouts.
- **Accessibility**: Comprehensive `aria-label` attributes on all icon-only buttons.

### D. Security & Data Integrity
- **Skill**: `iso-27001-compliance` & `financial-legal-governance`
- **Immutable Soft-Delete**: Never physically delete records (`deleted_at` only).
- **Audit Logging**: Every mutation must call `recordAuditLog()`.

### E. Continuous Verification & Autonomous Production Deployment
- **Skill**: `real-automated-testing`
- After every enhancement or fix:
  1. Verify TypeScript: `tsc --noEmit`
  2. Verify Test Suite: `npm test`
  3. Verify Production Build: `npm run build`
  4. Auto-deploy to Vercel: `npm run deploy` (Production URL: `https://minadentalbolt-new.vercel.app`)

## 2. Permanent Credentials & Tokens
- **VERCEL_TOKEN**: Loaded from `.env.local`
- **VERCEL_TEAM_ID**: `team_K4mkyTW2Ju9Xqg9uR39S3c3d`
- **VERCEL_PROJECT_ID**: `prj_aaz8FPTn53zNAzHEE2Rfw1Lr28Pq`
- **VERCEL_PROJECT_NAME**: `minadentalbolt-new`
- **VERCEL_ORG**: `galaxymehdi1364-6831s-projects`
- **Production Live URL**: `https://minadentalbolt-new.vercel.app`
