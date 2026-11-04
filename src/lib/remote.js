// Supabase ↔ апп-ын өгөгдлийн хоорондын хөрвүүлэлт.
// loadRemote(): бүх хүснэгтийг (RLS-ийн зөвшөөрсөн хүрээнд) уншина.
// pushDiff(prev, next): mutate()-ийн өмнөх ба дараах төлвийг харьцуулж,
//   өөрчлөгдсөн мөрийг л insert / update / delete хийнэ.
import { supabase } from './supabase';

const KEY_TO_COL = { sizeMB: 'size_mb' };
const COL_TO_KEY = { size_mb: 'sizeMB' };
const toSnake = (k) => KEY_TO_COL[k] || k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamel = (k) => COL_TO_KEY[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export const toRow = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));
export const fromRow = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [toCamel(k), v]));

// Апп дахь түлхүүр → Supabase хүснэгт. Дараалал нь FK-ийн дарааллыг хадгална.
const TABLES = [
  { key: 'users', table: 'profiles', insert: false, del: false, cols: ['role', 'status'] },
  { key: 'verifications', table: 'verifications' },
  { key: 'news', table: 'news' },
  { key: 'media', table: 'media' },
  { key: 'decisions', table: 'decisions' },
  { key: 'versions', table: 'news_versions' },
  { key: 'notifications', table: 'notifications', del: false },
  { key: 'external', table: 'external_data' },
  { key: 'logs', table: 'activity_logs', del: false, cols: [] },
];

const CONSTRAINTS = {
  news_consent_required: 'Зохиогчийн эрх, ашиглалтын лицензийн зөвшөөрөл шаардлагатай.',
  news_source_required: 'Нийтлэл бүр эх сурвалжтай байна (NFR-TRN-002).',
  decisions_comment_required: 'Буцаах, татгалзах шийдвэрт тайлбар заавал бичнэ.',
};

export function translateError(error) {
  const msg = error?.message || String(error || 'Тодорхойгүй алдаа');
  if (error?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Танд энэ үйлдлийг хийх эрх байхгүй байна.';
  }
  if (error?.code === '23514') {
    const name = msg.match(/constraint "([^"]+)"/)?.[1];
    return CONSTRAINTS[name] || `Өгөгдлийн дүрэм зөрчигдлөө (${name || msg}).`;
  }
  if (error?.code === '23505') return 'Ийм мэдээлэл аль хэдийн бүртгэгдсэн байна.';
  if (error?.code === 'PGRST205' || error?.code === '42P01' || /does not exist|schema cache/i.test(msg)) {
    return 'Supabase дээр хүснэгт олдсонгүй. supabase/schema.sql-ийг SQL Editor дээр ажиллуулна уу.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу.';
  }
  return msg;
}

const fail = (error) => {
  throw new Error(translateError(error));
};

async function rows(query) {
  const { data, error } = await query;
  if (error) fail(error);
  return (data || []).map(fromRow);
}

export async function loadRemote() {
  const [
    authors, profiles, verifications, categories, locations, news, media,
    decisions, versions, notifications, external, settings, logs,
  ] = await Promise.all([
    rows(supabase.from('authors').select('*')),
    rows(supabase.from('profiles').select('*')),
    rows(supabase.from('verifications').select('*').order('id')),
    rows(supabase.from('categories').select('*').order('id')),
    rows(supabase.from('locations').select('*').order('id')),
    rows(supabase.from('news').select('*')),
    rows(supabase.from('media').select('*').order('id')),
    rows(supabase.from('decisions').select('*').order('id')),
    rows(supabase.from('news_versions').select('*').order('id')),
    rows(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200)),
    rows(supabase.from('external_data').select('*').order('id')),
    rows(supabase.from('app_settings').select('*').eq('id', 1)),
    rows(supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500)),
  ]);

  if (!settings[0]) throw new Error(translateError({ code: 'PGRST205' }));

  // Нийтэд харагдах зохиогчийн мэдээлэл + (эрх байвал) бүрэн профайл
  const users = new Map();
  authors.forEach((a) => users.set(a.id, { email: '', phone: '', ...a }));
  profiles.forEach((p) => users.set(p.id, { ...(users.get(p.id) || {}), ...p }));

  return {
    schema: 1,
    users: [...users.values()].sort((a, b) => a.id - b.id),
    verifications, categories, locations, news, media, decisions, versions,
    notifications, external, logs,
    settings: settings[0].data,
    seq: {},
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function pushDiff(prev, next) {
  const deletes = [];
  for (const t of TABLES) {
    const before = new Map((prev[t.key] || []).map((r) => [r.id, r]));
    const after = new Map((next[t.key] || []).map((r) => [r.id, r]));
    const inserts = [];

    for (const [id, row] of after) {
      const old = before.get(id);
      if (!old) {
        if (t.insert !== false) inserts.push(toRow(row));
        continue;
      }
      const changed = {};
      Object.keys(row).forEach((k) => {
        if ((!t.cols || t.cols.includes(k)) && !same(row[k], old[k])) changed[k] = row[k];
      });
      if (!Object.keys(changed).length) continue;
      const { data, error } = await supabase.from(t.table).update(toRow(changed)).eq('id', id).select('id');
      if (error) fail(error);
      if (!data?.length) fail({ code: '42501' }); // RLS-ээр 0 мөр шинэчлэгдсэн
    }

    if (inserts.length) {
      const { error } = await supabase.from(t.table).insert(inserts);
      if (error) fail(error);
    }
    if (t.del !== false) {
      for (const id of before.keys()) if (!after.has(id)) deletes.push([t.table, id]);
    }
  }

  for (const [table, id] of deletes.reverse()) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) fail(error);
  }

  if (!same(prev.settings, next.settings)) {
    const { data, error } = await supabase.from('app_settings').update({ data: next.settings }).eq('id', 1).select('id');
    if (error) fail(error);
    if (!data?.length) fail({ code: '42501' });
  }
}

/** Админ биш хэрэглэгч гадаад API-аас татсан шинэ өгөгдлөө серверийн хуучин хуулбараар дарахгүй */
export function keepFresherExternal(prev, next) {
  if (!prev?.settings) return;
  ['weather', 'fx'].forEach((type) => {
    const p = prev.settings[type];
    const n = next.settings[type];
    if (p?.lastAttemptAt && (!n?.lastAttemptAt || p.lastAttemptAt > n.lastAttemptAt)) {
      next.settings[type] = {
        ...n,
        lastAttemptAt: p.lastAttemptAt,
        lastSuccessAt: p.lastSuccessAt,
        lastError: p.lastError,
        lastErrorAt: p.lastErrorAt,
      };
      next.external = next.external.filter((r) => r.type !== type).concat(prev.external.filter((r) => r.type === type));
    }
  });
}
