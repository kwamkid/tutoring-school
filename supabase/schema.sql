-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Subjects table
CREATE TABLE subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Packages table
CREATE TABLE packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Package-Subjects junction table
CREATE TABLE package_subjects (
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, subject_id)
);

ALTER TABLE package_subjects ENABLE ROW LEVEL SECURITY;

-- Students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Purchases table
CREATE TABLE purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES packages(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Credit balances table (per-purchase: one credit pool per purchase)
CREATE TABLE credit_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  credits_remaining INTEGER DEFAULT 0 CHECK (credits_remaining >= 0),
  UNIQUE(student_id, purchase_id)
);

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

-- Attendance table
CREATE TABLE attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users NOT NULL,
  purchase_id UUID REFERENCES purchases(id),
  credits_used INTEGER DEFAULT 1,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled'))
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Attendance logs table
CREATE TABLE attendance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('check_in', 'cancel')),
  performed_by UUID REFERENCES auth.users NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- ROW LEVEL SECURITY POLICIES
-- ===============================================

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Subjects policies (everyone can read)
CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage subjects"
  ON subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Packages policies
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
  ));

CREATE POLICY "Only admins can manage packages"
  ON packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Package-Subjects policies
CREATE POLICY "Anyone can view package subjects"
  ON package_subjects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage package subjects"
  ON package_subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Students policies
CREATE POLICY "Users can view students"
  ON students FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Only admins can manage students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own student record"
  ON students FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Credit balances policies
CREATE POLICY "Students can view own credits, teachers/admins can view all"
  ON credit_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = credit_balances.student_id AND students.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Only admins can manage credits"
  ON credit_balances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update credits"
  ON credit_balances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Purchases policies
CREATE POLICY "Students can view own purchases, admins can view all"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = purchases.student_id AND students.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Students can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = purchases.student_id AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update purchases"
  ON purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Attendance policies
CREATE POLICY "Students can view own attendance, teachers/admins can view all"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = attendance.student_id AND students.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers can create attendance"
  ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers can manage own attendance records"
  ON attendance FOR UPDATE
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can delete own attendance records"
  ON attendance FOR DELETE
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Attendance logs policies
CREATE POLICY "Teachers and admins can view attendance logs"
  ON attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers and admins can insert attendance logs"
  ON attendance_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

-- ===============================================
-- FUNCTIONS & TRIGGERS
-- ===============================================



-- Function to add credits after payment
-- Creates a SINGLE credit_balances row per purchase
CREATE OR REPLACE FUNCTION add_credits_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    NEW.paid_at = NOW();

    SELECT credits INTO v_credits
    FROM packages
    WHERE id = NEW.package_id;

    INSERT INTO credit_balances (student_id, purchase_id, credits_remaining)
    VALUES (NEW.student_id, NEW.id, v_credits)
    ON CONFLICT (student_id, purchase_id)
    DO UPDATE SET credits_remaining = credit_balances.credits_remaining + v_credits;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_purchase_paid
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_credits_after_payment();

-- Function to deduct credits on attendance (FIFO by purchase date)
CREATE OR REPLACE FUNCTION deduct_credits_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_credit_row RECORD;
BEGIN
  IF NEW.status = 'active' THEN
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

    UPDATE credit_balances
    SET credits_remaining = credits_remaining - NEW.credits_used
    WHERE id = v_credit_row.cb_id;

    IF (v_credit_row.credits_remaining - NEW.credits_used) < 0 THEN
      RAISE EXCEPTION 'นักเรียนมีเครดิตไม่เพียงพอ';
    END IF;

    NEW.purchase_id = v_credit_row.purchase_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_attendance_created
  BEFORE INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION deduct_credits_on_attendance();

-- Function to restore credits on attendance deletion
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

CREATE TRIGGER on_attendance_deleted
  AFTER DELETE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION restore_credits_on_attendance_delete();

-- Function to cancel attendance and restore credits
CREATE OR REPLACE FUNCTION cancel_attendance(
  p_attendance_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_attendance RECORD;
BEGIN
  SELECT * INTO v_attendance FROM attendance WHERE id = p_attendance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรายการเช็คชื่อ';
  END IF;

  IF v_attendance.status = 'cancelled' THEN
    RAISE EXCEPTION 'รายการนี้ถูกยกเลิกไปแล้ว';
  END IF;

  UPDATE attendance SET status = 'cancelled' WHERE id = p_attendance_id;

  IF v_attendance.purchase_id IS NOT NULL THEN
    UPDATE credit_balances
    SET credits_remaining = credits_remaining + v_attendance.credits_used
    WHERE student_id = v_attendance.student_id
      AND purchase_id = v_attendance.purchase_id;
  END IF;

  INSERT INTO attendance_logs (attendance_id, action, performed_by, reason)
  VALUES (p_attendance_id, 'cancel', p_cancelled_by, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log attendance check-in
CREATE OR REPLACE FUNCTION log_attendance_checkin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO attendance_logs (attendance_id, action, performed_by)
  VALUES (NEW.id, 'check_in', NEW.teacher_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_attendance_log_checkin
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_checkin();

-- RPC: get students with credits for a specific subject
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
