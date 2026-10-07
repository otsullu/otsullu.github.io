-- ═══════════════════════════════════════════════════════════════════
-- 2026-10-06 — views count once per visitor per day; uniques admin-only
-- Run once in Supabase → SQL Editor, AFTER the matching site code is live
-- (the old page code expects `uniques` from get_item_stats / get_site_stats).
-- schema.sql already contains these changes for fresh installs.
-- ═══════════════════════════════════════════════════════════════════

create or replace function fb.pacific_day_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'
$$;
revoke all on function fb.pacific_day_start() from public, anon, authenticated;

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
  -- One view per visitor per item per calendar day (Pacific time).
  if exists (select 1 from fb.views v
              where v.item_id = p_item and v.visitor_id = p_visitor
                and v.created_at >= fb.pacific_day_start()) then
    return;
  end if;
  -- Crude flood guard per network.
  if h is not null and (select count(*) from fb.views v
                         where v.ip_hash = h and v.created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  insert into fb.views (item_id, visitor_id, ip_hash) values (p_item, p_visitor, h);
end $$;

drop function if exists public.get_item_stats(text[], text);
create function public.get_item_stats(p_items text[], p_visitor text default null)
returns table (item_id text, views bigint, up bigint, down bigint,
               comments bigint, my_vote smallint)
language sql stable security definer set search_path = '' as $$
  select i.id,
         (select count(*) from fb.views v    where v.item_id = i.id),
         (select count(*) from fb.votes o    where o.item_id = i.id and o.value = 1),
         (select count(*) from fb.votes o    where o.item_id = i.id and o.value = -1),
         (select count(*) from fb.comments c where c.item_id = i.id and c.status = 'visible'),
         (select o.value  from fb.votes o    where o.item_id = i.id and o.visitor_id = p_visitor)
    from unnest(p_items[1:200]) as i (id)
$$;

drop function if exists public.get_site_stats();
create function public.get_site_stats()
returns table (views bigint)
language sql stable security definer set search_path = '' as $$
  select count(*) from fb.views v where v.item_id like 'page:%'
$$;

create or replace function public.admin_site_stats()
returns table (views bigint, uniques bigint)
language plpgsql security definer set search_path = '' as $$
begin
  perform fb.require_admin();
  return query
    select count(*), count(distinct v.visitor_id) from fb.views v where v.item_id like 'page:%';
end $$;

revoke all on function public.get_item_stats(text[], text) from public;
revoke all on function public.get_site_stats()             from public;
revoke all on function public.admin_site_stats()           from public, anon;
grant execute on function public.get_item_stats(text[], text) to anon, authenticated;
grant execute on function public.get_site_stats()             to anon, authenticated;
grant execute on function public.admin_site_stats()           to authenticated;

-- Ask the API to pick up the new function signatures right away.
notify pgrst, 'reload schema';
