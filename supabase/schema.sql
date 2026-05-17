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
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  opponent text not null check (opponent in ('ai_easy', 'ai_medium', 'ai_hard', 'pvp')),
  result text not null check (result in ('win', 'loss', 'draw')),
  total_moves integer not null default 0,
  duration_seconds integer not null default 0,
  move_history jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_wins_idx on public.profiles (wins desc);
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists games_player_id_idx on public.games (player_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.games enable row level security;

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
