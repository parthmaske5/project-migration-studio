create type public.app_role as enum ('admin', 'student', 'teacher');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can read their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can add student or teacher role to themselves"
  on public.user_roles for insert to authenticated
  with check (auth.uid() = user_id and role in ('student', 'teacher'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  education_level text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.student_profiles to authenticated;
grant all on public.student_profiles to service_role;
alter table public.student_profiles enable row level security;

create policy "Students can read their own student profile"
  on public.student_profiles for select to authenticated
  using (auth.uid() = user_id);
create policy "Students can create their own student profile"
  on public.student_profiles for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Students can update their own student profile"
  on public.student_profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  qualification text,
  subjects text[] not null default '{}',
  teaching_mode text,
  location text,
  fee_per_hour numeric,
  bio text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.teacher_profiles to authenticated;
grant select on public.teacher_profiles to anon;
grant all on public.teacher_profiles to service_role;
alter table public.teacher_profiles enable row level security;

create policy "Teachers can read their own teacher profile"
  on public.teacher_profiles for select to authenticated
  using (auth.uid() = user_id);
create policy "Anyone can read approved teacher profiles"
  on public.teacher_profiles for select to anon, authenticated
  using (status = 'approved');
create policy "Teachers can create their own teacher profile"
  on public.teacher_profiles for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');
create policy "Teachers can update their own teacher profile but not self-approve"
  on public.teacher_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status in ('pending', 'rejected'));
create policy "Admins can manage all teacher profiles"
  on public.teacher_profiles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));