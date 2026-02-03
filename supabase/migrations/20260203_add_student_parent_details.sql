-- Run this in your Supabase SQL Editor

-- Add columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add columns to profiles table (for parents info)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
