---
name: full-stack-code-auditor
description: Full-stack clean architecture, SOLID principles, defensive typing, comprehensive automated testing (Vitest, Playwright E2E), zero-placeholder rule, zero data destruction (soft-delete immutability), and performance benchmarking.
---

# Full-Stack Code Quality & Clinical Integrity Auditor

## Purpose
Enforces rigorous software engineering standards across the full application lifecycle. Prohibits shortcuts, mock implementations in production paths, temporary hacks, or untested clinical calculations.

## Core Rules

### 1. Zero Placeholders & Real Implementation
- All features must be fully functional from end to end. No dummy functions, `TODO` markers in business logic, or stubbed endpoints.
- Every state must handle: loading, error, empty, active, and offline states.

### 2. Clinical Immutability & Data Safety (ISO 27001 / HIPAA)
- **Zero Hard Deletes:** Clinical records (patients, encounters, appointments, treatments, invoices, payments, teeth notes) must NEVER be deleted from the database. Use status toggles (`status: 'cancelled'`, `is_active: false`).
- **Financial Audit Integrity:** Every monetary transaction must be immutable and audit-logged with actor name, role, timestamp, and previous state.

### 3. Automated Verification Standard
- Every feature or bug fix must be accompanied by real automated tests (Vitest unit tests or Playwright E2E tests).
- All changes must pass:
  ```bash
  npm run verify
  ```
  which validates:
  1. Service worker version sync (`sync-version.mjs`)
  2. Strict TypeScript compilation (`tsc --noEmit`)
  3. Complete unit test suite (`vitest run`)
  4. Production Vite bundle build (`vite build`)
