-- =====================================================================
-- Товлосон нийтлэлийг минут тутам автоматаар нийтлэх (FR-EDT-004)
-- Эхлээд: Supabase → Database → Extensions → «pg_cron»-ийг асаана.
-- Дараа нь SQL Editor дээр энэ файлыг Run.
-- =====================================================================

select cron.unschedule('pulse-publish-due')
 where exists (select 1 from cron.job where jobname = 'pulse-publish-due');

select cron.schedule('pulse-publish-due', '* * * * *', $$ select public.publish_due_news(); $$);
