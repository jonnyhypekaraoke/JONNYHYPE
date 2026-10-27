-- JONNYHYPE COMMUNITY: rendi definitivo lo username scelto al primo accesso.
-- Esegui questo script una sola volta nel Supabase SQL Editor.
create or replace function public.community_set_username(p_username text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_username text := trim(p_username);
  v_existing text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.community_bans where user_id=auth.uid() and (banned_until is null or banned_until > now())) then
    raise exception 'account blocked';
  end if;

  -- Se il profilo esiste già, non consentire alcuna modifica dello username.
  select username into v_existing
  from public.community_profiles
  where user_id=auth.uid();

  if found then
    raise exception 'username already set';
  end if;

  if v_username !~ '^[A-Za-z0-9_.-]{3,20}$' then raise exception 'username format invalid'; end if;
  if lower(v_username) in ('admin','administrator','moderatore','moderator','jonnyhype','support','staff') then
    raise exception 'username unavailable';
  end if;

  insert into public.community_profiles(user_id,username)
  values(auth.uid(),v_username);

  return true;
exception
  when unique_violation then raise exception 'username taken';
end;
$$;

revoke all on function public.community_set_username(text) from public, anon;
grant execute on function public.community_set_username(text) to authenticated;
