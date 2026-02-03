-- 1. Update Profiles table to support 'parent' role
ALTER TABLE profiles 
DROP CONSTRAINT profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'teacher', 'student', 'parent'));

-- 2. Drop existing dependent tables (Clean start for Students table)
-- CAUTION: This deletes existing student data as discussed
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- 3. Re-create Students table with new structure
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES auth.users NOT NULL, -- Link to Parent User
  user_id UUID REFERENCES auth.users, -- Optional: If student wants to login later
  full_name TEXT NOT NULL,
  nickname TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Re-create dependent tables (unchanged structure, just re-linking)
CREATE TABLE credit_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  credits_remaining INTEGER DEFAULT 0 CHECK (credits_remaining >= 0),
  UNIQUE(student_id, subject_id)
);

CREATE TABLE purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES packages(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users NOT NULL,
  credits_used INTEGER DEFAULT 1,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 5. Enable RLS on new tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 6. Update RLS Policies

-- Students Policies
CREATE POLICY "Admins and Teachers can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Parents can view their own children"
  ON students FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Credit Balances Policies
CREATE POLICY "Parents can view own children credits, staff view all"
  ON credit_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = credit_balances.student_id AND students.parent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );
  
CREATE POLICY "Only admins can manage credits"
  ON credit_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Purchases Policies
CREATE POLICY "Parents can view own children purchases, admins view all"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = purchases.student_id AND students.parent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Parents can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = purchases.student_id AND students.parent_id = auth.uid()
    )
  );
  
CREATE POLICY "Admins can update purchases"
  ON purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Attendance Policies
CREATE POLICY "Parents can view own children attendance, staff view all"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = attendance.student_id AND students.parent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers can manage attendance"
  ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

-- 7. Re-create Triggers (Dependencies were dropped)

-- Trigger: Add limits after payment
CREATE TRIGGER on_purchase_paid
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_credits_after_payment();

-- Trigger: Deduct credits on attendance
CREATE TRIGGER on_attendance_created
  BEFORE INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION deduct_credits_on_attendance();

-- Trigger: Restore credits on attendance delete
CREATE TRIGGER on_attendance_deleted
  AFTER DELETE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION restore_credits_on_attendance_delete();
