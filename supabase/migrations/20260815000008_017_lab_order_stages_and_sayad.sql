/*
  # Lab order stages + cheque Sayad ID (basic foundations)

  Two foundational fields the user asked to have added now, to be
  upgraded to fuller features later:

  1. lab_orders.stage — a defined 6-stage pipeline (scan/impression ->
     courier -> CAD/CAM design -> firing/layering -> quality control ->
     ready for delivery), independent of the existing coarse `status`
     field. Foundation for a visual step-by-step progress tracker.

  2. cheques.sayad_id — manual entry of the Sayad (صیاد) tracking ID
     printed on Iranian bank cheques. Foundation for real-time bank
     verification later, which needs external Central Bank API access
     not available in this environment; for now this just lets the ID
     be recorded and displayed.
*/

ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS stage text DEFAULT 'scan_impression'
  CHECK (stage IN ('scan_impression', 'sent_to_courier', 'cad_cam_design', 'firing_layering', 'quality_control', 'ready_delivery'));

ALTER TABLE cheques ADD COLUMN IF NOT EXISTS sayad_id text;
