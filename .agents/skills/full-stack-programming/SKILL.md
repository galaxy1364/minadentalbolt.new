---
name: full-stack-programming
description: >-
  End-to-end full-lifecycle software engineering from zero to one hundred (0 to 100).
  Guides architecture design, modular UI/UX implementation, state management,
  Clean Architecture, SOLID principles, API integrations, and defensive programming
  without shortcuts, mocks, or placeholders.
---

# Full-Stack 0 to 100 Software Engineering Standard

## 1. Zero to One Hundred (0-to-100) Lifecycle
Every software engineering task must be carried through its entire lifecycle from initial analysis to verified production-ready completion:

1. **Discovery & Architecture Mapping**:
   - Trace existing component ownership and data flow.
   - Never create duplicate abstractions, parallel stores, or duplicate components.
   - Establish strict type contracts, schema validations, and state machines.

2. **Clean Architecture & SOLID Principles**:
   - **Single Responsibility**: Each component, hook, service, and utility does exactly one well-defined job.
   - **Open/Closed**: Design extensible components via composable slots, props, and variant systems.
   - **Liskov Substitution**: Maintain expected contracts and return shapes across implementations.
   - **Interface Segregation**: Keep component props and API interfaces focused and minimal.
   - **Dependency Inversion**: Decouple UI presentation from concrete backend or storage implementations.

3. **Defensive Programming & Resilience**:
   - Zero unhandled promise rejections.
   - Every async mutation must have loading, success, error toast, and rollback mechanisms.
   - Wrap components and pages in Error Boundaries with friendly fallback UI.
   - Validate all external and user inputs using Zod or equivalent validation schemas.

4. **Zero Placeholders & Zero Dead Code**:
   - Every button, input, toggle, and trigger must be fully wired to real state or handlers.
   - No `onClick={() => {}}` or dead stubs in user-facing components.
   - If a feature is disabled or pending permission, it must be explicitly `disabled` with a clear explanation tooltip or badge.

5. **State Management & Offline Capability**:
   - Use canonical stores and caches (e.g. React Query / centralized stores).
   - Optimistic updates with rollback on network failure.
   - Persistent offline queue and conflict resolution where appropriate.
