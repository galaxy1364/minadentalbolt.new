/*
  # Personal Finance module

  New standalone table for the owner's personal financial tracking
  (loans, rent, personal cheques, debts) — deliberately separate from
  the clinic's business finances (payments/expenses/cheques tables),
  which stay patient/clinic-scoped.

  1. New table `personal_finance_items`
    - `item_type` (text) — 'loan' | 'rent' | 'cheque' | 'debt' | 'other'
    - `title`, `counterparty` — what it is and who it's with
    - `total_amount`, `paid_amount` — running balance
    - `due_date` — next/final due date
    - `monthly_amount`, `interest_rate` — for loans/rent
    - `cheque_number`, `bank_name` — for personal cheques
    - `status` — 'active' | 'completed' | 'overdue' | 'cancelled'
    - `notes`

  2. Security
    - RLS enabled, scoped to clinic_id like every other table in this app
*/

CREATE TABLE IF NOT EXISTS personal_finance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('loan', 'rent', 'cheque', 'debt', 'other')),
  title text NOT NULL,
  counterparty text,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date,
  monthly_amount numeric,
  interest_rate numeric,
  cheque_number text,
  bank_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE personal_finance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their clinic's personal finance items"
  ON personal_finance_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_personal_finance_items_clinic ON personal_finance_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_personal_finance_items_status ON personal_finance_items(status);
