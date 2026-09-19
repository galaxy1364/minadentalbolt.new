---
name: international-software-standards
description: >-
  Enforces 100% compliance with international engineering standards including
  ISO/IEC 25010 (Software Quality), WCAG 2.2 AA (Accessibility), OWASP Top 10 (Web Security),
  Apple HIG / Material Design 3 (UI/UX & Micro-interactions), and FHIR/EHR clinical data standards.
---

# 100% International Software Engineering Standards

## 1. ISO/IEC 25010 Software Quality Standard
All code and architecture must satisfy the eight ISO/IEC 25010 product quality characteristics:
1. **Functional Suitability**: Completeness, correctness, and appropriateness of all user and clinical workflows.
2. **Performance Efficiency**: Sub-100ms interaction response, lazy loading, debounced inputs, optimized re-renders, sub-1.5s LCP.
3. **Compatibility**: Interoperability across modern browsers (Chrome, Edge, Safari, Firefox) and mobile web viewports.
4. **Usability**: Intuitive information architecture, clear feedback, error prevention, and zero cognitive clutter.
5. **Reliability**: Fault tolerance, error boundaries, automated recovery, and offline data buffering.
6. **Security**: Zero unauthenticated mutations, strict RBAC, data encryption, XSS/injection protection, audit trails.
7. **Maintainability**: Clean Code, modular decoupling, DRY principles, consistent naming, comprehensive test coverage.
8. **Portability**: Standard-compliant web technologies, containerization/PWA readiness, responsive layouts.

## 2. Web Accessibility: WCAG 2.2 Level AA
- **Perceivable**: Text contrast ratio >= 4.5:1 (>= 3:1 for large text); support both light and dark mode without contrast loss.
- **Operable**: Full keyboard navigability (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`); minimum touch target size 44x44 CSS pixels.
- **Understandable**: Clear labels, descriptive error messages with actionable resolution guidance.
- **Robust**: Valid ARIA attributes (`aria-expanded`, `aria-label`, `aria-describedby`), semantic HTML (`<main>`, `<nav>`, `<article>`, `<button>`).

## 3. Web & Clinical Application Security: OWASP Top 10
- **Broken Access Control**: Strict client + backend role-based access checks (RBAC).
- **Cryptographic Failures**: Never store sensitive plaintext in localStorage; mask PII and financial details.
- **Injection Prevention**: Parameterized queries, sanitized rich-text, HTML escaping.
- **Security Logging and Monitoring**: Audit trail for sensitive actions (financial changes, patient EHR updates, staff permissions).

## 4. Design & Interaction Standards (Apple HIG & Material 3)
- **Glassmorphism & Surface Tokens**: Backdrop blur, subtle borders, semantic surfaces (`surface-primary`, `surface-elevated`).
- **Typography & Localization**: Vazirmatn font for Persian/Farsi with comfortable line heights; right-to-left (RTL) padding and margins (`ps-*`, `pe-*`).
- **Persian Numbers**: Consistent use of `toPersianDigits()` on all financial amounts, dates, and tooth numbers.
- **Micro-interactions**: Subtle hover elevations, active tap feedback, smooth spring transitions, zero jarring layout shifts.
