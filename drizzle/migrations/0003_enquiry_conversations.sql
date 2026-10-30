-- Who may see an enquiry conversation: the student who sent it, the receiving tutor, or an admin.
CREATE OR REPLACE FUNCTION public.can_access_enquiry(_enquiry_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tutor_enquiries e
    JOIN public.teacher_profiles t ON t.id = e.teacher_profile_id
    WHERE e.id = _enquiry_id
      AND (e.student_user_id = auth.uid() OR t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
$$;

-- Role of the caller inside an enquiry ('student' | 'teacher' | null).
CREATE OR REPLACE FUNCTION public.enquiry_role(_enquiry_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN e.student_user_id = auth.uid() THEN 'student'
    WHEN t.user_id = auth.uid() THEN 'teacher'
    ELSE NULL END
  FROM public.tutor_enquiries e JOIN public.teacher_profiles t ON t.id = e.teacher_profile_id
  WHERE e.id = _enquiry_id
$$;

ALTER TABLE public.tutor_enquiries
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_sender_role text NOT NULL DEFAULT 'student';

CREATE POLICY "Admins read all enquiries"
  ON public.tutor_enquiries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.enquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.tutor_enquiries(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  sender_role text NOT NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiry_messages_enquiry_idx ON public.enquiry_messages (enquiry_id, created_at);
GRANT SELECT, INSERT ON public.enquiry_messages TO authenticated;
GRANT ALL ON public.enquiry_messages TO service_role;
ALTER TABLE public.enquiry_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversation messages"
  ON public.enquiry_messages FOR SELECT TO authenticated
  USING (public.can_access_enquiry(enquiry_id));
CREATE POLICY "Participants send messages as themselves"
  ON public.enquiry_messages FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid() AND public.enquiry_role(enquiry_id) IS NOT NULL);

-- Sender role is decided by the database, never the client; bumps the enquiry's activity.
CREATE OR REPLACE FUNCTION public.handle_enquiry_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  r := public.enquiry_role(NEW.enquiry_id);
  IF r IS NULL THEN RAISE EXCEPTION 'Not part of this conversation'; END IF;
  NEW.sender_role := r;
  NEW.body := btrim(NEW.body);
  NEW.created_at := now();
  UPDATE public.tutor_enquiries
     SET last_message_at = NEW.created_at,
         last_sender_role = r,
         status = CASE WHEN r = 'teacher' THEN 'replied' ELSE 'awaiting_reply' END
   WHERE id = NEW.enquiry_id;
  RETURN NEW;
END $$;
CREATE TRIGGER enquiry_message_before_insert BEFORE INSERT ON public.enquiry_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_enquiry_message();

CREATE TABLE public.enquiry_reads (
  enquiry_id uuid NOT NULL REFERENCES public.tutor_enquiries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (enquiry_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.enquiry_reads TO authenticated;
GRANT ALL ON public.enquiry_reads TO service_role;
ALTER TABLE public.enquiry_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants see read markers in their conversations"
  ON public.enquiry_reads FOR SELECT TO authenticated
  USING (public.can_access_enquiry(enquiry_id));
CREATE POLICY "Users record their own read marker"
  ON public.enquiry_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.enquiry_role(enquiry_id) IS NOT NULL);
CREATE POLICY "Users update their own read marker"
  ON public.enquiry_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Tutors can see the name of students who contacted them.
CREATE OR REPLACE FUNCTION public.is_enquiring_student(_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tutor_enquiries e JOIN public.teacher_profiles t ON t.id = e.teacher_profile_id
    WHERE e.student_user_id = _student AND t.user_id = auth.uid()
  )
$$;
CREATE POLICY "Tutors read names of students who contacted them"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_enquiring_student(id));

-- Tutors and students in a conversation can see the tutor's listing even before approval.
CREATE OR REPLACE FUNCTION public.has_enquired_teacher(_teacher_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tutor_enquiries e WHERE e.teacher_profile_id = _teacher_profile AND e.student_user_id = auth.uid())
$$;

-- Sign-up carries the role the person picked, so they land straight in their area.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := new.raw_user_meta_data ->> 'signup_role';
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  IF r = 'student' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'student') ON CONFLICT DO NOTHING;
    INSERT INTO public.student_profiles (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  ELSIF r = 'teacher' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'teacher') ON CONFLICT DO NOTHING;
    INSERT INTO public.teacher_profiles (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END $$;