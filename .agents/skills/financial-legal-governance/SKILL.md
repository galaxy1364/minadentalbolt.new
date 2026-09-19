---
name: financial-legal-governance
description: >-
  Strict Iranian Sayad banking and dental clinic financial governance.
  Enforces Sayad 16-digit cheque checksum verification, mandatory doctor commission
  pre-deductions (lab fees and implant hardware costs deducted prior to revenue split),
  thermal 80mm POS slip generation with RRN, and digital informed consent.
---

# Financial & Legal Governance Standard for Dental Clinics

## Purpose
Prevents financial disputes between clinic owners and associate doctors, guarantees 100% compliance with Iranian banking laws (Sayad cheque validation), and enforces legal clinical consent documentation.

## Core Rules

### 1. Doctor Ledger & Commission Calculation Formula
- Strict mathematical invariant:
  $$\text{Doctor Net Share} = (\text{Treatment Gross Amount} - \text{Dental Lab Cost} - \text{Implant Hardware Cost}) \times \text{Doctor Share \%}$$
- Lab costs and hardware exclusions must NEVER be deducted after the percentage split. They are pre-deductions.
- Financial numbers must be rounded to exact Tomans and formatted with Persian digits and standard currency separators.

### 2. Sayad 16-Digit Cheque Validation
- Every cheque entry must strictly validate the 16-digit Sayad tracking identifier.
- Track drawer national ID, issuing bank, due date (Jalali), amount, and status (`registered`, `cleared`, `bounced`, `cancelled`).
- Provide due-date reminder alerts 48 hours prior to maturity.

### 3. Thermal 80mm POS Slip Standard
- Provide instant receipt printing formatted for standard 80mm continuous thermal receipt rolls.
- Receipts must include: Clinic Name, Terminal ID, Reference Retrieval Number (RRN), Treatment Summary, Paid Amount in Tomans, and Jalali Timestamp.

### 4. Digital Informed Consent Canvas
- High-risk surgical procedures (impacted third molar extraction, sinus lift, bone graft, implant placement) require digital signature capture on a smooth HTML5 canvas before surgical admission.
- Signatures are stored with immutable timestamp and user metadata.
