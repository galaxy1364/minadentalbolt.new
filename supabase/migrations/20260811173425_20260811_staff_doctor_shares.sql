/*
# Add doctor revenue sharing columns to staff table

1. Modified Tables
- `staff` — added 6 new columns for doctor revenue sharing:
  - `is_doctor` (boolean, default false): marks staff member as a doctor
  - `share_percentage` (numeric, default 50): doctor's share percentage of net production
  - `share_type` (text, default 'net_split'): formula type — 'net_split' = (revenue - lab_cost) × %, 'percentage' = revenue × %, 'fixed' = fixed amount
  - `fixed_share_amount` (numeric, default 0): used when share_type = 'fixed'
  - `specialty` (text, nullable): doctor's dental specialty
  - `license_number` (text, nullable): doctor's medical license number
  - `is_clinic_owner` (boolean, default false): marks if this person owns the clinic (gets manager share)

2. Security
- No changes to RLS policies (staff table already has existing policies).
- All new columns are nullable or have safe defaults.

3. Important Notes
- The default share_percentage is 50, matching the "total revenue minus lab costs divided by 2" formula.
- share_type 'net_split' implements: (Total Production - Total Lab Cost) × (share_percentage / 100)
- is_clinic_owner flags the manager/owner who receives the clinic's portion of net profit.
- These columns are additive — existing staff rows get defaults automatically.
*/

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS is_doctor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_percentage numeric DEFAULT 50,
  ADD COLUMN IF NOT EXISTS share_type text DEFAULT 'net_split',
  ADD COLUMN IF NOT EXISTS fixed_share_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS is_clinic_owner boolean DEFAULT false;
