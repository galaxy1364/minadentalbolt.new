---
name: iso-27001-compliance
description: >-
  Enforces ISO/IEC 27001 & healthcare data security standards (HIPAA/GDPR equivalent for dental EHR).
  Guarantees immutable audit logging, role-based access control (RBAC), zero plaintext storage of credentials,
  data integrity checks, soft-delete immutability, and zero data leakage.
---

# ISO/IEC 27001 Clinical Information Security Standard

## 1. Access Control & Identity Management (A.9)
- Multi-tier Role-Based Access Control (RBAC): Owner, Doctor, Receptionist, Assistant, Accountant.
- Strict session timeout and automatic application lock screen (`AppLockScreen`).
- No mutation without active clinic tenant identification (`clinic_id`).

## 2. Cryptography & Data Protection (A.10)
- End-to-end data encryption for patient health records and backups (AES-256-GCM).
- Zero plaintext storage of passwords, API keys, or financial credentials in browser storage.
- Masking of sensitive patient identifiers (National ID, Sayad Cheque IDs, cardholder data).

## 3. Operations Security & Audit Logging (A.12)
- Tamper-evident Audit Trail (`auditLogger.ts`): Every read, modification, financial transaction, and prescription issue is logged with timestamp, user ID, client IP/agent, and before/after checksums.
- Immutable historical data: Absolute prohibition of physical deletion (`DELETE FROM`). Only soft-deletion (`deleted_at IS NOT NULL`) is allowed.
- Periodic integrity verification: Automated background snapshot and integrity hashing.

## 4. Business Continuity & Disaster Recovery (A.17)
- Offline-First resilience: Full local operations with Dexie IndexedDB during internet cutoffs.
- Bidirectional conflict-free synchronization queue with Supabase cloud.
- Automatic daily local snapshot backup (`autoBackup.ts`) and offsite encrypted backup exports.
