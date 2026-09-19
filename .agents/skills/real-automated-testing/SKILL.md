---
name: real-automated-testing
description: >-
  Strict test-driven verification requiring real, verifiable tests for every code change.
  Mandates running Vitest, React Testing Library, contract tests, and automated health scanners.
  Prohibits placeholder assertions, mock passes, or untested production code.
---

# Real Automated Testing Protocol

## 1. Absolute Prohibition of Fake Tests
- **No Mock Passes**: Never mark tests as passed without actual execution.
- **No Skipped Tests**: `it.skip`, `describe.skip`, and `xit` are prohibited in core feature verification suites.
- **No Vacuous Assertions**: Assertions like `expect(true).toBe(true)` or testing trivial identity without inspecting real DOM, state, or side effects are forbidden.

## 2. Multi-Layer Testing Architecture
Every feature, fix, or refactor must be verified across three distinct testing tiers:

### Tier 1: Unit & Component Testing (Vitest + React Testing Library)
- Test user interactions (clicks, inputs, keyboard navigation, tab order).
- Test edge cases: empty data, network errors, malformed payloads, rapid clicks, re-renders.
- Verify that DOM mutations and feedback toasts occur as expected.

### Tier 2: Contract & Behavioral Invariant Tests
- Invariants must be enforced programmatically via contract tests (`*.contract.test.js`).
- Verify data model constraints, role-based access permissions, state machine transitions, and immutability rules.

### Tier 3: Automated Health & Dead-Code Scanning
- Scan for:
  1. Buttons lacking `onClick`, `type="submit"`, or `disabled`.
  2. Dialogs missing `<DialogTitle>`, `<DialogDescription>`, or `aria-describedby`.
  3. Unhandled promise rejections / missing error toasts.
  4. Missing Persian digit formatting in financial and date widgets.

## 3. Real Test Execution Standard
- After any code modification, the developer/agent MUST execute the relevant tests using the command runner (e.g. `npm test -- --run <test-file>` or `npm test`).
- 100% pass rate is mandatory before declaring completion.
- If a test fails, diagnosing the root cause and fixing the code (or correcting test expectations if requirements shifted) is required before moving forward.
