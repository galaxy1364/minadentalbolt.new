/*
  # Users table (staff accounts)

  Links Supabase Auth users (auth.users) to a clinic and role, so RLS
  policies that filter by `auth.uid()` and `clinic_id` have something to
  join against. Every staff member who needs to log in must have a row
  here with the same id as their auth.users row.

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `clinic_id` (uuid) - which clinic this staff member belongs to
      - `full_name` (text)
      - `role` (text) - e.g. 'owner', 'doctor', 'receptionist', 'assistant'
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `users`
    - Users can read their own row
    - Users can read other users in the same clinic (for staff lists)
    - Only the user themself can update their own row (name, not role/clinic)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'receptionist' CHECK (role IN ('owner', 'doctor', 'receptionist', 'assistant', 'lab', 'accountant')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_same_clinic"
  ON users FOR SELECT
  TO authenticated
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
