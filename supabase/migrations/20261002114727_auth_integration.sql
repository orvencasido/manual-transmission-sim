-- Migration: Auth Integration & Account Persistence
-- 1. Clean up orphaned user_id values from development/testing prior to enforcing foreign keys
UPDATE public.driving_sessions
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

UPDATE public.lesson_progress
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users);

-- 2. Add Foreign Key constraints to auth.users(id) ON DELETE CASCADE
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.driving_sessions
  DROP CONSTRAINT IF EXISTS driving_sessions_user_id_fkey,
  ADD CONSTRAINT driving_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey,
  ADD CONSTRAINT lesson_progress_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Automatic Profile Creation Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, preferences)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now(),
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username
    WHERE public.profiles.username IS NULL;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Hardened Row Level Security (RLS) Policies
-- Clean up previous permissive policies
DROP POLICY IF EXISTS "Allow public read access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon and auth insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon and auth update on profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow public read on driving_sessions" ON public.driving_sessions;
DROP POLICY IF EXISTS "Allow anon and auth insert on driving_sessions" ON public.driving_sessions;
DROP POLICY IF EXISTS "Allow anon and auth update on driving_sessions" ON public.driving_sessions;

DROP POLICY IF EXISTS "Allow public read on lesson_progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Allow anon and auth insert on lesson_progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Allow anon and auth update on lesson_progress" ON public.lesson_progress;

-- Profiles Policies
CREATE POLICY "Allow public read access on profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users or triggers to insert profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Driving Sessions Policies
CREATE POLICY "Allow read own or guest driving sessions"
  ON public.driving_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow insert own or guest driving sessions"
  ON public.driving_sessions FOR INSERT
  WITH CHECK ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Allow update own or guest driving sessions"
  ON public.driving_sessions FOR UPDATE
  USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL))
  WITH CHECK ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Allow delete own driving sessions"
  ON public.driving_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Lesson Progress Policies
CREATE POLICY "Allow read own or guest lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow insert own or guest lesson progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Allow update own or guest lesson progress"
  ON public.lesson_progress FOR UPDATE
  USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL))
  WITH CHECK ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Allow delete own lesson progress"
  ON public.lesson_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
