// Сэтгүүлч баталгаажуулах (Редактор), хэрэглэгчийн эрх, тохиргоо, лог (Админ)
import { getDb, mutate, now, addLog, notify, nextId } from '../lib/db';
import { SAMPLE_ARTICLES } from '../lib/seed';
import { ROLES, VERIFY, USER_STATUS, ROLE_LABELS, LIMITS } from '../lib/constants';
import { AppError, assertRole } from './auth';

// Сэтгүүлчийн баримтыг Редактор баталгаажуулна (багийн шийдвэр; эх баримтад Админ гэж заасан)
export function listVerifications(user, status) {
  assertRole(user, ROLES.EDITOR);
  return getDb()
    .verifications.filter((v) => !status || v.status === status)
    .sort((a, b) => (status === VERIFY.PENDING ? a.id - b.id : b.id - a.id));
}

/** FR-AUTH-001 алхам 4–5 */
export async function decideVerification(user, id, approve, reason = '') {
  assertRole(user, ROLES.EDITOR);
  const text = reason.trim();
  if (!approve && !text) throw new AppError('Татгалзах шалтгааныг заавал бичнэ.');
  if (text.length > LIMITS.reason) throw new AppError(`Шалтгаан ${LIMITS.reason} тэмдэгтээс хэтрэхгүй.`);
  await mutate((d) => {
    const v = d.verifications.find((x) => x.id === id);
    if (!v || v.status !== VERIFY.PENDING) throw new AppError('Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
    v.status = approve ? VERIFY.APPROVED : VERIFY.REJECTED;
    v.reviewerId = user.id;
    v.decidedAt = now();
    v.reason = approve ? '' : text;
    notify(
      d,
      v.userId,
      approve
        ? 'Таны сэтгүүлчийн бүртгэл баталгаажлаа. Та одоо ноорог оруулах боломжтой.'
        : `Таны баталгаажуулах хүсэлтийг татгалзлаа. Шалтгаан: ${text}. Баримтаа засаж дахин илгээх боломжтой.`,
    );
    addLog(d, user.id, approve ? 'Сэтгүүлч баталгаажуулсан' : 'Баталгаажуулалт татгалзсан', `Хэрэглэгч #${v.userId}`);
  });
}

export async function updateUser(user, id, patch) {
  assertRole(user, ROLES.ADMIN);
  if (id === user.id) throw new AppError('Өөрийн эрх, төлвийг өөрчлөх боломжгүй.');
  await mutate((d) => {
    const u = d.users.find((x) => x.id === id);
    if (!u) throw new AppError('Хэрэглэгч олдсонгүй.');
    if (patch.role && patch.role !== u.role) {
      if (!ROLE_LABELS[patch.role]) throw new AppError('Роль буруу байна.');
      addLog(d, user.id, 'Роль өөрчилсөн', `#${id}: ${ROLE_LABELS[u.role]} → ${ROLE_LABELS[patch.role]}`);
      u.role = patch.role;
      notify(d, id, `Таны эрх «${ROLE_LABELS[patch.role]}» болж өөрчлөгдлөө.`);
    }
    if (patch.status && patch.status !== u.status) {
      if (!Object.values(USER_STATUS).includes(patch.status)) throw new AppError('Төлөв буруу байна.');
      u.status = patch.status;
      addLog(d, user.id, patch.status === USER_STATUS.ACTIVE ? 'Хэрэглэгч идэвхжүүлсэн' : 'Хэрэглэгч түдгэлзүүлсэн', `Хэрэглэгч #${id}`);
    }
  });
}

export async function saveIntegration(user, type, patch) {
  assertRole(user, ROLES.ADMIN);
  const interval = Number(patch.intervalMin);
  if (!/^https:\/\//i.test(patch.url || '')) throw new AppError('API URL https:// -ээр эхэлнэ.');
  if (!Number.isFinite(interval) || interval < 5) throw new AppError('Шинэчлэх давтамж хамгийн багадаа 5 минут.');
  await mutate((d) => {
    Object.assign(d.settings[type], {
      url: patch.url.trim(),
      apiKey: (patch.apiKey || '').trim(),
      intervalMin: interval,
      sourceName: (patch.sourceName || '').trim() || d.settings[type].sourceName,
      ...(type === 'weather' ? { city: (patch.city || '').trim() || 'Улаанбаатар' } : {}),
      ...(type === 'fx' ? { currencies: (patch.currencies || '').toUpperCase().replace(/\s/g, '') } : {}),
    });
    addLog(d, user.id, 'API тохиргоо өөрчилсөн', type === 'weather' ? 'Цаг агаар' : 'Валютын ханш');
  });
}

/** Supabase-ийн хоосон өгөгдлийн санд жишээ нийтлэл нэмэх (зохиогч нь админ) */
export async function seedSampleNews(user) {
  assertRole(user, ROLES.ADMIN);
  const db = getDb();
  const loc = (aimag, sum) => db.locations.find((l) => l.aimag === aimag && l.sum === sum)?.id;
  return mutate((d) => {
    let added = 0;
    SAMPLE_ARTICLES.forEach((a) => {
      if (d.news.some((x) => x.title === a.title)) return;
      const id = nextId(d, 'news');
      const t = new Date(Date.now() - a.h * 3600 * 1000).toISOString();
      const n = {
        id, journalistId: user.id, title: a.title, content: a.content, categoryId: a.cat,
        locationId: loc(...a.loc), status: 'published', version: 1, source: a.source,
        sourceConfidential: false, copyrightConsent: true, createdAt: t, submittedAt: t,
        scheduledAt: null, publishedAt: t, updatedAt: t, views: a.views,
      };
      d.news.push(n);
      d.versions.push({
        id: nextId(d, 'versions'), newsId: id, version: 1, userId: user.id, createdAt: t,
        snapshot: { title: n.title, content: n.content, categoryId: n.categoryId, locationId: n.locationId, source: n.source, media: [] },
      });
      added++;
    });
    if (added) addLog(d, user.id, 'Жишээ мэдээ нэмсэн', `${added} мэдээ`);
    return added;
  });
}
