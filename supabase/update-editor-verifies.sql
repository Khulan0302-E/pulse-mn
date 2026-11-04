-- =====================================================================
-- Шинэчлэл: сэтгүүлчийн баримтыг Админ биш Редактор баталгаажуулна.
-- schema.sql-ийг өмнө нь ажиллуулсан бол SQL Editor дээр зөвхөн энэ файлыг Run.
-- =====================================================================

drop policy if exists verifications_update on public.verifications;
create policy verifications_update on public.verifications for update
  using (public.my_role() = 'editor') with check (public.my_role() = 'editor');

drop policy if exists "pulse docs read" on storage.objects;
create policy "pulse docs read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() = 'editor'));
