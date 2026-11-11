-- =====================================================================
-- Шинэчлэл 2026-11-11. schema.sql-ийг өмнө нь ажиллуулсан бол
-- Supabase → SQL Editor → New query → энэ файлыг бүтнээр нь хуулж Run.
-- Дахин ажиллуулж болно.
--   1. Сэтгүүлчийн баримтыг Редактор биш Админ баталгаажуулна
--   2. «Онцлох мэдээ» тэмдэглэх багана
--   3. Редактор, Админ мэдээ устгах эрх
-- =====================================================================

-- 1. Админ баталгаажуулна
drop policy if exists verifications_update on public.verifications;
create policy verifications_update on public.verifications for update
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "pulse docs read" on storage.objects;
create policy "pulse docs read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() = 'admin'));

-- 2. Онцлох мэдээ
alter table public.news add column if not exists featured boolean not null default false;

-- 3. Мэдээ устгах (media, decisions, news_versions нь cascade-аар хамт устна;
--    notifications.news_id нь null болно)
drop policy if exists news_delete on public.news;
create policy news_delete on public.news for delete using (public.is_staff());

drop policy if exists decisions_delete on public.decisions;
create policy decisions_delete on public.decisions for delete using (public.is_staff());

drop policy if exists versions_delete on public.news_versions;
create policy versions_delete on public.news_versions for delete
  using (user_id = public.my_profile_id() or public.is_staff());

-- Устгасан мэдээний зураг, бичлэгийг Storage-оос цэвэрлэх
drop policy if exists "pulse media delete" on storage.objects;
create policy "pulse media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

-- Data API-ийн схемийн кэшийг шинэчлэх (шинэ багана шууд харагдана)
notify pgrst, 'reload schema';
