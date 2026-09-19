---
name: offline-first-mesh-sync
description: Peer-to-peer / local network and cloud dual-channel sync engine. Handles instant WebSocket broadcast (<50ms), mesh catchup handshake (sync_request / sync_response), auto-reconnect on sleep/wake/visibilitychange, outgoing broadcast buffer, Dexie IndexedDB persistence, conflict resolution, and offline resilience.
---

# Offline-First Mesh & Cloud Dual Sync Standard

## Purpose
Ensures 100% reliable clinical operation under any network conditions: offline in local clinic without internet, on local clinic Wi-Fi, or across cloud platforms. Guarantees immediate (<50ms) cross-device synchronization between laptop, iPhone, and Android devices for all staff (manager, doctors, receptionists).

## Core Principles

### 1. Dual-Channel Architecture
1. **Local Channel (BroadcastChannel + WebSocket Peer Broadcast):**
   - Immediate broadcast of any write action (`patients`, `appointments`, `treatments`, `payments`, etc.) to all devices on the same clinic channel.
   - Zero dependency on external database write success for immediate peer-to-peer screen updates.
2. **Cloud Channel (Supabase DB Replication & Backup):**
   - Asynchronous push of sync queue entries to the cloud backend.
   - Polling and catchup retrieval for offline or reconnecting nodes.

### 2. Auto-Recovery from Sleep, Lock, and Mobile Backgrounding
Mobile operating systems suspend WebSocket connections within seconds of screen lock.
- The sync engine MUST listen to:
  - `document.addEventListener('visibilitychange')`
  - `window.addEventListener('focus')`
  - `window.addEventListener('online')`
- When the device becomes visible, the engine immediately checks channel state, reconnects if closed or errored, and initiates a **Catch-up Handshake**.

### 3. Mesh Catch-Up Handshake Protocol
To eliminate data divergence when a device was asleep or offline:
1. **Request:** The newly active device emits `{ type: 'sync_request', senderId, lastSyncTimestamp }`.
2. **Response:** Any active online peer holding newer records replies with `{ type: 'sync_response', targetId, payload: { tableName: rows[] } }`.
3. **Merge:** The requesting device upserts incoming rows into its local Dexie database and dispatches `minadent:data_changed`.
4. **Idempotency:** All updates use `bulkPut` with unique UUIDs and `updated_at` timestamps to ensure idempotency.

### 4. Zero Data Loss Guarantee
- Writes are ALWAYS committed to local Dexie IndexedDB first before network transmission.
- Failed sync queue entries are never silently dropped; they are retained and retried with exponential backoff.
