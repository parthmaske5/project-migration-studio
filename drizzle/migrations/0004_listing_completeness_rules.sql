CREATE OR REPLACE FUNCTION public.teacher_listing_complete(_t public.teacher_profiles)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(btrim(_t.tagline),'') <> ''
     AND coalesce(btrim(_t.qualification),'') <> ''
     AND coalesce(array_length(_t.subjects,1),0) > 0
     AND coalesce(_t.teaching_mode,'') <> ''
     AND coalesce(_t.location,'') <> ''
     AND _t.fee_per_hour IS NOT NULL
     AND coalesce(btrim(_t.bio),'') <> ''
     AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _t.user_id AND coalesce(btrim(p.display_name),'') <> '')
$$;

CREATE OR REPLACE FUNCTION public.stamp_teacher_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.teacher_listing_complete(NEW) THEN
    NEW.completed_at := coalesce(OLD.completed_at, NEW.completed_at, now());
    IF TG_OP = 'INSERT' THEN NEW.completed_at := coalesce(NEW.completed_at, now()); END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stamp_teacher_completed ON public.teacher_profiles;
CREATE TRIGGER stamp_teacher_completed BEFORE INSERT OR UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_teacher_completed();

CREATE OR REPLACE FUNCTION public.touch_teacher_on_name()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    UPDATE public.teacher_profiles SET updated_at = now() WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS touch_teacher_on_name ON public.profiles;
CREATE TRIGGER touch_teacher_on_name AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_teacher_on_name();

UPDATE public.teacher_profiles SET updated_at = now();

DROP POLICY IF EXISTS "Anyone can read approved teacher profiles" ON public.teacher_profiles;
CREATE POLICY "Anyone can read approved complete teacher profiles" ON public.teacher_profiles
  FOR SELECT TO anon, authenticated USING (status = 'approved' AND completed_at IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read names of approved tutors" ON public.profiles;
CREATE POLICY "Anyone can read names of listed tutors" ON public.profiles
  FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.teacher_profiles t
    WHERE t.user_id = profiles.id AND t.status = 'approved' AND t.completed_at IS NOT NULL));

DROP POLICY IF EXISTS "Anyone can send an enquiry to an approved tutor" ON public.tutor_enquiries;
CREATE POLICY "Anyone can send an enquiry to a listed tutor" ON public.tutor_enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (
    (student_user_id IS NULL OR student_user_id = auth.uid()) AND status = 'new'
    AND EXISTS (SELECT 1 FROM public.teacher_profiles t WHERE t.id = tutor_enquiries.teacher_profile_id
      AND t.status = 'approved' AND t.completed_at IS NOT NULL));