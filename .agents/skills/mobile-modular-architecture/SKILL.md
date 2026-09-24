---
name: mobile-modular-architecture
description: >-
  Ultra-professional iOS (Apple HIG) and Android (Material 3) modular architecture standard.
  Enforces 48px+ sterile touch hit targets, 120Hz smooth fluid scrolling, Master-Detail navigation,
  safe-area inset compliance, modular component decoupling, and RTL Persian layout perfection.
---

# Mobile Modular Architecture Standard (iOS & Android)

## 1. Modular Architecture Principles
- **Decoupled Module Structure**: Each domain feature (Appointments, Clinical Charting, Lab Orders, Financials, Documents, Settings) must be encapsulated with its own state slice, types, and presentation components.
- **Master-Detail Flow**: On mobile viewports (< 768px), avoid overwhelming horizontal tabs. Use Master-Detail navigation (Overview, Clinical, Appointments, Finance & Docs) with nested drill-down subviews and dedicated back buttons.
- **Dock-Scroll Navigation**: Primary tabs must support smooth horizontal dock-scrolling with hidden scrollbars (`overflow-x-auto hide-scrollbar scroll-smooth whitespace-nowrap`).

## 2. Sterile Touch & Ergonomics (Apple HIG & Android M3)
- **Minimum 48x48px Hit Targets**: Every interactive element (buttons, toggles, select triggers, icons) must have a touch target of at least 48x48 pixels to accommodate sterile gloved fingers.
- **Acoustic & Tactile Haptic Feedback**: Every touch interaction triggers instant tactile haptic feedback (`h.tap()`, `h.success()`, `h.error()`).
- **Safe-Area Insets**: The bottom navigation and content containers must respect device safe areas: `paddingBottom: calc(x + env(safe-area-inset-bottom))`.
- **120Hz Fluid Motion**: Prohibit heavy CPU/GPU backdrop-filters (`backdrop-blur`) on low-power mobile devices. Use hardware-accelerated transforms (`transform: translateZ(0)`) and optimized radial gradients.

## 3. Universal Persian RTL & Accessibility
- **RTL Integrity**: Proper bidirectional layout support, directional icons (back buttons point right in RTL, forward drill-downs point left).
- **Persian Digits & Jalali Calendar**: Universal conversion to Persian numerals (`toPersianDigits()`) and Iranian standard Jalali dates (`toJalaliStringPretty()`).
- **WCAG 2.2 AA Accessibility**: Every interactive icon without visible text must have a descriptive `aria-label`.
