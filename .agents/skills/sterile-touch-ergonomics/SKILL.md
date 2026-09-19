---
name: sterile-touch-ergonomics
description: >-
  Tactile ergonomics for sterile dental environments and touchscreen operatory units.
  Enforces minimum 48px hit targets for gloved fingers, single-scroll layout architecture
  (overflow-x: clip), zero unintentional horizontal jitter, dock-scroll dental charts,
  and instant haptic and acoustic feedback.
---

# Sterile-Glove Touch & Operatory Ergonomics Standard

## Purpose
Ensures that dentists and assistants wearing latex or nitrile gloves can operate the software effortlessly from touchscreens mounted on dental delivery units or mobile tablets, without mis-taps, lag, or screen stutter.

## Core Rules

### 1. Minimum 48px Sterile-Glove Target
- Every button, tab, quick chip, checkbox, and dropdown trigger must have a minimum bounding box of 48×48 CSS pixels.
- Visual button padding must use `min-h-[48px]` or `p-3` with `touch-action: manipulation`.
- Active states must provide immediate visual compression (`active:scale-95`) with zero tap delay (`-webkit-tap-highlight-color: transparent`).

### 2. Single-Scroll Architecture (Zero Screen Shaking)
- Page body uses `overflow-x: clip; width: 100%; max-width: 100%;`.
- Competitive scroll containers (e.g. `overflow-y: auto` inside an auto-scrolling body) are prohibited.
- Horizontal scrolling is strictly restricted to isolated self-contained docks (`dock-scroll`) such as tooth arches or image carousels.

### 3. Dock-Scroll Dental Arch
- Full 16-tooth upper and lower arches must remain horizontally accessible via a fluid dock container without wrapping awkwardly into multiple jagged rows on mobile/tablet viewports.
- Occlusal edge markers and Palmer quadrants must remain anchored during dock scroll.

### 4. Acoustic & Haptic Verification
- Every irreversible clinical or financial action must emit a distinctive acoustic chime (`chimes.playSuccess()`, `chimes.playWarning()`, `chimes.playPop()`) and haptic vibration pattern (`navigator.vibrate([15, 30, 15])`).
