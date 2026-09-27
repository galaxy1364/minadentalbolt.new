/*
  # Inventory barcode field

  Adds barcode to inventory_items — powers the camera-based barcode
  scan-to-find/scan-to-create workflow in Inventory.tsx.
*/

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode text;
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
