---
name: pwa-auto-updater
description: >-
  Progressive Web App (PWA) cache lifecycle, zero-downtime auto-update distribution,
  Dexie IndexedDB offline resilience, and mobile background sleep/wake reconnection protocols.
---

# PWA Auto-Updater & Cache Lifecycle Standard

## Purpose
Guarantees that updates deployed to Vercel/Supabase are seamlessly, reliably, and instantly distributed to all connected devices (laptops, clinical tablets, mobile phones) without breaking active operations or losing offline clinical data.

## Core Rules

### 1. Synchronized Version Manifest
- The canonical version string in `package.json` must be strictly mirrored in:
  - `public/version.json` (polled by clients)
  - `src/lib/appVersion.ts` (consumed by UI components and headers)
  - `public/sw.js` (defines `CACHE_NAME = 'minadent-vX.Y.Z'`)
- Every code update must bump the version using `npm run bump`.

### 2. Autonomous Background Update Check
- The client polls `/version.json?t=<timestamp>` periodically and on `visibilitychange` (when returning from lock/background).
- If the server version is newer than the client's `APP_VERSION`, trigger a gentle non-blocking update notification badge or auto-activate the new service worker on idle.

### 3. Service Worker Clean Activation
- New service workers must immediately call `self.skipWaiting()` and `clients.claim()` upon user confirmation.
- Obsolete cache buckets from previous versions must be deleted during the `activate` event to prevent stale asset leaks.

### 4. Zero Data Loss During Updates
- User data resides in Dexie IndexedDB, which is independent of HTTP/Service Worker caches.
- Clearing caches or updating app code must never touch or purge the IndexedDB database.
