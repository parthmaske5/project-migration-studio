<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Shared site chrome and section building blocks live in src/components/site; sample marketplace data lives in src/data/sample.ts so future pages reuse them.

- Accounts: one auth identity per email; student/teacher are rows in public.user_roles with matching role profiles (student_profiles/teacher_profiles). All account reads/writes use the browser supabase client under RLS — no server functions for account flows.
- Protected pages live under src/routes/_authenticated/ (client-only gate redirecting to /auth); role-specific auth pages are /auth/student and /auth/teacher with an /auth chooser.
- Tutor directory (/tutors) and profiles (/tutors/$id) read approved teacher_profiles via the browser client under RLS (src/lib/tutor-data.ts); tutor photos live in the private `tutor-photos` bucket and are shown via signed URLs because public buckets are blocked.
- Enquiries are rows in tutor_enquiries (guest or signed-in student), readable by the receiving tutor — the hook point for future notifications.
- Enquiry conversations: replies live in enquiry_messages (sender role set by a DB trigger, which also updates tutor_enquiries.last_message_at/last_sender_role); read markers in enquiry_reads drive unread badges. Access is enforced by can_access_enquiry() (student, receiving tutor, admin). Guest enquiries cannot be replied to — guests must sign in and enquire again.
- Sign-up stores the chosen role in user metadata (signup_role); handle_new_user creates the matching role + role profile so users are never asked to pick a role twice.
- Tutor listings are public only when status='approved' AND completed_at IS NOT NULL; completed_at is stamped/cleared by a DB trigger (teacher_listing_complete), never by the client — keep src/lib/completeness.ts missingRequired in sync with it.
- Cross-role sign-in (student on teacher page or vice versa) shows a choice card (continue / go to other area / sign out) in AuthForm and auth.callback; roles are never added silently when the account already has the other role.
