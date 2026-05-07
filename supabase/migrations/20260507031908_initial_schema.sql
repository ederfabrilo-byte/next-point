-- users
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  role text check (role in ('player','teacher')),
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "users: own row" on public.users
  for all using (auth.uid() = id);

-- player_profiles
create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  forehand numeric(3,1),
  backhand numeric(3,1),
  serve numeric(3,1),
  volley numeric(3,1),
  movement numeric(3,1),
  mental numeric(3,1),
  hand text check (hand in ('right','left')),
  style text check (style in ('aggressive','defensive','all-around')),
  notes text,
  updated_at timestamptz default now()
);
alter table public.player_profiles enable row level security;
create policy "player_profiles: own row" on public.player_profiles
  for all using (auth.uid() = user_id);

-- opponents
create table public.opponents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users on delete cascade,
  name text not null,
  forehand numeric(3,1),
  backhand numeric(3,1),
  serve numeric(3,1),
  volley numeric(3,1),
  movement numeric(3,1),
  mental numeric(3,1),
  hand text check (hand in ('right','left')),
  style text check (style in ('aggressive','defensive','all-around')),
  notes text,
  created_at timestamptz default now()
);
alter table public.opponents enable row level security;
create policy "opponents: own rows" on public.opponents
  for all using (auth.uid() = owner_id);

-- strategies
create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.users on delete cascade,
  opponent_id uuid not null references public.opponents on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
alter table public.strategies enable row level security;
create policy "strategies: own rows" on public.strategies
  for all using (auth.uid() = player_id);

-- coach_config
create table public.coach_config (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.users on delete cascade,
  system_prompt text not null,
  version int default 1,
  updated_at timestamptz default now()
);
alter table public.coach_config enable row level security;
create policy "coach_config: teacher reads own" on public.coach_config
  for select using (auth.uid() = coach_id);
create policy "coach_config: teacher writes own" on public.coach_config
  for all using (auth.uid() = coach_id);

-- videos
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.users on delete cascade,
  target_type text check (target_type in ('self','opponent')),
  opponent_id uuid references public.opponents on delete set null,
  purpose text check (purpose in ('profile_analysis','technical_review')),
  storage_url text,
  description text,
  feedback text,
  status text default 'processing' check (status in ('processing','analyzed','pending_review','reviewed')),
  created_at timestamptz default now()
);
alter table public.videos enable row level security;
create policy "videos: player sees own" on public.videos
  for all using (auth.uid() = player_id);
create policy "videos: teacher sees technical_review" on public.videos
  for select using (
    purpose = 'technical_review'
    and exists (
      select 1 from public.users where id = auth.uid() and role = 'teacher'
    )
  );
create policy "videos: teacher updates feedback" on public.videos
  for update using (
    purpose = 'technical_review'
    and exists (
      select 1 from public.users where id = auth.uid() and role = 'teacher'
    )
  );

-- video_analyses
create table public.video_analyses (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos on delete cascade,
  forehand numeric(3,1),
  backhand numeric(3,1),
  serve numeric(3,1),
  volley numeric(3,1),
  movement numeric(3,1),
  mental numeric(3,1),
  hand text,
  style text,
  raw_response jsonb,
  applied_at timestamptz,
  created_at timestamptz default now()
);
alter table public.video_analyses enable row level security;
create policy "video_analyses: player sees own via video" on public.video_analyses
  for select using (
    exists (
      select 1 from public.videos v where v.id = video_id and v.player_id = auth.uid()
    )
  );

-- student_teacher
create table public.student_teacher (
  teacher_id uuid not null references public.users on delete cascade,
  student_id uuid not null references public.users on delete cascade,
  created_at timestamptz default now(),
  primary key (teacher_id, student_id)
);
alter table public.student_teacher enable row level security;
create policy "student_teacher: teacher sees own" on public.student_teacher
  for select using (auth.uid() = teacher_id);
create policy "student_teacher: student sees own" on public.student_teacher
  for select using (auth.uid() = student_id);

-- training_logs
create table public.training_logs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users on delete cascade,
  student_id uuid not null references public.users on delete cascade,
  date date not null,
  notes text,
  drills_suggested text,
  created_at timestamptz default now()
);
alter table public.training_logs enable row level security;
create policy "training_logs: teacher sees own" on public.training_logs
  for all using (auth.uid() = teacher_id);
create policy "training_logs: student reads own" on public.training_logs
  for select using (auth.uid() = student_id);

-- auto-create user record on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
