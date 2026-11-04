-- =====================================================================
-- Анхны админ, редакторыг томилох
-- 1) Сайт дээр ердийн байдлаар «Иргэн»-ээр бүртгүүлнэ.
-- 2) Доорх и-мэйлийг өөрийнхөөр сольж SQL Editor дээр Run.
-- Үүнээс хойш бусад хэрэглэгчийн эрхийг сайтын Админ → Хэрэглэгчид хэсгээс өөрчилнө.
-- =====================================================================

update public.profiles set role = 'admin'  where email = lower('admin@example.com');
update public.profiles set role = 'editor' where email = lower('editor@example.com');

select id, full_name, email, role, status from public.profiles order by id;
