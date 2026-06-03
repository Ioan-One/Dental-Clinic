-- ═══════════════════════════════════════════════════════════════
-- Stored Procedures and Triggers for Dental Clinic
-- Applied via Prisma migration
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Stored Procedure: get_patient_statistics() ──────────
-- Returns patient count statistics (total, active, deleted)
CREATE OR REPLACE FUNCTION get_patient_statistics()
RETURNS TABLE (
  total_created BIGINT,
  active_patients BIGINT,
  deleted_patients BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_created,
    COUNT(*) FILTER (WHERE is_deleted = false)::BIGINT AS active_patients,
    COUNT(*) FILTER (WHERE is_deleted = true)::BIGINT AS deleted_patients
  FROM patients;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Stored Procedure: get_appointment_statistics() ──────
-- Returns appointment counts grouped by status
CREATE OR REPLACE FUNCTION get_appointment_statistics()
RETURNS TABLE (
  status appointment_status,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.status, COUNT(*)::BIGINT
  FROM appointments a
  WHERE a.is_deleted = false
  GROUP BY a.status;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. Trigger: auto-update updated_at on appointments ─────
-- Automatically sets updated_at when appointment row changes
CREATE OR REPLACE FUNCTION update_appointment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointment_updated_at ON appointments;
CREATE TRIGGER trg_appointment_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_timestamp();

-- ─── 4. Trigger: soft-delete cascade (patient → appointments)
-- When a patient is soft-deleted, also soft-delete their appointments
CREATE OR REPLACE FUNCTION cascade_patient_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    UPDATE appointments
    SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
    WHERE patient_id = NEW.id AND is_deleted = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_soft_delete_cascade ON patients;
CREATE TRIGGER trg_patient_soft_delete_cascade
  AFTER UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION cascade_patient_soft_delete();
