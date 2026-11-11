// Контент, редакцийн хяналт, нийтлэл
// FR-CNT-001, FR-CNT-003, FR-CNT-004, FR-EDT-004, FR-PUB-003, FR-PUB-004
// NFR-TRN-002, NFR-DAT-001, NFR-SEC-007
import { getDb, mutate, nextId, now, addLog, notify, notifyRole, isRemote, getCurrentUser } from '../lib/db';
import { uploadFile, getFileBlob, isLocalFile } from '../lib/files';
import { supabase } from '../lib/supabase';
import { STATUS, ROLES, ROLE_LABELS, DECISION, DECISION_LABELS, LIMITS, MAX_MEDIA_PER_NEWS } from '../lib/constants';
import { AppError, assertRole, isVerifiedJournalist } from './auth';

// ---------- Унших ----------
export function listPublished(categoryId) {
  return getDb()
    .news.filter((n) => n.status === STATUS.PUBLISHED && (!categoryId || n.categoryId === categoryId))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function getPublished(id) {
  return getDb().news.find((n) => n.id === id && n.status === STATUS.PUBLISHED) || null;
}

export const mediaFor = (db, newsId) => db.media.filter((m) => m.newsId === newsId);
export const decisionsFor = (db, newsId) =>
  db.decisions.filter((d) => d.newsId === newsId).sort((a, b) => b.id - a.id);
export const versionsFor = (db, newsId) =>
  db.versions.filter((v) => v.newsId === newsId).sort((a, b) => b.version - a.version || b.id - a.id);
export const locationById = (db, id) => db.locations.find((l) => l.id === Number(id)) || null;
export const userById = (db, id) => db.users.find((u) => u.id === id) || null;
export const categoryName = (db, id) => db.categories.find((c) => c.id === Number(id))?.name || '—';
export function locationLabel(db, id) {
  const l = locationById(db, id);
  return l ? `${l.aimag}, ${l.sum}` : '—';
}

/** FR-CNT-003: сэтгүүлч зөвхөн өөрийн ноорогийг харна */
export function myNews(user, { status = '', from = '', to = '' } = {}) {
  assertRole(user, ROLES.JOURNALIST);
  const fromT = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const toT = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
  return getDb()
    .news.filter((n) => n.journalistId === user.id)
    .filter((n) => !status || n.status === status)
    .filter((n) => {
      const t = new Date(n.submittedAt || n.createdAt).getTime();
      return t >= fromT && t <= toT;
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function newsDetail(user, id) {
  const db = getDb();
  const news = db.news.find((n) => n.id === id);
  if (!news) return null;
  const canSee =
    (user?.role === ROLES.JOURNALIST && news.journalistId === user.id) ||
    user?.role === ROLES.EDITOR ||
    user?.role === ROLES.ADMIN;
  if (!canSee) throw new AppError('Танд энэ мэдээг харах эрх байхгүй байна.');
  return { news, media: mediaFor(db, id), decisions: decisionsFor(db, id), versions: versionsFor(db, id) };
}

const viewed = new Set();
export function incrementView(id) {
  if (viewed.has(id)) return;
  viewed.add(id);
  const bump = (d) => {
    const n = d.news.find((x) => x.id === id);
    if (n) n.views = (n.views || 0) + 1;
    if (!isRemote && n) {
      // Демо горимд өдөр тутмын статистикийг браузерт хадгална (Supabase-д increment_view бичнэ)
      const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      d.viewsDaily ||= [];
      const row = d.viewsDaily.find((r) => r.newsId === id && r.day === day);
      if (row) row.views += 1;
      else d.viewsDaily.push({ newsId: id, day, views: 1 });
    }
  };
  if (isRemote) {
    // Иргэн мэдээг засах эрхгүй тул сервер талын функцээр тоолно
    supabase.rpc('increment_view', { p_id: id }).then(() => {}, () => {});
    mutate(bump, { sync: false }).catch(() => {});
    return;
  }
  mutate(bump).catch(() => {}); // үзэлт тоолох нь чухал биш
}

// ---------- Шалгалт ----------
export function validateNewsData(db, data, { forSubmit }) {
  const errors = {};
  const title = (data.title || '').trim();
  if (!title) errors.title = 'Гарчгаа оруулна уу.';
  else if (title.length > LIMITS.title) errors.title = `Гарчиг ${LIMITS.title} тэмдэгтээс хэтрэхгүй.`;
  if (!(data.content || '').trim()) errors.content = 'Агуулгаа оруулна уу.';
  if (!db.categories.some((c) => c.id === Number(data.categoryId))) errors.categoryId = 'Мэдээний төрлийг зөв сонгоно уу.';
  if (!locationById(db, data.locationId)) errors.locationId = 'Аймаг, сумаа заавал сонгоно уу.';
  if ((data.source || '').length > LIMITS.source) errors.source = `Эх сурвалж ${LIMITS.source} тэмдэгтээс хэтрэхгүй.`;
  if (forSubmit) {
    if (!data.copyrightConsent) errors.copyrightConsent = 'Зохиогчийн эрх, ашиглалтын лицензийн зөвшөөрлийг баталгаажуулна уу.';
    if (!(data.source || '').trim() && !data.sourceConfidential) {
      errors.source = 'Эх сурвалжаа бичих эсвэл редакцийн бодлогоор нууцлахыг сонгоно уу.';
    }
  }
  if (Object.keys(errors).length) throw new AppError('Мэдээллээ шалгана уу — алдаатай талбар байна.', errors);
}

/** INT-004: файлыг FileStorage-д байршуулж fileURL авна. Аль хэдийн байршсан бол алгасна. */
export async function prepareFiles(items = []) {
  const out = [];
  for (const it of items) {
    if (it.fileUrl) {
      // Офлайн үед браузерт түр хадгалсан файлыг холболт сэргэсний дараа Supabase руу байршуулна
      if (isRemote && navigator.onLine && isLocalFile(it.fileUrl)) {
        try {
          const blob = await getFileBlob(it.fileUrl);
          out.push({ ...it, fileUrl: await uploadFile(blob, 'media', it.name) });
        } catch {
          throw new AppError('Түр хадгалсан файлыг байршуулж чадсангүй.');
        }
        continue;
      }
      out.push(it);
      continue;
    }
    try {
      const fileUrl = await uploadFile(it.file, 'media');
      out.push({ type: it.type, name: it.file.name, sizeMB: it.sizeMB, fileUrl });
    } catch {
      throw new AppError('Файл хадгалж чадсангүй. Дахин оролдоно уу.');
    }
  }
  return out;
}

function snapshot(db, n) {
  return {
    title: n.title,
    content: n.content,
    categoryId: n.categoryId,
    locationId: n.locationId,
    source: n.source,
    sourceConfidential: n.sourceConfidential,
    media: mediaFor(db, n.id).map((m) => ({ name: m.name, type: m.type })),
  };
}

function applyFields(n, data) {
  n.title = data.title.trim();
  n.content = data.content.trim();
  n.categoryId = Number(data.categoryId);
  n.locationId = Number(data.locationId);
  n.source = (data.source || '').trim();
  n.sourceConfidential = Boolean(data.sourceConfidential);
  if ('copyrightConsent' in data) n.copyrightConsent = Boolean(data.copyrightConsent);
}

function applyMedia(db, newsId, uploaded, removeIds = []) {
  db.media = db.media.filter((m) => !(m.newsId === newsId && removeIds.includes(m.id)));
  uploaded.forEach((f) =>
    db.media.push({ id: nextId(db, 'media'), newsId, type: f.type, name: f.name, fileUrl: f.fileUrl, sizeMB: f.sizeMB }),
  );
  if (mediaFor(db, newsId).length > MAX_MEDIA_PER_NEWS) {
    throw new AppError(`Нэг мэдээнд ${MAX_MEDIA_PER_NEWS}-аас ихгүй файл хавсаргана.`);
  }
}

function pushVersion(db, n, userId) {
  db.versions.push({ id: nextId(db, 'versions'), newsId: n.id, version: n.version, userId, createdAt: now(), snapshot: snapshot(db, n) });
}

function ensureJournalist(user) {
  assertRole(user, ROLES.JOURNALIST);
  if (!isVerifiedJournalist(getDb(), user)) {
    throw new AppError('Таны сэтгүүлчийн бүртгэл баталгаажаагүй тул ноорог оруулах боломжгүй.');
  }
}

// ---------- Сэтгүүлч ----------
/** FR-CNT-001: ноорог үүсгэх (submit=true бол редакторт илгээнэ) */
export async function createNews(user, data, { submit = false } = {}) {
  ensureJournalist(user);
  validateNewsData(getDb(), data, { forSubmit: submit });
  const uploaded = await prepareFiles(data.newFiles);
  return mutate((d) => {
    const id = nextId(d, 'news');
    const n = {
      id, journalistId: user.id, status: submit ? STATUS.REVIEW : STATUS.DRAFT, version: 1,
      createdAt: now(), updatedAt: now(), submittedAt: submit ? now() : null,
      scheduledAt: null, publishedAt: null, views: 0,
    };
    applyFields(n, data);
    d.news.push(n);
    applyMedia(d, id, uploaded);
    pushVersion(d, n, user.id);
    if (submit) notifyRole(d, ROLES.EDITOR, `Шинэ ноорог хянуулахаар ирлээ: «${n.title}».`, id);
    addLog(d, user.id, submit ? 'Ноорог илгээсэн' : 'Ноорог үүсгэсэн', `Мэдээ #${id}`);
    return id;
  });
}

/** Ноорог төлөвтэй мэдээг засах / илгээх */
export async function updateDraft(user, id, data, { submit = false } = {}) {
  ensureJournalist(user);
  const existing = getDb().news.find((n) => n.id === id && n.journalistId === user.id);
  if (!existing) throw new AppError('Ноорог олдсонгүй.');
  if (existing.status !== STATUS.DRAFT) throw new AppError('Зөвхөн «Ноорог» төлөвтэй мэдээг ингэж засна.');
  validateNewsData(getDb(), data, { forSubmit: submit });
  const uploaded = await prepareFiles(data.newFiles);
  return mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    applyFields(n, data);
    applyMedia(d, id, uploaded, data.removeMediaIds);
    n.updatedAt = now();
    if (submit) {
      n.status = STATUS.REVIEW;
      n.submittedAt = now();
      notifyRole(d, ROLES.EDITOR, `Шинэ ноорог хянуулахаар ирлээ: «${n.title}».`, id);
    }
    // Илгээхээс өмнөх засварууд нэг хувилбарт багтана
    d.versions = d.versions.filter((v) => !(v.newsId === id && v.version === n.version));
    pushVersion(d, n, user.id);
    addLog(d, user.id, submit ? 'Ноорог илгээсэн' : 'Ноорог зассан', `Мэдээ #${id}`);
    return id;
  });
}

function sameContent(n, data) {
  return (
    n.title === (data.title || '').trim() &&
    n.content === (data.content || '').trim() &&
    n.categoryId === Number(data.categoryId) &&
    n.locationId === Number(data.locationId) &&
    (n.source || '') === (data.source || '').trim() &&
    Boolean(n.sourceConfidential) === Boolean(data.sourceConfidential) &&
    !(data.newFiles || []).length &&
    !(data.removeMediaIds || []).length
  );
}

/** FR-CNT-004: буцаагдсан ноорогийг засаж дахин илгээх */
export async function resubmitNews(user, id, data, { force = false } = {}) {
  ensureJournalist(user);
  const existing = getDb().news.find((n) => n.id === id && n.journalistId === user.id);
  if (!existing) throw new AppError('Ноорог олдсонгүй.');
  if (existing.status !== STATUS.RETURNED) {
    throw new AppError('Зөвхөн «Буцаагдсан» төлөвтэй ноорогийг засаж дахин илгээнэ.');
  }
  validateNewsData(getDb(), data, { forSubmit: true });
  if (!force && sameContent(existing, data)) {
    throw new AppError('Агуулга өөрчлөгдөөгүй байна.', null, 'UNCHANGED');
  }
  const uploaded = await prepareFiles(data.newFiles);
  return mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    applyFields(n, data);
    applyMedia(d, id, uploaded, data.removeMediaIds);
    n.version += 1;
    n.status = STATUS.REVIEW;
    n.submittedAt = now();
    n.updatedAt = now();
    pushVersion(d, n, user.id);
    notifyRole(d, ROLES.EDITOR, `Буцаагдсан ноорог засварлагдаж дахин ирлээ (хувилбар ${n.version}): «${n.title}».`, id);
    addLog(d, user.id, 'Засаж дахин илгээсэн', `Мэдээ #${id} v${n.version}`);
    return id;
  });
}

/** Ноорог төлөвтэй мэдээг шууд илгээх */
export function submitDraft(user, id) {
  const n = getDb().news.find((x) => x.id === id && x.journalistId === user.id);
  if (!n) throw new AppError('Ноорог олдсонгүй.');
  return updateDraft(user, id, { ...n, newFiles: [], removeMediaIds: [] }, { submit: true });
}

/** NFR-PERF-002: түр хадгалсан хүсэлтийг дахин илгээх */
export async function processOutboxItem(item) {
  const user = getDb().users.find((u) => u.id === item.userId);
  if (!user) throw new AppError('Хэрэглэгч олдсонгүй.');
  if (item.kind === 'create') return createNews(user, item.data, { submit: item.submit });
  if (item.kind === 'update') return updateDraft(user, item.newsId, item.data, { submit: item.submit });
  if (item.kind === 'resubmit') return resubmitNews(user, item.newsId, item.data, { force: true });
  throw new AppError('Үл мэдэгдэх хүсэлт.');
}

// ---------- Редактор ----------
export function editorList(user, status) {
  assertRole(user, ROLES.EDITOR);
  const key = status === STATUS.SCHEDULED ? 'scheduledAt' : status === STATUS.PUBLISHED ? 'publishedAt' : 'submittedAt';
  const list = getDb().news.filter((n) => n.status === status);
  return list.sort((a, b) =>
    status === STATUS.REVIEW || status === STATUS.SCHEDULED
      ? new Date(a[key]) - new Date(b[key])
      : new Date(b[key]) - new Date(a[key]),
  );
}

/** FR-EDT-004: шийдвэр гаргах, тайлбар өгөх, нийтлэх/товлох */
export async function decide(user, id, { decision, comment = '', publishMode = 'now', scheduledAt = null, checks = {}, featured = false }) {
  assertRole(user, ROLES.EDITOR);
  const text = comment.trim();
  if (!Object.values(DECISION).includes(decision)) throw new AppError('Шийдвэрээ сонгоно уу.');
  if (decision !== DECISION.APPROVE && !text) {
    throw new AppError('Буцаах, татгалзах шийдвэрт тайлбар заавал бичнэ.', { comment: 'Тайлбар заавал.' });
  }
  if (text.length > LIMITS.comment) throw new AppError(`Тайлбар ${LIMITS.comment} тэмдэгтээс хэтрэхгүй.`);
  let when = null;
  if (decision === DECISION.APPROVE) {
    if (!checks.facts || !checks.legal) {
      throw new AppError('Нийтлэхийн өмнө баримт тулгалт, хууль зүйн эрсдэлийн шалгалтыг баталгаажуулна уу.', { checks: 'Шалгалтыг тэмдэглэнэ үү.' });
    }
    if (publishMode === 'schedule') {
      if (!scheduledAt) throw new AppError('Нийтлэх огноо, цагаа сонгоно уу.', { scheduledAt: 'Огноо сонгоно уу.' });
      when = new Date(scheduledAt);
      if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        throw new AppError('Товлох огноо өнгөрсөн байж болохгүй.', { scheduledAt: 'Ирээдүйн огноо сонгоно уу.' });
      }
    }
  }

  return mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    if (!n || n.status !== STATUS.REVIEW) throw new AppError('Энэ ноорог хянагдах төлөвт байхгүй байна.');
    if (decision === DECISION.APPROVE && !n.source && !n.sourceConfidential) {
      throw new AppError('Нийтлэл бүр эх сурвалжтай байна (NFR-TRN-002). Сэтгүүлчид буцааж эх сурвалж нэмүүлнэ үү.');
    }
    d.decisions.push({ id: nextId(d, 'decisions'), newsId: id, version: n.version, editorId: user.id, decision, comment: text, checks, createdAt: now() });
    n.updatedAt = now();
    let msg = `Редактор таны «${n.title}» ноорогийг ${DECISION_LABELS[decision].toLowerCase()}.`;
    if (decision === DECISION.RETURN) n.status = STATUS.RETURNED;
    if (decision === DECISION.REJECT) n.status = STATUS.REJECTED;
    if (decision === DECISION.APPROVE) {
      if (featured) n.featured = true;
      if (publishMode === 'schedule') {
        n.status = STATUS.SCHEDULED;
        n.scheduledAt = when.toISOString();
        msg = `Таны «${n.title}» ноорог зөвшөөрөгдөж, ${when.toLocaleString('sv-SE').slice(0, 16)}-нд нийтлэгдэхээр товлогдлоо.`;
      } else {
        n.status = STATUS.PUBLISHED;
        n.publishedAt = now();
        msg = `Таны «${n.title}» ноорог зөвшөөрөгдөж нийтлэгдлээ.`;
      }
    }
    if (text) msg += ` Тайлбар: ${text}`;
    notify(d, n.journalistId, msg, id);
    addLog(d, user.id, `Шийдвэр: ${DECISION_LABELS[decision]}`, `Мэдээ #${id} v${n.version}`);
  });
}

export async function publishNow(user, id) {
  assertRole(user, ROLES.EDITOR);
  await mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    if (!n || n.status !== STATUS.SCHEDULED) throw new AppError('Товлосон нийтлэл олдсонгүй.');
    n.status = STATUS.PUBLISHED;
    n.publishedAt = now();
    n.updatedAt = now();
    notify(d, n.journalistId, `Таны «${n.title}» нийтлэл нийтлэгдлээ.`, id);
    addLog(d, user.id, 'Гараар нийтэлсэн', `Мэдээ #${id}`);
  });
}

/** Товлосон цаг болсон нийтлэлийг автоматаар нийтэлнэ */
export async function runScheduler() {
  // Supabase горимд сервер талын cron (supabase/cron.sql) нийтэлнэ; редактор онлайн байвал энд бас шалгана
  if (isRemote && !['editor', 'admin'].includes(getCurrentUser()?.role)) return;
  const due = getDb().news.filter((n) => n.status === STATUS.SCHEDULED && new Date(n.scheduledAt).getTime() <= Date.now());
  if (!due.length) return;
  await mutate((d) => {
    due.forEach(({ id }) => {
      const n = d.news.find((x) => x.id === id);
      if (!n || n.status !== STATUS.SCHEDULED) return;
      n.status = STATUS.PUBLISHED;
      n.publishedAt = now();
      n.updatedAt = now();
      notify(d, n.journalistId, `Таны «${n.title}» нийтлэл товлосон цагтаа нийтлэгдлээ.`, id);
      addLog(d, 0, 'Автоматаар нийтэлсэн', `Мэдээ #${id}`);
    });
  });
}

/** FR-PUB-003: нийтлэгдсэн мэдээг засварлах */
export async function updatePublished(user, id, data) {
  assertRole(user, ROLES.EDITOR);
  const existing = getDb().news.find((n) => n.id === id);
  if (!existing || existing.status !== STATUS.PUBLISHED) throw new AppError('Нийтлэгдсэн нийтлэл олдсонгүй.');
  validateNewsData(getDb(), { ...data, copyrightConsent: true }, { forSubmit: true });
  const uploaded = await prepareFiles(data.newFiles);
  // Хадгалах үед алдаа гарвал mutate өмнөх хувилбарыг хэвээр үлдээнэ
  return mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    const { copyrightConsent, ...rest } = data; // eslint-disable-line no-unused-vars
    applyFields(n, rest);
    applyMedia(d, id, uploaded, data.removeMediaIds);
    n.version += 1;
    n.updatedAt = now();
    pushVersion(d, n, user.id);
    notify(d, n.journalistId, `Редактор таны «${n.title}» нийтлэлийг шинэчиллээ (хувилбар ${n.version}).`, id);
    addLog(d, user.id, 'Нийтлэл шинэчилсэн', `Мэдээ #${id} v${n.version}`);
    return id;
  });
}

/** Редактор «Онцлох мэдээ» эсэхийг тэмдэглэнэ */
export async function setFeatured(user, id, featured) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  await mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    if (!n) throw new AppError('Мэдээ олдсонгүй.');
    n.featured = Boolean(featured);
    addLog(d, user.id, featured ? 'Онцлох болгосон' : 'Онцлохоос хассан', `Мэдээ #${id}`);
  });
}

/** Редактор, Админ мэдээг бүрмөсөн устгана (зураг, шийдвэр, хувилбарын түүхтэй нь) */
export async function deleteNews(user, id) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  const existing = getDb().news.find((n) => n.id === id);
  if (!existing) throw new AppError('Мэдээ олдсонгүй.');
  const files = getDb().media.filter((m) => m.newsId === id).map((m) => m.fileUrl);
  await mutate((d) => {
    const n = d.news.find((x) => x.id === id);
    if (!n) throw new AppError('Мэдээ олдсонгүй.');
    d.news = d.news.filter((x) => x.id !== id);
    d.media = d.media.filter((x) => x.newsId !== id);
    d.decisions = d.decisions.filter((x) => x.newsId !== id);
    d.versions = d.versions.filter((x) => x.newsId !== id);
    if (n.journalistId !== user.id) {
      notify(d, n.journalistId, `${ROLE_LABELS[user.role]} таны «${n.title}» мэдээг устгалаа.`);
    }
    addLog(d, user.id, 'Мэдээ устгасан', `Мэдээ #${id} «${n.title.slice(0, 50)}»`);
  });
  // Storage-оос зураг, бичлэгийг цэвэрлэнэ (амжилтгүй болсон ч мэдээ аль хэдийн устсан)
  if (isRemote) {
    const marker = '/storage/v1/object/public/media/';
    const paths = files.filter((u) => u?.includes(marker)).map((u) => decodeURIComponent(u.split(marker)[1]));
    if (paths.length) supabase.storage.from('media').remove(paths).catch(() => {});
  }
}

// ---------- Мэдэгдэл ----------
export function markRead(user, id) {
  return mutate((d) => {
    const n = d.notifications.find((x) => x.id === id && x.userId === user.id);
    if (n) n.read = true;
  });
}

export function markAllRead(user) {
  return mutate((d) => d.notifications.forEach((n) => n.userId === user.id && (n.read = true)));
}
