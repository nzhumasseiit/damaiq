-- Run in Supabase SQL editor

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  city text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  total_games integer not null default 0,
  win_streak integer not null default 0,
  best_streak integer not null default 0,
  is_pro boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  opponent text not null check (opponent in ('ai_easy', 'ai_medium', 'ai_hard', 'pvp', 'online')),
  result text not null check (result in ('win', 'loss', 'draw')),
  total_moves integer not null default 0,
  duration_seconds integer not null default 0,
  move_history jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_wins_idx on public.profiles (wins desc);
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists games_player_id_idx on public.games (player_id, created_at desc);

alter table public.profiles add column if not exists is_pro boolean not null default false;
alter table public.profiles add column if not exists stripe_customer_id text;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references public.profiles(id),
  guest_id uuid references public.profiles(id),
  board_state jsonb not null,
  current_turn text default 'white',
  status text default 'waiting',
  winner text,
  created_at timestamptz default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.rooms enable row level security;

create policy "Profiles are readable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Games are readable by everyone"
  on public.games for select using (true);

create policy "Users can insert own games"
  on public.games for insert with check (auth.uid() = player_id);

create policy "Rooms are readable by everyone"
  on public.rooms for select using (true);

create policy "Users can create hosted rooms"
  on public.rooms for insert with check (auth.uid() = host_id);

create policy "Players can update own rooms"
  on public.rooms for update
  using (auth.uid() = host_id or guest_id is null or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);
