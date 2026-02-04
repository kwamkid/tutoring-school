-- =====================================================
-- Migration: Attendance Cancel + Logs
-- - Add 'status' column to attendance (active/cancelled)
-- - Create attendance_logs table for audit trail
-- - Update triggers to only work on active attendance
-- =====================================================

-- 1. Add status column to attendance
ALTER TABLE attendance
ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled'));

-- 2. Create attendance_logs table
CREATE TABLE attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('check_in', 'cancel')),
  performed_by UUID REFERENCES auth.users NOT NULL,
  reason TEXT, -- reason for cancellation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and Teachers can view logs
CREATE POLICY "Staff can view attendance logs"
  ON attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can manage attendance logs"
  ON attendance_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. Create function to cancel attendance and restore credits
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

  -- Restore credits
  UPDATE credit_balances
  SET credits_remaining = credits_remaining + v_attendance.credits_used
  WHERE student_id = v_attendance.student_id AND subject_id = v_attendance.subject_id;

  -- Log the cancellation
  INSERT INTO attendance_logs (attendance_id, action, performed_by, reason)
  VALUES (p_attendance_id, 'cancel', p_cancelled_by, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the deduct trigger to also log the check-in
CREATE OR REPLACE FUNCTION deduct_credits_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only deduct for active attendance
  IF NEW.status = 'active' THEN
    -- Deduct credits
    UPDATE credit_balances
    SET credits_remaining = credits_remaining - NEW.credits_used
    WHERE student_id = NEW.student_id AND subject_id = NEW.subject_id;

    -- Check if student has enough credits
    IF NOT FOUND OR (
      SELECT credits_remaining FROM credit_balances
      WHERE student_id = NEW.student_id AND subject_id = NEW.subject_id
    ) < 0 THEN
      RAISE EXCEPTION 'นักเรียนมีเครดิตไม่เพียงพอ';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to auto-log check-ins
CREATE OR REPLACE FUNCTION log_attendance_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO attendance_logs (attendance_id, action, performed_by)
    VALUES (NEW.id, 'check_in', NEW.teacher_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_attendance_log_checkin
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_checkin();
