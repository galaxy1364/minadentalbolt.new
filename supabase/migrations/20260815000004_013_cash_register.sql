/*
  # Smart cash register (صندوق‌داری هوشمند)

  Real feature from the commercial product this app is modeled after:
  a daily cash-drawer open/close workflow with reconciliation, tracking
  expected cash (opening balance + cash payments during the session)
  against what's physically counted at close, surfacing any
  discrepancy instead of just trusting the total.

  1. New table `cash_register_sessions`
*/

CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric NOT NULL DEFAULT 0,
  expected_closing_balance numeric,
  counted_closing_balance numeric,
  discrepancy numeric,
  opened_by uuid,
  closed_by uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cash_register" ON cash_register_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_cash_register_status ON cash_register_sessions(status);
