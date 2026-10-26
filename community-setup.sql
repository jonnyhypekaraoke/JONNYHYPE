-- JONNYHYPE COMMUNITY - schema iniziale Supabase (revisione sicurezza)
-- Eseguire nel SQL Editor del progetto Supabase dopo aver scelto e configurato l'autenticazione email/password.
-- Non inserire mai service_role keys nel sito pubblico.

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_.-]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists community_profiles_username_lower_uidx
  on public.community_profiles (lower(username));

create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.community_profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'published' check (status in ('published','removed')),
  created_at timestamptz not null default now()
);
-- Allinea anche un database in cui la tabella messaggi era stata creata prima
-- della correzione: il join dei messaggi deve puntare al profilo pubblico.
alter table public.community_messages
  drop constraint if exists community_messages_user_id_fkey;
alter table public.community_messages
  add constraint community_messages_user_id_fkey
  foreign key (user_id) references public.community_profiles(user_id) on delete cascade;

create table if not exists public.community_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.community_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default 'Violazione del regolamento',
  banned_until timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.community_moderation_queue (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  body text not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  message_id bigint references public.community_messages(id) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.community_profiles enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_admins enable row level security;
alter table public.community_bans enable row level security;
alter table public.community_moderation_queue enable row level security;
alter table public.community_reports enable row level security;

-- Definita prima della policy che la richiama.
create or replace function public.community_is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select exists(select 1 from public.community_admins where user_id=auth.uid()); $$;

drop policy if exists "public profiles readable by signed-in members" on public.community_profiles;
create policy "public profiles readable by signed-in members" on public.community_profiles for select to authenticated using (true);
drop policy if exists "published messages readable by members" on public.community_messages;
create policy "published messages readable by members" on public.community_messages for select to authenticated using (status='published' or public.community_is_admin());
-- No client-side INSERT/UPDATE/DELETE policies for messages, bans, moderation queue or reports.
-- All writes pass through the security-definer RPCs below.

create or replace function public.community_set_username(p_username text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_username text := trim(p_username);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.community_bans where user_id=auth.uid() and (banned_until is null or banned_until > now())) then raise exception 'account blocked'; end if;
  if v_username !~ '^[A-Za-z0-9_.-]{3,20}$' then raise exception 'username format invalid'; end if;
  if lower(v_username) in ('admin','administrator','moderatore','moderator','jonnyhype','support','staff') then raise exception 'username unavailable'; end if;
  insert into public.community_profiles(user_id,username) values(auth.uid(),v_username)
  on conflict(user_id) do update set username=excluded.username;
  return true;
exception when unique_violation then raise exception 'username taken';
end; $$;

create or replace function public.community_post_message(p_body text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_body text := trim(p_body); v_reason text; v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.community_profiles where user_id=auth.uid()) then raise exception 'username required'; end if;
  if exists(select 1 from public.community_bans where user_id=auth.uid() and (banned_until is null or banned_until > now())) then raise exception 'account blocked'; end if;
  if char_length(v_body)<1 or char_length(v_body)>500 then raise exception 'message length invalid'; end if;
  select greatest(
    coalesce((select max(created_at) from public.community_messages where user_id=auth.uid()), '-infinity'::timestamptz),
    coalesce((select max(created_at) from public.community_moderation_queue where user_id=auth.uid()), '-infinity'::timestamptz)
  ) into v_last;
  if v_last > now()-interval '10 seconds' then raise exception 'slow down'; end if;
  if v_body ~* '(https?://|www\.)' then v_reason := 'Link non consentito'; end if;
  if v_body ~* '\m(coglione|coglioni|stronzo|stronzi|vaffanculo|puttana|bastardo|bastardi|merda|troia|pezzo di merda)\M' then v_reason := coalesce(v_reason||'; ','')||'Linguaggio potenzialmente offensivo'; end if;
  if v_body ~* '(odio tutti i|ucciditi|ti ammazzo|ti uccido)' then v_reason := coalesce(v_reason||'; ','')||'Minaccia o contenuto aggressivo'; end if;
  if v_reason is not null then
    insert into public.community_moderation_queue(user_id,body,reason) values(auth.uid(),v_body,v_reason);
    return jsonb_build_object('status','blocked');
  end if;
  insert into public.community_messages(user_id,body) values(auth.uid(),v_body);
  return jsonb_build_object('status','published');
end; $$;

create or replace function public.community_report_message(p_message_id bigint,p_reason text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 if exists(select 1 from public.community_bans where user_id=auth.uid() and (banned_until is null or banned_until > now())) then raise exception 'account blocked'; end if;
 if not exists(select 1 from public.community_messages where id=p_message_id and status='published') then raise exception 'message unavailable'; end if;
 if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'report reason required'; end if;
 insert into public.community_reports(message_id,reporter_id,reason) values(p_message_id,auth.uid(),left(trim(p_reason),250));
 return true;
end; $$;

create or replace function public.community_admin_delete_message(p_message_id bigint) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 update public.community_messages set status='removed' where id=p_message_id;
 return true;
end; $$;

create or replace function public.community_admin_ban_user(p_user_id uuid,p_reason text default 'Violazione del regolamento') returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 if p_user_id=auth.uid() then raise exception 'cannot ban self'; end if;
 insert into public.community_bans(user_id,reason,banned_until) values(p_user_id,left(p_reason,250),null)
 on conflict(user_id) do update set reason=excluded.reason,banned_until=null,created_at=now();
 return true;
end; $$;

create or replace function public.community_admin_suspend_user(
  p_user_id uuid,
  p_hours integer default 24,
  p_reason text default 'Sospensione temporanea per violazione del regolamento'
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $suspend$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 if p_user_id=auth.uid() then raise exception 'cannot suspend self'; end if;
 if p_hours is null or p_hours < 1 or p_hours > 720 then raise exception 'suspension duration must be between 1 and 720 hours'; end if;
 insert into public.community_bans(user_id,reason,banned_until)
 values(p_user_id,left(coalesce(p_reason,'Violazione del regolamento'),250),now() + make_interval(hours => p_hours))
 on conflict(user_id) do update
 set reason=excluded.reason,banned_until=excluded.banned_until,created_at=now();
 return true;
end;
$suspend$;

create or replace function public.community_admin_moderation_queue()
returns table(id bigint,user_id uuid,body text,reason text,created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $queue$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 return query select q.id,q.user_id,q.body,q.reason,q.created_at from public.community_moderation_queue q where not q.resolved order by q.created_at desc limit 100;
end;
$queue$;

create or replace function public.community_admin_resolve_moderation_item(p_item_id bigint) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $func$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 update public.community_moderation_queue set resolved=true where id=p_item_id;
 return true;
end;
$func$;

create or replace function public.community_admin_reports()
returns table(id bigint,message_id bigint,body text,reason text,created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 return query
 select r.id,r.message_id,coalesce(m.body,'[messaggio non disponibile]'),r.reason,r.created_at
 from public.community_reports r left join public.community_messages m on m.id=r.message_id
 where not r.resolved order by r.created_at desc limit 100;
end; $$;

create or replace function public.community_admin_resolve_report(p_report_id bigint) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
 if not public.community_is_admin() then raise exception 'admin only'; end if;
 update public.community_reports set resolved=true where id=p_report_id;
 return true;
end; $$;

revoke all on function public.community_is_admin() from public, anon;
revoke all on function public.community_set_username(text) from public, anon;
revoke all on function public.community_post_message(text) from public, anon;
revoke all on function public.community_report_message(bigint,text) from public, anon;
revoke all on function public.community_admin_delete_message(bigint) from public, anon;
revoke all on function public.community_admin_ban_user(uuid,text) from public, anon;
revoke all on function public.community_admin_suspend_user(uuid,integer,text) from public, anon;
revoke all on function public.community_admin_moderation_queue() from public, anon;
revoke all on function public.community_admin_reports() from public, anon;
revoke all on function public.community_admin_resolve_moderation_item(bigint) from public, anon;
revoke all on function public.community_admin_resolve_report(bigint) from public, anon;

grant execute on function public.community_is_admin() to authenticated;
grant execute on function public.community_set_username(text) to authenticated;
grant execute on function public.community_post_message(text) to authenticated;
grant execute on function public.community_report_message(bigint,text) to authenticated;
grant execute on function public.community_admin_delete_message(bigint) to authenticated;
grant execute on function public.community_admin_ban_user(uuid,text) to authenticated;
grant execute on function public.community_admin_suspend_user(uuid,integer,text) to authenticated;
grant execute on function public.community_admin_moderation_queue() to authenticated;
grant execute on function public.community_admin_reports() to authenticated;
grant execute on function public.community_admin_resolve_moderation_item(bigint) to authenticated;
grant execute on function public.community_admin_resolve_report(bigint) to authenticated;
-- Permessi minimi espliciti: nessun accesso anonimo diretto alle tabelle della community.
revoke all on table public.community_profiles from PUBLIC, anon, authenticated;
revoke all on table public.community_messages from PUBLIC, anon, authenticated;
revoke all on table public.community_admins from PUBLIC, anon, authenticated;
revoke all on table public.community_bans from PUBLIC, anon, authenticated;
revoke all on table public.community_moderation_queue from PUBLIC, anon, authenticated;
revoke all on table public.community_reports from PUBLIC, anon, authenticated;

-- I membri autenticati possono soltanto leggere profili e messaggi; RLS limita le righe visibili.
grant select on public.community_profiles, public.community_messages to authenticated;


-- REGISTRAZIONI WHATSAPP: elenco admin e codici personali (fase di invito).
create extension if not exists pgcrypto;

create table if not exists public.community_whatsapp_invites (
  id bigint generated always as identity primary key,
  username text not null,
  phone text not null,
  code_hash text not null unique,
  status text not null default 'in_attesa' check (status in ('in_attesa','attivato','revocato')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  constraint community_whatsapp_invites_username_format check (username ~ '^[A-Za-z0-9_.-]{3,20}$')
);
create unique index if not exists community_whatsapp_invites_username_lower_uidx
  on public.community_whatsapp_invites (lower(username))
  where status <> 'revocato';

alter table public.community_whatsapp_invites enable row level security;
revoke all on table public.community_whatsapp_invites from public, anon, authenticated;

create or replace function public.community_admin_list_whatsapp_invites()
returns table(id bigint, username text, phone text, status text, created_at timestamptz, activated_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.community_is_admin() then raise exception 'admin only'; end if;
  return query select i.id,i.username,i.phone,i.status,i.created_at,i.activated_at
  from public.community_whatsapp_invites i order by i.created_at desc limit 500;
end; $$;

create or replace function public.community_admin_create_whatsapp_invite(p_username text,p_phone text)
returns table(invite_id bigint, username text, phone text, access_code text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_username text := trim(p_username); v_phone text := trim(p_phone); v_code text;
begin
  if not public.community_is_admin() then raise exception 'admin only'; end if;
  if v_username !~ '^[A-Za-z0-9_.-]{3,20}$' then raise exception 'username_format_invalid'; end if;
  if length(regexp_replace(v_phone,'[^0-9+]','','g')) < 8 then raise exception 'phone_invalid'; end if;
  if exists(select 1 from public.community_profiles p where lower(p.username)=lower(v_username))
     or exists(select 1 from public.community_whatsapp_invites i where lower(i.username)=lower(v_username) and i.status <> 'revocato') then
    raise exception 'username_taken';
  end if;
  v_code := upper(encode(gen_random_bytes(6),'hex'));
  insert into public.community_whatsapp_invites(username,phone,code_hash)
    values(v_username,v_phone,encode(digest(v_code,'sha256'),'hex'))
    returning id into invite_id;
  username := v_username; phone := v_phone; access_code := v_code;
  return next;
end; $$;

create or replace function public.community_admin_revoke_whatsapp_invite(p_invite_id bigint)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.community_is_admin() then raise exception 'admin only'; end if;
  update public.community_whatsapp_invites set status='revocato'
   where id=p_invite_id and status='in_attesa';
  return found;
end; $$;

revoke all on function public.community_admin_list_whatsapp_invites() from public, anon;
revoke all on function public.community_admin_create_whatsapp_invite(text,text) from public, anon;
revoke all on function public.community_admin_revoke_whatsapp_invite(bigint) from public, anon;
grant execute on function public.community_admin_list_whatsapp_invites() to authenticated;
grant execute on function public.community_admin_create_whatsapp_invite(text,text) to authenticated;
grant execute on function public.community_admin_revoke_whatsapp_invite(bigint) to authenticated;


-- ACCESSO COMMUNITY SENZA EMAIL: attivazione con codice WhatsApp su sessione anonima Supabase.
alter table public.community_whatsapp_invites
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create or replace function public.community_activate_whatsapp_code(p_username text,p_code text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_invite public.community_whatsapp_invites%rowtype;
begin
  if v_user is null then raise exception 'session_required'; end if;
  if coalesce(auth.jwt()->>'is_anonymous','false') <> 'true' then
    raise exception 'anonymous_session_required';
  end if;
  select * into v_invite from public.community_whatsapp_invites
   where lower(username)=lower(trim(p_username))
     and code_hash=encode(digest(upper(trim(p_code)),'sha256'),'hex')
     and status='in_attesa'
   for update;
  if not found then raise exception 'invalid_or_used_code'; end if;
  if exists(select 1 from public.community_profiles where lower(username)=lower(v_invite.username)) then
    raise exception 'username_taken';
  end if;
  insert into public.community_profiles(user_id,username) values(v_user,v_invite.username);
  update public.community_whatsapp_invites set status='attivato',activated_at=now(),user_id=v_user where id=v_invite.id;
  return true;
end; $$;

create or replace function public.community_my_whatsapp_profile()
returns table(username text)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
 if auth.uid() is null then raise exception 'session_required'; end if;
 return query select p.username from public.community_profiles p where p.user_id=auth.uid() limit 1;
end; $$;

revoke all on function public.community_activate_whatsapp_code(text,text) from public, anon;
revoke all on function public.community_my_whatsapp_profile() from public, anon;
grant execute on function public.community_activate_whatsapp_code(text,text) to authenticated;
grant execute on function public.community_my_whatsapp_profile() to authenticated;
