/*
# Add name column to doctors table

1. Changes
- Add `name` column (text, nullable) to the `doctors` table.
- This allows storing the doctor's full name separately from their specialty.
- Existing rows will have NULL for name, which is fine — the app falls back to specialty for display.
2. Security
- No RLS policy changes — existing policies on doctors remain unchanged.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'name'
  ) THEN
    ALTER TABLE doctors ADD COLUMN name text;
  END IF;
END $$;
