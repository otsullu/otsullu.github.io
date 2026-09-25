-- ═══════════════════════════════════════════════════════════════════
-- OTS Ullu — reader feedback: comments, 👍/👎, view counts, moderation
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: tables use IF NOT EXISTS, functions use CREATE OR REPLACE.
--
-- Design:
--   * All tables live in the private `fb` schema, which the public API
--     does not expose. Browsers can only call the `public.*` functions
--     below; each one validates input and enforces the rules
--     (rate limits, bans, link rule, edit history, admin-only actions).
--   * Views and votes are anonymous (random visitor ID from the browser).
--     Comments require a social sign-in (Google / Microsoft / LinkedIn).
--   * Nothing is ever hard-deleted by users or moderators: deletes and
--     hides change `status`, and every change is archived in
--     fb.comment_history for the admin.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create schema if not exists fb;
revoke all on schema fb from public, anon, authenticated;

-- ── TABLES ──────────────────────────────────────────────────────────

create table if not exists fb.settings (
  key   text primary key,
  value text not null
);
-- Salt for hashing visitor IPs (used only for rate limiting; raw IPs are never stored).
insert into fb.settings (key, value)
values ('ip_salt', encode(extensions.gen_random_bytes(16), 'hex'))
on conflict (key) do nothing;

-- One row per thing people can view / vote on / comment on.
--   article:<slug>   deck:<pdf id>   podcast:<episode guid>   page:<path>
create table if not exists fb.items (
  id         text primary key check (id ~ '^(article|deck|podcast|page):[^\s<>"]+$' and char_length(id) <= 310),
  kind       text generated always as (split_part(id, ':', 1)) stored,
  title      text check (char_length(title) <= 300),
  url        text check (url ~ '^/[^\s<>"]*$' and char_length(url) <= 600),   -- site-relative only
  created_at timestamptz not null default now()
);

create table if not exists fb.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  is_admin     boolean not null default false,
  is_blocked   boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists fb.comments (
  id          bigint generated always as identity primary key,
  item_id     text   not null references fb.items (id) on delete cascade,
  parent_id   bigint references fb.comments (id) on delete cascade,
  author_id   uuid   references fb.profiles (id) on delete set null,
  as_official boolean not null default false,          -- posted as "OTS Ullu"
  body        text   not null check (char_length(body) between 1 and 2000),
  status      text   not null default 'visible'
              check (status in ('visible', 'hidden', 'removed', 'deleted')),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);
create index if not exists comments_item_idx   on fb.comments (item_id, created_at);
create index if not exists comments_author_idx on fb.comments (author_id, created_at);
create index if not exists comments_parent_idx on fb.comments (parent_id);

-- Admin-only archive. `body` is the text as it was when the action happened
-- ('created' = original text, 'edited' = text BEFORE the edit).
create table if not exists fb.comment_history (
  id         bigint generated always as identity primary key,
  comment_id bigint not null references fb.comments (id) on delete cascade,
  action     text   not null
             check (action in ('created', 'edited', 'deleted', 'hidden', 'removed', 'restored')),
  body       text,
  actor_id   uuid,
  created_at timestamptz not null default now()
);
create index if not exists history_comment_idx on fb.comment_history (comment_id, created_at);

create table if not exists fb.votes (
  item_id    text     not null references fb.items (id) on delete cascade,
  visitor_id text     not null check (visitor_id ~ '^[A-Za-z0-9-]{16,64}$'),
  value      smallint not null check (value in (-1, 1)),
  ip_hash    text,
  updated_at timestamptz not null default now(),
  primary key (item_id, visitor_id)
);
create index if not exists votes_ip_idx on fb.votes (ip_hash, updated_at);

create table if not exists fb.views (
  id         bigint generated always as identity primary key,
  item_id    text not null references fb.items (id) on delete cascade,
  visitor_id text not null,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index if not exists views_item_idx on fb.views (item_id, visitor_id, created_at desc);
create index if not exists views_ip_idx   on fb.views (ip_hash, created_at desc);

-- Defense in depth: even if the schema were ever exposed, no row is reachable.
alter table fb.settings        enable row level security;
alter table fb.items           enable row level security;
alter table fb.profiles        enable row level security;
alter table fb.comments        enable row level security;
alter table fb.comment_history enable row level security;
alter table fb.votes           enable row level security;
alter table fb.views           enable row level security;

-- ── PRIVATE HELPERS (schema fb, not callable from the browser) ─────

create or replace function fb.ip_hash() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  hdrs json;
  ip   text;
begin
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    hdrs := null;
  end;
  ip := coalesce(hdrs ->> 'cf-connecting-ip',
                 btrim(split_part(coalesce(hdrs ->> 'x-forwarded-for', ''), ',', 1)));
  if ip is null or ip = '' then
    return null;
  end if;
  return encode(extensions.digest(ip || (select s.value from fb.settings s where s.key = 'ip_salt'), 'sha256'), 'hex');
end $$;

create or replace function fb.valid_visitor(p_visitor text) returns boolean
language sql immutable set search_path = '' as $$
  select p_visitor is not null and p_visitor ~ '^[A-Za-z0-9-]{16,64}$'
$$;

create or replace function fb.ensure_item(p_id text, p_title text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t text := left(nullif(btrim(coalesce(p_title, '')), ''), 300);
  u text := case when p_url ~ '^/[^\s<>"]*$' and char_length(p_url) <= 600 then p_url end;
begin
  if p_id is null or p_id !~ '^(article|deck|podcast|page):[^\s<>"]+$' or char_length(p_id) > 310 then
    raise exception 'Unknown item.';
  end if;
  -- First writer sets title/url; later calls only fill gaps (fix titles from the admin side).
  insert into fb.items (id, title, url) values (p_id, t, u)
  on conflict (id) do update
    set title = coalesce(fb.items.title, excluded.title),
        url   = coalesce(fb.items.url,   excluded.url);
end $$;

-- Returns the caller's profile, creating it from their social account on first use.
create or replace function fb.current_profile() returns fb.profiles
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  p    fb.profiles;
  meta jsonb;
  mail text;
  nm   text;
begin
  if uid is null then
    raise exception 'Please sign in first.';
  end if;
  select * into p from fb.profiles x where x.id = uid;
  if found then
    return p;
  end if;
  select u.raw_user_meta_data, u.email into meta, mail from auth.users u where u.id = uid;
  nm := coalesce(nullif(btrim(meta ->> 'full_name'), ''),
                 nullif(btrim(meta ->> 'name'), ''),
                 nullif(split_part(coalesce(mail, ''), '@', 1), ''),
                 'Reader');
  insert into fb.profiles (id, display_name, avatar_url)
  values (uid, left(nm, 40), nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), ''))
  on conflict (id) do nothing;
  select * into p from fb.profiles x where x.id = uid;
  return p;
end $$;

create or replace function fb.require_admin() returns fb.profiles
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles := fb.current_profile();
begin
  if not me.is_admin then
    raise exception 'Moderator access only.';
  end if;
  return me;
end $$;

create or replace function fb.has_link(p_text text) returns boolean
language sql immutable set search_path = '' as $$
  select p_text ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|io|in|co|xyz|info|ru|biz|app|link|ly|me|site|online|top|shop|click)\M)'
$$;

-- Shared validation for new and edited comment text.
create or replace function fb.check_body(me fb.profiles, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  prior int;
begin
  if me.is_blocked then
    raise exception 'Your account is not able to post comments.';
  end if;
  if char_length(p_body) < 1 then
    raise exception 'Comment cannot be empty.';
  end if;
  if char_length(p_body) > 2000 then
    raise exception 'Comments are limited to 2,000 characters.';
  end if;
  if not me.is_admin and fb.has_link(p_body) then
    select count(*) into prior
      from fb.comments c
     where c.author_id = me.id and c.status = 'visible' and c.created_at < now() - interval '1 day';
    if prior < 3 then
      raise exception 'Links can be included once you have posted a few comments. Please remove the link and try again.';
    end if;
  end if;
end $$;

-- ── PUBLIC API: views, votes, counts (no sign-in needed) ───────────

create or replace function public.record_view(p_item text, p_visitor text,
                                               p_title text default null, p_url text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  h text := fb.ip_hash();
begin
  if not fb.valid_visitor(p_visitor) then
    return;
  end if;
  perform fb.ensure_item(p_item, p_title, p_url);
  -- Same visitor re-opening the same item within 30 minutes is one view.
  if exists (select 1 from fb.views v
              where v.item_id = p_item and v.visitor_id = p_visitor
                and v.created_at > now() - interval '30 minutes') then
    return;
  end if;
  -- Crude flood guard per network.
  if h is not null and (select count(*) from fb.views v
                         where v.ip_hash = h and v.created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  insert into fb.views (item_id, visitor_id, ip_hash) values (p_item, p_visitor, h);
end $$;

create or replace function public.get_item_stats(p_items text[], p_visitor text default null)
returns table (item_id text, views bigint, uniques bigint, up bigint, down bigint,
               comments bigint, my_vote smallint)
language sql stable security definer set search_path = '' as $$
  select i.id,
         (select count(*)                   from fb.views v    where v.item_id = i.id),
         (select count(distinct v.visitor_id) from fb.views v  where v.item_id = i.id),
         (select count(*) from fb.votes o    where o.item_id = i.id and o.value = 1),
         (select count(*) from fb.votes o    where o.item_id = i.id and o.value = -1),
         (select count(*) from fb.comments c where c.item_id = i.id and c.status = 'visible'),
         (select o.value  from fb.votes o    where o.item_id = i.id and o.visitor_id = p_visitor)
    from unnest(p_items[1:200]) as i (id)
$$;

-- Site-wide traffic = all page:* views.
create or replace function public.get_site_stats()
returns table (views bigint, uniques bigint)
language sql stable security definer set search_path = '' as $$
  select count(*), count(distinct v.visitor_id) from fb.views v where v.item_id like 'page:%'
$$;

-- p_value: 1 = 👍, -1 = 👎, 0 = clear my vote.
create or replace function public.set_vote(p_item text, p_visitor text, p_value int,
                                           p_title text default null, p_url text default null)
returns table (up bigint, down bigint, my_vote smallint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  h       text := fb.ip_hash();
  existed boolean;
begin
  if not fb.valid_visitor(p_visitor) then
    raise exception 'Invalid visitor.';
  end if;
  if p_value is null or p_value not in (-1, 0, 1) then
    raise exception 'Invalid vote.';
  end if;
  perform fb.ensure_item(p_item, p_title, p_url);
  existed := exists (select 1 from fb.votes o where o.item_id = p_item and o.visitor_id = p_visitor);

  if p_value = 0 then
    delete from fb.votes o where o.item_id = p_item and o.visitor_id = p_visitor;
  else
    if not existed and h is not null and (
         (select count(*) from fb.votes o
           where o.item_id = p_item and o.ip_hash = h and o.updated_at > now() - interval '1 day') >= 5
      or (select count(*) from fb.votes o
           where o.ip_hash = h and o.updated_at > now() - interval '1 hour') >= 60) then
      raise exception 'Too many votes from your network. Please try again later.';
    end if;
    insert into fb.votes (item_id, visitor_id, value, ip_hash)
    values (p_item, p_visitor, p_value, h)
    on conflict (item_id, visitor_id) do update
      set value = excluded.value, updated_at = now();
  end if;

  return query
    select (select count(*) from fb.votes o where o.item_id = p_item and o.value = 1),
           (select count(*) from fb.votes o where o.item_id = p_item and o.value = -1),
           (select o.value  from fb.votes o where o.item_id = p_item and o.visitor_id = p_visitor);
end $$;

-- Public thread. Hidden/removed/deleted comments are returned only when they
-- still have visible replies, and then without author or text (placeholder).
create or replace function public.get_comments(p_item text)
returns table (id bigint, parent_id bigint, body text, status text, author_name text,
               author_avatar text, is_official boolean, is_mine boolean,
               created_at timestamptz, edited_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with recursive shown as (
    select c.id, c.parent_id from fb.comments c
     where c.item_id = p_item and c.status = 'visible'
    union
    select c.id, c.parent_id from fb.comments c join shown s on c.id = s.parent_id
  )
  select c.id,
         c.parent_id,
         case when c.status = 'visible' then c.body end,
         c.status,
         case when c.status <> 'visible' then null
              when c.as_official then 'OTS Ullu'
              else p.display_name end,
         case when c.status = 'visible' and not c.as_official then p.avatar_url end,
         c.status = 'visible' and c.as_official,
         c.author_id is not null and c.author_id = auth.uid(),
         c.created_at,
         case when c.status = 'visible' then c.edited_at end
    from fb.comments c
    join (select distinct s.id from shown s) x on x.id = c.id
    left join fb.profiles p on p.id = c.author_id
   order by c.created_at
   limit 1000
$$;

-- ── PUBLIC API: signed-in commenters ───────────────────────────────

create or replace function public.get_me()
returns table (id uuid, display_name text, avatar_url text, is_admin boolean, is_blocked boolean)
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles;
begin
  if auth.uid() is null then
    return;
  end if;
  me := fb.current_profile();
  return query select me.id, me.display_name, me.avatar_url, me.is_admin, me.is_blocked;
end $$;

create or replace function public.update_display_name(p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles := fb.current_profile();
  nm text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if char_length(nm) < 2 or char_length(nm) > 40 then
    raise exception 'Names must be 2 to 40 characters.';
  end if;
  if nm ~ '[[:cntrl:]<>]' or fb.has_link(nm) then
    raise exception 'Please choose a plain name without links or symbols.';
  end if;
  if not me.is_admin and lower(regexp_replace(nm, '[^A-Za-z]', '', 'g')) like '%otsullu%' then
    raise exception 'That name is reserved.';
  end if;
  update fb.profiles x set display_name = nm where x.id = me.id;
  return nm;
end $$;

create or replace function public.post_comment(p_item text, p_body text,
                                               p_parent bigint default null,
                                               p_as_official boolean default false,
                                               p_title text default null, p_url text default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  me     fb.profiles := fb.current_profile();
  b      text := btrim(coalesce(p_body, ''));
  new_id bigint;
begin
  perform fb.check_body(me, b);
  if coalesce(p_as_official, false) and not me.is_admin then
    raise exception 'Only OTS Ullu can post as OTS Ullu.';
  end if;
  perform fb.ensure_item(p_item, p_title, p_url);
  if p_parent is not null and not exists (
       select 1 from fb.comments c
        where c.id = p_parent and c.item_id = p_item and c.status = 'visible') then
    raise exception 'The comment you are replying to is no longer available.';
  end if;
  if not me.is_admin and (
       (select count(*) from fb.comments c
         where c.author_id = me.id and c.created_at > now() - interval '10 minutes') >= 5
    or (select count(*) from fb.comments c
         where c.author_id = me.id and c.created_at > now() - interval '1 day') >= 40) then
    raise exception 'You are commenting too quickly. Please wait a few minutes.';
  end if;

  insert into fb.comments (item_id, parent_id, author_id, as_official, body)
  values (p_item, p_parent, me.id, coalesce(p_as_official, false), b)
  returning id into new_id;
  insert into fb.comment_history (comment_id, action, body, actor_id)
  values (new_id, 'created', b, me.id);
  return new_id;
end $$;

create or replace function public.edit_comment(p_id bigint, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles := fb.current_profile();
  c  fb.comments;
  b  text := btrim(coalesce(p_body, ''));
begin
  select * into c from fb.comments x where x.id = p_id for update;
  if not found or c.author_id is distinct from me.id then
    raise exception 'You can only edit your own comments.';
  end if;
  if c.status <> 'visible' then
    raise exception 'This comment can no longer be edited.';
  end if;
  perform fb.check_body(me, b);
  if b = c.body then
    return;
  end if;
  insert into fb.comment_history (comment_id, action, body, actor_id)
  values (c.id, 'edited', c.body, me.id);
  update fb.comments x set body = b, edited_at = now() where x.id = c.id;
end $$;

-- Author delete = soft delete; the text stays in the archive for the admin.
create or replace function public.delete_comment(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles := fb.current_profile();
  c  fb.comments;
begin
  select * into c from fb.comments x where x.id = p_id for update;
  if not found or c.author_id is distinct from me.id then
    raise exception 'You can only delete your own comments.';
  end if;
  if c.status = 'deleted' then
    return;
  end if;
  insert into fb.comment_history (comment_id, action, body, actor_id)
  values (c.id, 'deleted', c.body, me.id);
  update fb.comments x set status = 'deleted' where x.id = c.id;
end $$;

-- ── ADMIN API (callable only by profiles with is_admin = true) ─────

create or replace function public.admin_list_comments(p_status text default null,
                                                      p_limit int default 100,
                                                      p_before bigint default null)
returns table (id bigint, item_id text, item_title text, item_url text, parent_id bigint,
               body text, status text, as_official boolean, author_id uuid, author_name text,
               author_email text, author_blocked boolean, created_at timestamptz,
               edited_at timestamptz, history_count bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform fb.require_admin();
  return query
    select c.id, c.item_id, i.title, i.url, c.parent_id, c.body, c.status, c.as_official,
           c.author_id, p.display_name, u.email::text, coalesce(p.is_blocked, false),
           c.created_at, c.edited_at,
           (select count(*) from fb.comment_history h where h.comment_id = c.id)
      from fb.comments c
      join fb.items i         on i.id = c.item_id
      left join fb.profiles p on p.id = c.author_id
      left join auth.users u  on u.id = c.author_id
     where (p_status is null or c.status = p_status)
       and (p_before is null or c.id < p_before)
     order by c.id desc
     limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

-- p_status: 'hidden' (reversible hide), 'removed' (moderator delete), 'visible' (restore).
create or replace function public.admin_set_comment_status(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles := fb.require_admin();
  c  fb.comments;
begin
  if p_status not in ('visible', 'hidden', 'removed') then
    raise exception 'Unknown status.';
  end if;
  select * into c from fb.comments x where x.id = p_id for update;
  if not found then
    raise exception 'Comment not found.';
  end if;
  if c.status = 'deleted' then
    raise exception 'This comment was deleted by its author.';
  end if;
  if c.status = p_status then
    return;
  end if;
  insert into fb.comment_history (comment_id, action, body, actor_id)
  values (c.id, case p_status when 'visible' then 'restored' else p_status end, c.body, me.id);
  update fb.comments x set status = p_status where x.id = c.id;
end $$;

create or replace function public.admin_comment_history(p_id bigint)
returns table (action text, body text, actor_name text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform fb.require_admin();
  return query
    select h.action, h.body, p.display_name, h.created_at
      from fb.comment_history h
      left join fb.profiles p on p.id = h.actor_id
     where h.comment_id = p_id
     order by h.created_at, h.id;
end $$;

create or replace function public.admin_set_blocked(p_user uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me fb.profiles := fb.require_admin();
begin
  if p_user = me.id then
    raise exception 'You cannot block yourself.';
  end if;
  update fb.profiles x set is_blocked = coalesce(p_blocked, false) where x.id = p_user;
end $$;

create or replace function public.admin_item_stats()
returns table (item_id text, kind text, title text, url text, views bigint, uniques bigint,
               up bigint, down bigint, comments bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform fb.require_admin();
  return query
    select i.id, i.kind, i.title, i.url,
           (select count(*)                     from fb.views v where v.item_id = i.id),
           (select count(distinct v.visitor_id) from fb.views v where v.item_id = i.id),
           (select count(*) from fb.votes o    where o.item_id = i.id and o.value = 1),
           (select count(*) from fb.votes o    where o.item_id = i.id and o.value = -1),
           (select count(*) from fb.comments c where c.item_id = i.id and c.status = 'visible')
      from fb.items i
     order by 5 desc
     limit 500;
end $$;

-- ── NOTIFICATION PAYLOAD (service role only — used by the email function) ──

create or replace function public.notify_payload(p_comment_id bigint) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
           'comment_id',   c.id,
           'body',         c.body,
           'created_at',   c.created_at,
           'is_reply',     c.parent_id is not null,
           'as_official',  c.as_official,
           'author_name',  p.display_name,
           'author_email', u.email,
           'item_id',      i.id,
           'item_title',   i.title,
           'item_url',     i.url,
           'parent_author', case when pc.as_official then 'OTS Ullu' else pp.display_name end,
           'parent_body',  pc.body)
    from fb.comments c
    join fb.items i          on i.id = c.item_id
    left join fb.profiles p  on p.id = c.author_id
    left join auth.users u   on u.id = c.author_id
    left join fb.comments pc on pc.id = c.parent_id
    left join fb.profiles pp on pp.id = pc.author_id
   where c.id = p_comment_id
$$;

-- ── PERMISSIONS ─────────────────────────────────────────────────────

revoke all on all functions in schema fb from public, anon, authenticated;

revoke all on function public.record_view(text, text, text, text)                         from public;
revoke all on function public.get_item_stats(text[], text)                                from public;
revoke all on function public.get_site_stats()                                            from public;
revoke all on function public.set_vote(text, text, int, text, text)                       from public;
revoke all on function public.get_comments(text)                                          from public;
revoke all on function public.get_me()                                                    from public;
revoke all on function public.update_display_name(text)                                   from public;
revoke all on function public.post_comment(text, text, bigint, boolean, text, text)       from public;
revoke all on function public.edit_comment(bigint, text)                                  from public;
revoke all on function public.delete_comment(bigint)                                      from public;
revoke all on function public.admin_list_comments(text, int, bigint)                      from public;
revoke all on function public.admin_set_comment_status(bigint, text)                      from public;
revoke all on function public.admin_comment_history(bigint)                               from public;
revoke all on function public.admin_set_blocked(uuid, boolean)                            from public;
revoke all on function public.admin_item_stats()                                          from public;
revoke all on function public.notify_payload(bigint)                         from public, anon, authenticated;

-- Anyone (signed in or not)
grant execute on function public.record_view(text, text, text, text)   to anon, authenticated;
grant execute on function public.get_item_stats(text[], text)          to anon, authenticated;
grant execute on function public.get_site_stats()                      to anon, authenticated;
grant execute on function public.set_vote(text, text, int, text, text) to anon, authenticated;
grant execute on function public.get_comments(text)                    to anon, authenticated;

-- Signed-in only (admin functions also check is_admin themselves)
revoke all on function public.get_me()                                              from anon;
revoke all on function public.update_display_name(text)                             from anon;
revoke all on function public.post_comment(text, text, bigint, boolean, text, text) from anon;
revoke all on function public.edit_comment(bigint, text)                            from anon;
revoke all on function public.delete_comment(bigint)                                from anon;
revoke all on function public.admin_list_comments(text, int, bigint)                from anon;
revoke all on function public.admin_set_comment_status(bigint, text)                from anon;
revoke all on function public.admin_comment_history(bigint)                         from anon;
revoke all on function public.admin_set_blocked(uuid, boolean)                      from anon;
revoke all on function public.admin_item_stats()                                    from anon;
grant execute on function public.get_me()                                              to authenticated;
grant execute on function public.update_display_name(text)                             to authenticated;
grant execute on function public.post_comment(text, text, bigint, boolean, text, text) to authenticated;
grant execute on function public.edit_comment(bigint, text)                            to authenticated;
grant execute on function public.delete_comment(bigint)                                to authenticated;
grant execute on function public.admin_list_comments(text, int, bigint)                to authenticated;
grant execute on function public.admin_set_comment_status(bigint, text)                to authenticated;
grant execute on function public.admin_comment_history(bigint)                         to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean)                      to authenticated;
grant execute on function public.admin_item_stats()                                    to authenticated;

grant execute on function public.notify_payload(bigint) to service_role;
