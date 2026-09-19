---
name: accessibility-wcag22
description: >-
  WCAG 2.2 Level AA accessibility compliance for dental clinic systems.
  Enforces 4.5:1 text contrast ratios, full keyboard navigation, screen reader ARIA labels,
  RTL Persian layout integrity, and universal Persian digit conversion.
---

# WCAG 2.2 Level AA Clinical Accessibility Standard

## Purpose
Ensures the software remains universally accessible, usable under high-glare operatory lighting, navigable via keyboard for rapid front-desk check-in, and fully compatible with assistive technologies.

## Core Rules

### 1. Contrast Ratios (WCAG 2.2 AA)
- Normal text (<18pt) must maintain a contrast ratio >= 4.5:1 against its background.
- Large text (>=18pt or >=14pt bold) and interactive UI components must maintain >= 3:1.
- In Dark Mode (OLED black), muted text must not drop below `text-slate-300` on dark glass cards.

### 2. Full Keyboard Operability
- All clinical dialogs, dental pickers, and billing tables must be operable using:
  - `Tab` / `Shift+Tab`: Forward / backward focus cycling.
  - `Enter` / `Space`: Activation.
  - `Escape`: Cancel / close dialog.
- Focus rings must be clearly visible (`focus-visible:ring-2 focus-visible:ring-teal-500`).

### 3. RTL & Persian Localization
- Strict Right-to-Left (RTL) reading order:
  - Logical CSS properties preferred (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
  - Icons that indicate direction (e.g. arrows, chevrons) must be flipped for RTL.
- Universal Persian Numerals: All financial amounts, dates, patient IDs, and tooth numbers must pass through `toPersianDigits()`.

### 4. Semantic HTML & ARIA
- Modal dialogs must specify `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`.
- Buttons lacking visible text (icon-only buttons) must include `aria-label`.
