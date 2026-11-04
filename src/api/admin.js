// Админ: сэтгүүлч баталгаажуулах, хэрэглэгчийн эрх, тохиргоо, лог
import { getDb, mutate, now, addLog, notify } from '../lib/db';
import { ROLES, VERIFY, USER_STATUS, ROLE_LABELS, LIMITS } from '../lib/constants';
import { AppError, assertRole } from './auth';

export function listVerifications(user, status) {
  assertRole(user, ROLES.ADMIN);
  return getDb()
    .verifications.filter((v) => !status || v.status === status)
    .sort((a, b) => (status === VERIFY.PENDING ? a.id - b.id : b.id - a.id));
}

/** FR-AUTH-001 алхам 4–5 */
export function decideVerification(user, id, approve, reason = '') {
  assertRole(user, ROLES.ADMIN);
  const text = reason.trim();
  if (!approve && !text) throw new AppError('Татгалзах шалтгааныг заавал бичнэ.');
  if (text.length > LIMITS.reason) throw new AppError(`Шалтгаан ${LIMITS.reason} тэмдэгтээс хэтрэхгүй.`);
  mutate((d) => {
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

export function updateUser(user, id, patch) {
  assertRole(user, ROLES.ADMIN);
  if (id === user.id) throw new AppError('Өөрийн эрх, төлвийг өөрчлөх боломжгүй.');
  mutate((d) => {
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

export function saveIntegration(user, type, patch) {
  assertRole(user, ROLES.ADMIN);
  const interval = Number(patch.intervalMin);
  if (!/^https:\/\//i.test(patch.url || '')) throw new AppError('API URL https:// -ээр эхэлнэ.');
  if (!Number.isFinite(interval) || interval < 5) throw new AppError('Шинэчлэх давтамж хамгийн багадаа 5 минут.');
  mutate((d) => {
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
