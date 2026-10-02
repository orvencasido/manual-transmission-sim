-- Schema migration for Manual Driving Trainer
-- Profiles, Driving Sessions, and Lesson Progress

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  username text,
  preferences jsonb DEFAULT '{}'::jsonb
);

-- 2. Driving Sessions Table
CREATE TABLE IF NOT EXISTS public.driving_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  duration_seconds double precision DEFAULT 0 NOT NULL,
  stall_count integer DEFAULT 0 NOT NULL,
  smooth_starts integer DEFAULT 0 NOT NULL,
  max_speed_kmh double precision DEFAULT 0 NOT NULL,
  distance_meters double precision DEFAULT 0 NOT NULL
);

-- 3. Lesson Progress Table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lesson_id integer NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  stars integer DEFAULT 0 NOT NULL,
  smoothness_score double precision DEFAULT 0 NOT NULL,
  stalls integer DEFAULT 0 NOT NULL,
  best_time_seconds double precision DEFAULT 0 NOT NULL,
  max_rollback_meters double precision DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT lesson_progress_user_lesson_unique UNIQUE NULLS NOT DISTINCT (user_id, lesson_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS driving_sessions_user_id_idx ON public.driving_sessions(user_id);
CREATE INDEX IF NOT EXISTS driving_sessions_created_at_idx ON public.driving_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS lesson_progress_user_id_idx ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_id_idx ON public.lesson_progress(lesson_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon and authenticated users
-- Profiles Policies
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and auth insert on profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon and auth update on profiles"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Driving Sessions Policies
CREATE POLICY "Allow public read on driving_sessions"
  ON public.driving_sessions FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and auth insert on driving_sessions"
  ON public.driving_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon and auth update on driving_sessions"
  ON public.driving_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Lesson Progress Policies
CREATE POLICY "Allow public read on lesson_progress"
  ON public.lesson_progress FOR SELECT
  USING (true);

CREATE POLICY "Allow anon and auth insert on lesson_progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon and auth update on lesson_progress"
  ON public.lesson_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);
