# Roadmap — Student & Teacher Accounts

- [x] Enable email/password auth + Google + Lovable sign-in providers
- [x] Migration: app_role enum, user_roles + has_role, profiles (+ signup trigger), student_profiles, teacher_profiles (pending-approval status), RLS + grants
- [x] onAuthStateChange + Toaster in __root (no server functions needed — RLS covers account flows)
- [x] Auth pages: /auth chooser, /auth/student, /auth/teacher, /auth/callback (role add-on for existing accounts)
- [x] Protected areas: /account/student and /account/teacher under _authenticated gate
- [x] Skippable onboarding dialog with "complete later" path
- [x] Account-aware nav in SiteHeader
- [x] Verified end-to-end in preview: sign-up, confirm, sign-in, role add-on, onboarding skip/save, pending-approval badge, sign-out; build OK, 12 tests pass

Next step (not started, per spec): individual tutor profile page.
- [x] Live approved tutors on /tutors with filters
- [x] Public tutor profile page + Connect enquiry form
- [x] Teachers can enter tagline, photo, levels, curricula, languages, skills, qualifications, achievements, availability
- [x] Cross-role sign-in choice card; listings need complete + approved to be public
- [x] Simplified teacher dashboard: photo picker, status banner, single Edit profile mode with inline sections
