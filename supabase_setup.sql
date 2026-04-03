-- ============================================
-- PressureGuard AI — Supabase SQL Setup
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'caregiver')),
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ward TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  diagnosis TEXT,
  medical_history TEXT,
  
  -- Braden Scale Subscores (each 1-4, lower = higher risk)
  sensory_score INTEGER NOT NULL DEFAULT 3 CHECK (sensory_score BETWEEN 1 AND 4),
  moisture_score INTEGER NOT NULL DEFAULT 3 CHECK (moisture_score BETWEEN 1 AND 4),
  activity_score INTEGER NOT NULL DEFAULT 3 CHECK (activity_score BETWEEN 1 AND 4),
  mobility_score INTEGER NOT NULL DEFAULT 3 CHECK (mobility_score BETWEEN 1 AND 4),
  nutrition_score INTEGER NOT NULL DEFAULT 3 CHECK (nutrition_score BETWEEN 1 AND 4),
  friction_score INTEGER NOT NULL DEFAULT 3 CHECK (friction_score BETWEEN 1 AND 3),
  
  -- Computed risk fields
  overall_risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('critical', 'high', 'moderate', 'low')),
  
  -- Metadata
  added_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'transferred')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RISK HISTORY TABLE (tracks risk over time)
-- ============================================
CREATE TABLE IF NOT EXISTS public.risk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('critical', 'high', 'moderate', 'low')),
  sensory_score INTEGER,
  moisture_score INTEGER,
  activity_score INTEGER,
  mobility_score INTEGER,
  nutrition_score INTEGER,
  friction_score INTEGER,
  contributing_factors JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  assessed_by UUID REFERENCES public.profiles(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('risk_increase', 'critical_risk', 'reassessment_due', 'position_change', 'new_patient')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- -- PROFILES POLICIES --
-- Everyone can read all profiles
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- -- PATIENTS POLICIES --
-- All authenticated users can view patients
CREATE POLICY "Patients are viewable by all authenticated users"
  ON public.patients FOR SELECT
  TO authenticated
  USING (true);

-- Only doctors and nurses can add patients
CREATE POLICY "Doctors and nurses can add patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
    )
  );

-- Only doctors and nurses can update patients
CREATE POLICY "Doctors and nurses can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
    )
  );

-- Only doctors and nurses can delete patients
CREATE POLICY "Doctors and nurses can delete patients"
  ON public.patients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
    )
  );

-- -- RISK HISTORY POLICIES --
-- All authenticated users can view risk history
CREATE POLICY "Risk history viewable by all authenticated users"
  ON public.risk_history FOR SELECT
  TO authenticated
  USING (true);

-- Doctors and nurses can insert risk history
CREATE POLICY "Doctors and nurses can add risk history"
  ON public.risk_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
    )
  );

-- -- ALERTS POLICIES --
-- All authenticated users can view alerts
CREATE POLICY "Alerts viewable by all authenticated users"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

-- Doctors and nurses can create alerts
CREATE POLICY "Doctors and nurses can create alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
    )
  );

-- Doctors and nurses can update alerts (acknowledge)
CREATE POLICY "Doctors and nurses can update alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse')
    )
  );

-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'caregiver')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to patients
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Apply updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 7. INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_patients_risk_level ON public.patients(risk_level);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_ward ON public.patients(ward);
CREATE INDEX IF NOT EXISTS idx_risk_history_patient ON public.risk_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_risk_history_assessed_at ON public.risk_history(assessed_at);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON public.alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);

-- ============================================
-- DONE! Your database is ready.
-- ============================================
-- Next steps:
-- 1. Copy your Project URL and Anon Key from Settings → API
-- 2. Paste them into the .env files in the frontend and backend
-- ============================================
