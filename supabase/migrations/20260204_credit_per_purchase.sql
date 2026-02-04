-- =====================================================
-- Migration: Credit Per-Purchase (Shared Credits)
--
-- Changes credit_balances from per-subject to per-purchase.
-- Each purchase creates ONE credit pool shared across
-- the package's allowed subjects.
-- =====================================================

-- 1. Drop existing triggers that reference old schema
DROP TRIGGER IF EXISTS on_purchase_paid ON purchases;
DROP TRIGGER IF EXISTS on_attendance_created ON attendance;
DROP TRIGGER IF EXISTS on_attendance_deleted ON attendance;
DROP TRIGGER IF EXISTS on_attendance_log_checkin ON attendance;

-- 2. Alter credit_balances: remove subject_id, add purchase_id
ALTER TABLE credit_balances
ADD COLUMN purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE;

-- Migrate existing data: try to link credit_balances to purchases where possible
-- (Best effort - old rows without matching purchase will be cleaned up)
UPDATE credit_balances cb
SET purchase_id = (
  SELECT p.id FROM purchases p
  WHERE p.student_id = cb.student_id
    AND p.status = 'paid'
  ORDER BY p.paid_at DESC NULLS LAST
  LIMIT 1
);

-- Remove rows that couldn't be linked (orphaned credits)
DELETE FROM credit_balances WHERE purchase_id IS NULL;

-- Now make purchase_id NOT NULL
ALTER TABLE credit_balances
ALTER COLUMN purchase_id SET NOT NULL;

-- Drop old unique constraint and subject_id
ALTER TABLE credit_balances
DROP CONSTRAINT IF EXISTS credit_balances_student_id_subject_id_key;

ALTER TABLE credit_balances
DROP COLUMN subject_id;

-- Merge duplicate (student_id, purchase_id) rows before adding unique constraint
-- Keep the row with the smallest id, sum up all credits_remaining into it
WITH duplicates AS (
  SELECT student_id, purchase_id, MIN(id::text)::uuid AS keep_id, SUM(credits_remaining) AS total_credits
  FROM credit_balances
  GROUP BY student_id, purchase_id
  HAVING COUNT(*) > 1
)
UPDATE credit_balances cb
SET credits_remaining = d.total_credits
FROM duplicates d
WHERE cb.id = d.keep_id;

-- Delete the extra rows (not the one we kept)
WITH duplicates AS (
  SELECT student_id, purchase_id, MIN(id::text)::uuid AS keep_id
  FROM credit_balances
  GROUP BY student_id, purchase_id
  HAVING COUNT(*) > 1
)
DELETE FROM credit_balances cb
USING duplicates d
WHERE cb.student_id = d.student_id
  AND cb.purchase_id = d.purchase_id
  AND cb.id != d.keep_id;

-- Add new unique constraint
ALTER TABLE credit_balances
ADD CONSTRAINT credit_balances_student_id_purchase_id_key UNIQUE (student_id, purchase_id);

-- 3. Alter attendance: add purchase_id
ALTER TABLE attendance
ADD COLUMN purchase_id UUID REFERENCES purchases(id);

-- 4. Rewrite add_credits_after_payment()
-- Now creates a SINGLE credit_balances row per purchase
CREATE OR REPLACE FUNCTION add_credits_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Only process when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Update paid_at timestamp
    NEW.paid_at = NOW();

    -- Get credit amount from the package
    SELECT credits INTO v_credits
    FROM packages
    WHERE id = NEW.package_id;

    -- Create a single credit balance row for this purchase
    INSERT INTO credit_balances (student_id, purchase_id, credits_remaining)
    VALUES (NEW.student_id, NEW.id, v_credits)
    ON CONFLICT (student_id, purchase_id)
    DO UPDATE SET credits_remaining = credit_balances.credits_remaining + v_credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Rewrite deduct_credits_on_attendance()
-- Uses FIFO: finds oldest purchase with remaining credits that covers the subject
CREATE OR REPLACE FUNCTION deduct_credits_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_credit_row RECORD;
BEGIN
  -- Only deduct for active attendance
  IF NEW.status = 'active' THEN
    -- Find the oldest purchase with available credits that covers this subject (FIFO)
    SELECT cb.id AS cb_id, cb.purchase_id, cb.credits_remaining
    INTO v_credit_row
    FROM credit_balances cb
    JOIN purchases pu ON pu.id = cb.purchase_id
    JOIN package_subjects ps ON ps.package_id = pu.package_id
    WHERE cb.student_id = NEW.student_id
      AND ps.subject_id = NEW.subject_id
      AND cb.credits_remaining > 0
    ORDER BY pu.paid_at ASC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'นักเรียนไม่มีเครดิตสำหรับวิชานี้';
    END IF;

    -- Deduct 1 credit
    UPDATE credit_balances
    SET credits_remaining = credits_remaining - NEW.credits_used
    WHERE id = v_credit_row.cb_id;

    -- Verify not negative
    IF (v_credit_row.credits_remaining - NEW.credits_used) < 0 THEN
      RAISE EXCEPTION 'นักเรียนมีเครดิตไม่เพียงพอ';
    END IF;

    -- Track which purchase was debited
    NEW.purchase_id = v_credit_row.purchase_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Rewrite cancel_attendance()
-- Restores credits to the specific purchase_id
CREATE OR REPLACE FUNCTION cancel_attendance(
  p_attendance_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_attendance RECORD;
BEGIN
  -- Get attendance record
  SELECT * INTO v_attendance FROM attendance WHERE id = p_attendance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรายการเช็คชื่อ';
  END IF;

  IF v_attendance.status = 'cancelled' THEN
    RAISE EXCEPTION 'รายการนี้ถูกยกเลิกไปแล้ว';
  END IF;

  -- Update attendance status to cancelled
  UPDATE attendance SET status = 'cancelled' WHERE id = p_attendance_id;

  -- Restore credits to the specific purchase pool
  IF v_attendance.purchase_id IS NOT NULL THEN
    UPDATE credit_balances
    SET credits_remaining = credits_remaining + v_attendance.credits_used
    WHERE student_id = v_attendance.student_id
      AND purchase_id = v_attendance.purchase_id;
  END IF;

  -- Log the cancellation
  INSERT INTO attendance_logs (attendance_id, action, performed_by, reason)
  VALUES (p_attendance_id, 'cancel', p_cancelled_by, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update restore_credits_on_attendance_delete()
CREATE OR REPLACE FUNCTION restore_credits_on_attendance_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.purchase_id IS NOT NULL THEN
    UPDATE credit_balances
    SET credits_remaining = credits_remaining + OLD.credits_used
    WHERE student_id = OLD.student_id
      AND purchase_id = OLD.purchase_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create RPC: get_students_with_credits_for_subject
-- Returns students who have credits in any purchase whose package covers the given subject
CREATE OR REPLACE FUNCTION get_students_with_credits_for_subject(p_subject_id UUID)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  nickname TEXT,
  total_credits BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.full_name,
    s.nickname,
    SUM(cb.credits_remaining)::BIGINT AS total_credits
  FROM credit_balances cb
  JOIN purchases pu ON pu.id = cb.purchase_id
  JOIN package_subjects ps ON ps.package_id = pu.package_id AND ps.subject_id = p_subject_id
  JOIN students s ON s.id = cb.student_id
  WHERE cb.credits_remaining > 0
  GROUP BY s.id, s.full_name, s.nickname
  HAVING SUM(cb.credits_remaining) > 0
  ORDER BY s.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Re-create all triggers
CREATE TRIGGER on_purchase_paid
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_credits_after_payment();

CREATE TRIGGER on_attendance_created
  BEFORE INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION deduct_credits_on_attendance();

CREATE TRIGGER on_attendance_deleted
  AFTER DELETE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION restore_credits_on_attendance_delete();

CREATE TRIGGER on_attendance_log_checkin
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_checkin();
