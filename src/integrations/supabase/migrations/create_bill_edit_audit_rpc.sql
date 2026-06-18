
-- Create a stored procedure to save bill edit audit records
CREATE OR REPLACE FUNCTION save_bill_edit_audit(
  p_bill_id UUID,
  p_editor_name TEXT,
  p_changes TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO bill_edit_audit (bill_id, editor_name, changes)
  VALUES (p_bill_id, p_editor_name, p_changes);
END;
$$ LANGUAGE plpgsql;
