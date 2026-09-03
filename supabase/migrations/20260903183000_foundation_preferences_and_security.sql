-- Persist the complete shared Tonight configuration.
alter table public.household_settings
  add column if not exists selection_mode text not null default 'recommended'
    check (selection_mode in ('random', 'recommended', 'highest', 'overdue')),
  add column if not exists dized_only boolean not null default false;

-- The membership helper is required by household RLS, but anonymous callers
-- must not be able to invoke this SECURITY DEFINER function as an RPC.
revoke execute on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated, service_role;

-- This event-trigger function is internal database infrastructure.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to postgres, service_role;

-- Cover foreign keys and the application's household-scoped access patterns.
create index if not exists household_members_user_id_idx
  on public.household_members(user_id);
create index if not exists game_plays_household_played_at_idx
  on public.game_plays(household_id, played_at desc);
create index if not exists game_plays_game_id_idx
  on public.game_plays(game_id);
create index if not exists game_plays_logged_by_idx
  on public.game_plays(logged_by);
create index if not exists game_night_queue_game_id_idx
  on public.game_night_queue(game_id);
create index if not exists game_night_queue_added_by_idx
  on public.game_night_queue(added_by);
create index if not exists game_tags_household_id_idx
  on public.game_tags(household_id);
create index if not exists game_tags_tag_id_idx
  on public.game_tags(tag_id);
create index if not exists game_tags_created_by_idx
  on public.game_tags(created_by);
create index if not exists household_tags_created_by_idx
  on public.household_tags(created_by);
create index if not exists households_created_by_idx
  on public.households(created_by);
