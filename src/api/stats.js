// Мэдээний үзэлтийн өдөр тутмын статистик.
// Админ бүх мэдээг, сэтгүүлч зөвхөн өөрийн мэдээг харна (сервер дээр RLS шалгана).
import { getDb, isRemote } from '../lib/db';
import { supabase } from '../lib/supabase';
import { ROLES, STATUS } from '../lib/constants';
import { AppError, assertRole } from './auth';

/** Улаанбаатарын цагаар YYYY-MM-DD */
export const ubDay = (d = new Date()) =>
  new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

export function dayRange(days) {
  const out = [];
  const today = new Date(`${ubDay()}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) out.push(new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10));
  return out;
}

/** Хэрэглэгчийн харах эрхтэй мэдээнүүд */
export function statsNews(user) {
  assertRole(user, ROLES.ADMIN, ROLES.JOURNALIST);
  return getDb()
    .news.filter((n) => n.status === STATUS.PUBLISHED && (user.role === ROLES.ADMIN || n.journalistId === user.id))
    .sort((a, b) => (b.views || 0) - (a.views || 0));
}

/** [{newsId, day, views}] — сүүлийн `days` хоногийн */
export async function loadDailyViews(user, days) {
  assertRole(user, ROLES.ADMIN, ROLES.JOURNALIST);
  const from = dayRange(days)[0];
  const allowed = new Set(statsNews(user).map((n) => n.id));
  if (!isRemote) {
    return (getDb().viewsDaily || []).filter((r) => r.day >= from && allowed.has(r.newsId));
  }
  const { data, error } = await supabase.from('news_views').select('news_id, day, views').gte('day', from).limit(20000);
  if (error) {
    if (/news_views|schema cache|does not exist/i.test(error.message)) {
      throw new AppError('Статистикийн хүснэгт үүсээгүй байна. supabase/update-2026-11-12.sql-ийг ажиллуулна уу.');
    }
    throw new AppError(error.message);
  }
  return (data || []).map((r) => ({ newsId: r.news_id, day: r.day, views: r.views })).filter((r) => allowed.has(r.newsId));
}
