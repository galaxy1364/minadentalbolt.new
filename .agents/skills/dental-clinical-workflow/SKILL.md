---
name: dental-clinical-workflow
description: >-
  World-class clinical dentistry standard covering FDI & Palmer dual notation,
  5-surface MODBL anatomical mapping, 6-point periodontal depth probing (PPD/BOP),
  ITI implant passports, orthodontic incisor bite analysis (Angle & IOTN),
  and clinical supply chain auto-deduction.
---

# World-Class Dental Clinical Workflow Standard

## Purpose
Guarantees clinical correctness, anatomical accuracy, and complete adherence to global dental documentation standards (ADA CDT, FDI World Dental Federation, ITI Dental Implantology).

## Core Rules

### 1. Dual FDI & Palmer Anatomical Charting
- Permanent Dentition: FDI 11–48 / Palmer 1–8 with quadrant bracket glyphs (`┘ | └`, `┐ | ┌`).
- Primary/Deciduous Dentition: FDI 51–85 / Palmer A–E.
- Universal Persian numeral formatting (`toPersianDigits()`) on clinical screens.
- Occlusal edge orientation: Palmer labels positioned at incisal/occlusal edge (below tooth in maxilla, above tooth in mandible).

### 2. Five Anatomical Surfaces (MODBL)
- Every operative restoration or decay record must map exact surfaces: Mesial (M), Occlusal (O), Distal (D), Buccal (B), Lingual/Palatal (L).
- Surfaces must visually highlight on anatomical tooth glyphs (`ToothGlyph.tsx`).

### 3. 6-Point Periodontal Probing (PPD & BOP)
- Record probing pocket depth (1–12mm) at Disto-Buccal, Mid-Buccal, Mesio-Buccal, Disto-Lingual, Mid-Lingual, Mesio-Lingual.
- Record Bleeding on Probing (BOP) flag per site.
- Compute global BOP% (healthy <10%, gingivitis 10–30%, generalized periodontitis >30%).
- Grade Furcation involvement (Class I–III) and Mobility (Grade 1–3).

### 4. ITI Dental Implant Protocol & Hardware Passport
- 4-Phase surgical lifecycle: Fixture Insertion -> Healing Abutment -> Impression/Prosthetic Abutment -> Crown Delivery.
- Capture insertion torque in N.cm, manufacturer, platform type, diameter, length, and lot/batch number.
- Barcode scanning support via camera/webcam.
- Bilingual (FA/EN) international implant passport generation for patient travel records.

### 5. Automated Supply Chain Deduction
- Every completed surgical or restorative treatment must automatically decrement associated consumable supplies (composite syringes, anesthetic carpules, suture threads, impression material) from local inventory.
