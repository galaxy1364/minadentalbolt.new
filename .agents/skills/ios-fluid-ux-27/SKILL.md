---
name: ios-fluid-ux-27
description: World-class iOS 27 / Apple HIG & Fluid Material UI/UX design, ultra-smooth 120Hz gesture ergonomics, sterile-glove touch targets (min 48px), safe-area resilience, zero-flicker zero-jitter scrolling, dynamic background layer containment, and tactile Persian RTL layout.
---

# iOS 27 Fluid Clinical UX & Ergonomics Standard

## Purpose
Guarantees that the web application feels as responsive, tactile, fluid, and robust as a native iOS 27 and flagship Android mobile application, specifically optimized for healthcare and dental clinics where operators may use sterile gloves or touchscreens with rapid gestures.

## Core Rules

### 1. Zero-Flicker, Zero-Jitter Scroll Architecture
- **Single Scroll Element Rule:** Never place `overflow-x: hidden` or `overflow-y: auto` on `<main>` or intermediate container elements if the `<body>` is already handling viewport scrolling. Having multiple nested scroll containers leads to touch event hijacking, resulting in stutter, rubber-banding glitches, and jitter.
- **Hardware-Accelerated Composite Isolation:**
  - Background blurs (`filter: blur(...)`) and large animated gradient blobs must be isolated using:
    ```css
    contain: strict;
    transform: translate3d(0, 0, 0);
    -webkit-transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    pointer-events: none;
    ```
  - On mobile viewports (`max-width: 768px`), heavy runtime CSS blurs (`>40px`) must be reduced or converted to smooth pre-rendered radial gradients to avoid GPU memory buffer exhaustion, which triggers white flashes / blank rectangles during fast scrolling.

### 2. Sterile-Glove Touch Ergonomics (Min 48px)
- Every interactive button, tab, and input trigger must maintain a minimum bounding hit target of 44x44px (recommended: 48x48px for dental operatories).
- Use `press-scale` (`active:scale-95` or `active:scale-90`) with immediate haptic response (`h.tap()`) and acoustic feedback (`chimes.playPop()`).
- Touch actions must feel instant: use `-webkit-tap-highlight-color: transparent; touch-action: manipulation;`.

### 3. Safe-Area Inset Resilience
- Fixed headers, bottom bars, and floating action buttons (FABs) must always respect hardware notches and home indicators:
  ```css
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  padding-top: max(0.5rem, env(safe-area-inset-top));
  ```
- Floating triggers (such as AI assistants or quick buttons) must never obscure table rows or status badges.

### 4. Persian Typography & Visual Hierarchy
- Use fluid typography with `clamp()` anchored to readable Persian fonts (`Vazirmatn`, `IRANSans`, `IRANYekan`).
- Maintain WCAG 2.2 AA contrast ratios (>4.5:1 for normal text, >3:1 for large text and clinical badges).
- Persian numerals (`toPersianDigits`) must be universally applied to counts, currencies, dates, and tooth notations.
