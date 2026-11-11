-- =====================================================================
-- Шинэчлэл 2026-11-12. Supabase → SQL Editor → New query → бүтнээр нь Run.
-- Зөвхөн шинэ хүснэгт, багана, эрх нэмнэ (одоо байгаа өгөгдөлд хүрэхгүй).
-- Дахин ажиллуулж болно.
--   1. Сонгууль: намууд, нэр дэвшигчид
--   2. Үзэлтийн өдөр тутмын статистик
--   3. Зураг/бичлэгийн байршил (layout), дараалал
-- =====================================================================

-- 1. Сонгууль --------------------------------------------------------
create table if not exists public.parties (
  id           bigint primary key,
  name         varchar(150) not null,
  short_name   varchar(30),
  logo_url     varchar(500),
  color        varchar(9),
  founded_on   date,
  chairman     varchar(100),
  description  text,
  website      varchar(300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.candidates (
  id               bigint primary key,
  full_name        varchar(100) not null,
  photo_url        varchar(500),
  birth_year       int check (birth_year is null or birth_year between 1900 and 2100),
  party_id         bigint references public.parties (id) on delete set null,
  district         varchar(150),          -- тойрог
  position         varchar(150),          -- одоогийн албан тушаал
  education        jsonb not null default '[]'::jsonb,         -- [{school, degree, year}]
  election_history jsonb not null default '[]'::jsonb,         -- [{year, election, district, party, result, votes}]
  bio              text,
  featured         boolean not null default false,              -- «Онцлох нэр дэвшигч»
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists candidates_party_idx on public.candidates (party_id);

alter table public.parties    enable row level security;
alter table public.candidates enable row level security;

drop policy if exists parties_select on public.parties;
create policy parties_select on public.parties for select using (true);
drop policy if exists parties_write on public.parties;
create policy parties_write on public.parties for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates for select using (true);
drop policy if exists candidates_write on public.candidates;
create policy candidates_write on public.candidates for all using (public.is_staff()) with check (public.is_staff());

grant select on public.parties, public.candidates to anon, authenticated;
grant insert, update, delete on public.parties, public.candidates to authenticated;

-- 2. Үзэлтийн өдөр тутмын статистик ------------------------------------
create table if not exists public.news_views (
  news_id  bigint not null references public.news (id) on delete cascade,
  day      date   not null,
  views    int    not null default 0,
  primary key (news_id, day)
);
alter table public.news_views enable row level security;

-- Админ бүгдийг, сэтгүүлч зөвхөн өөрийн мэдээний статистикийг харна
drop policy if exists news_views_select on public.news_views;
create policy news_views_select on public.news_views for select
  using (public.my_role() = 'admin'
         or exists (select 1 from public.news n
                    where n.id = news_id and n.journalist_id = public.my_profile_id()));
grant select on public.news_views to authenticated;

-- Үзэлт бүрийг нийт тоо болон тухайн өдрийн (Улаанбаатарын цагаар) тоонд нэмнэ
create or replace function public.increment_view(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.news set views = views + 1 where id = p_id and status = 'published';
  if found then
    insert into public.news_views (news_id, day, views)
    values (p_id, (now() at time zone 'Asia/Ulaanbaatar')::date, 1)
    on conflict (news_id, day) do update set views = public.news_views.views + 1;
  end if;
end;
$$;
grant execute on function public.increment_view(bigint) to anon, authenticated;

-- 3. Зураг/бичлэгийн байршил, дараалал ---------------------------------
alter table public.news  add column if not exists media_layout varchar(20);
alter table public.media add column if not exists position int;

-- Дарааллыг засах эрх (мэдээний эзэн эсвэл редактор/админ)
drop policy if exists media_update on public.media;
create policy media_update on public.media for update
  using (exists (select 1 from public.news n where n.id = news_id
                 and (n.journalist_id = public.my_profile_id() or public.is_staff())))
  with check (exists (select 1 from public.news n where n.id = news_id
                 and (n.journalist_id = public.my_profile_id() or public.is_staff())));

notify pgrst, 'reload schema';
