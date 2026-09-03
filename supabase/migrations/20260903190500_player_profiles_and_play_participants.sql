create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  avatar_color text not null default '#8b5cf6',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, display_name),
  unique (household_id, linked_user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'game_plays_id_household_id_key'
      and conrelid = 'public.game_plays'::regclass
  ) then
    alter table public.game_plays
      add constraint game_plays_id_household_id_key unique (id, household_id);
  end if;
end
$$;

create table if not exists public.game_play_participants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  play_id uuid not null,
  player_id uuid not null,
  score numeric,
  placement integer check (placement is null or placement > 0),
  is_winner boolean not null default false,
  team_name text,
  notes text,
  created_at timestamptz not null default now(),
  unique (play_id, player_id),
  foreign key (play_id, household_id)
    references public.game_plays(id, household_id) on delete cascade,
  foreign key (player_id, household_id)
    references public.player_profiles(id, household_id) on delete restrict
);

alter table public.player_profiles enable row level security;
alter table public.game_play_participants enable row level security;

grant select, insert, update, delete on public.player_profiles to authenticated;
grant select, insert, update, delete on public.game_play_participants to authenticated;
revoke all on public.player_profiles from anon;
revoke all on public.game_play_participants from anon;

drop policy if exists "Household members manage player profiles"
  on public.player_profiles;
create policy "Household members manage player profiles"
on public.player_profiles for all to authenticated
using ((select public.is_household_member(household_id)))
with check ((select public.is_household_member(household_id)));

drop policy if exists "Household members manage play participants"
  on public.game_play_participants;
create policy "Household members manage play participants"
on public.game_play_participants for all to authenticated
using ((select public.is_household_member(household_id)))
with check ((select public.is_household_member(household_id)));

create index if not exists player_profiles_household_active_idx
  on public.player_profiles(household_id, active, display_name);
create index if not exists player_profiles_linked_user_idx
  on public.player_profiles(linked_user_id);
create index if not exists player_profiles_created_by_idx
  on public.player_profiles(created_by);
create index if not exists game_play_participants_household_idx
  on public.game_play_participants(household_id);
create index if not exists game_play_participants_play_household_idx
  on public.game_play_participants(play_id, household_id);
create index if not exists game_play_participants_player_idx
  on public.game_play_participants(player_id);
create index if not exists game_play_participants_player_household_idx
  on public.game_play_participants(player_id, household_id);
