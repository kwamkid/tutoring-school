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

-- Credit balances table
CREATE TABLE credit_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  credits_remaining INTEGER DEFAULT 0 CHECK (credits_remaining >= 0),
  UNIQUE(student_id, subject_id)
);

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

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

-- Attendance table
CREATE TABLE attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users NOT NULL,
  credits_used INTEGER DEFAULT 1,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

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

-- ===============================================
-- FUNCTIONS & TRIGGERS
-- ===============================================



-- Function to add credits after payment
CREATE OR REPLACE FUNCTION add_credits_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  pkg_subject RECORD;
BEGIN
  -- Only process when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Update paid_at timestamp
    NEW.paid_at = NOW();
    
    -- Add credits for each subject in the package
    FOR pkg_subject IN
      SELECT ps.subject_id, p.credits
      FROM package_subjects ps
      JOIN packages p ON p.id = ps.package_id
      WHERE ps.package_id = NEW.package_id
    LOOP
      -- Insert or update credit balance
      INSERT INTO credit_balances (student_id, subject_id, credits_remaining)
      VALUES (NEW.student_id, pkg_subject.subject_id, pkg_subject.credits)
      ON CONFLICT (student_id, subject_id)
      DO UPDATE SET credits_remaining = credit_balances.credits_remaining + pkg_subject.credits;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add credits when purchase is marked as paid
CREATE TRIGGER on_purchase_paid
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_credits_after_payment();

-- Function to deduct credits on attendance
CREATE OR REPLACE FUNCTION deduct_credits_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to deduct credits when attendance is created
CREATE TRIGGER on_attendance_created
  BEFORE INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION deduct_credits_on_attendance();

-- Function to restore credits on attendance deletion
CREATE OR REPLACE FUNCTION restore_credits_on_attendance_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Restore credits
  UPDATE credit_balances
  SET credits_remaining = credits_remaining + OLD.credits_used
  WHERE student_id = OLD.student_id AND subject_id = OLD.subject_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to restore credits when attendance is deleted
CREATE TRIGGER on_attendance_deleted
  AFTER DELETE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION restore_credits_on_attendance_delete();
