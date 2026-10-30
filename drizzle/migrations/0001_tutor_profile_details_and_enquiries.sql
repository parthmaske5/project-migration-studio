ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS levels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS curricula text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qualifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Owners may edit an approved listing without losing approval, but never self-approve.
DROP POLICY IF EXISTS "Teachers can update their own teacher profile but not self-appr" ON public.teacher_profiles;
CREATE POLICY "Teachers can update their own teacher profile"
  ON public.teacher_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_teacher_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status = 'approved'
     AND NOT public.has_role(auth.uid(), 'admin')
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Only an administrator can approve a tutor listing';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_teacher_status ON public.teacher_profiles;
CREATE TRIGGER guard_teacher_status BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_teacher_status();

-- Public can read display names of approved tutors only.
GRANT SELECT ON public.profiles TO anon;
CREATE POLICY "Anyone can read names of approved tutors"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_profiles t WHERE t.user_id = profiles.id AND t.status = 'approved'));

CREATE TABLE public.tutor_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_profile_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  student_user_id uuid,
  education_level text NOT NULL CHECK (char_length(education_level) BETWEEN 1 AND 60),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  message text CHECK (message IS NULL OR char_length(message) <= 1000),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.tutor_enquiries TO anon;
GRANT SELECT, INSERT ON public.tutor_enquiries TO authenticated;
GRANT ALL ON public.tutor_enquiries TO service_role;
ALTER TABLE public.tutor_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send an enquiry to an approved tutor"
  ON public.tutor_enquiries FOR INSERT TO anon, authenticated
  WITH CHECK (
    (student_user_id IS NULL OR student_user_id = auth.uid())
    AND status = 'new'
    AND EXISTS (SELECT 1 FROM public.teacher_profiles t WHERE t.id = teacher_profile_id AND t.status = 'approved')
  );
CREATE POLICY "Tutors read enquiries sent to them"
  ON public.tutor_enquiries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_profiles t WHERE t.id = teacher_profile_id AND t.user_id = auth.uid()));
CREATE POLICY "Students read their own enquiries"
  ON public.tutor_enquiries FOR SELECT TO authenticated
  USING (student_user_id = auth.uid());

CREATE POLICY "Tutor photos are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'tutor-photos');
CREATE POLICY "Users upload own tutor photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tutor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own tutor photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tutor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own tutor photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tutor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);