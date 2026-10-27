-- JONNYHYPE COMMUNITY: consenti username duplicati.
-- Eseguire una sola volta nel Supabase SQL Editor.
-- I profili esistenti e i messaggi non vengono cancellati.

alter table public.community_profiles
  drop constraint if exists community_profiles_username_key;

drop index if exists public.community_profiles_username_lower_uidx;

create or replace function public.community_set_username(p_username text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_username text := trim(p_username);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.community_bans where user_id=auth.uid() and (banned_until is null or banned_until > now())) then raise exception 'account blocked'; end if;
  if v_username !~ '^[A-Za-z0-9_.-]{3,20}$' then raise exception 'username format invalid'; end if;
  if lower(v_username) in ('admin','administrator','moderatore','moderator','jonnyhype','support','staff') then raise exception 'username unavailable'; end if;
  -- Ogni sessione conserva il proprio profilo, ma nomi uguali sono ammessi.
  if exists(select 1 from public.community_profiles where user_id=auth.uid()) then
    if exists(select 1 from public.community_profiles where user_id=auth.uid() and username=v_username) then
      return true;
    end if;
    raise exception 'username_locked';
  end if;
  insert into public.community_profiles(user_id,username) values(auth.uid(),v_username);
  return true;
end; $$;

revoke all on function public.community_set_username(text) from public, anon;
grant execute on function public.community_set_username(text) to authenticated;
