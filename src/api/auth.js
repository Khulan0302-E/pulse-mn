// Бүртгэл ба нэвтрэлт (FR-AUTH-001, NFR-SEC-006, NFR-SEC-007)
import { getDb, mutate, nextId, now, addLog, notifyRole } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { uploadFile, validateFile } from '../lib/files';
import { ROLES, VERIFY, LIMITS, DOC_TYPES, USER_STATUS } from '../lib/constants';

export class AppError extends Error {
  constructor(message, fields, code) {
    super(message);
    this.fields = fields;
    this.code = code;
  }
}

/** NFR-SEC-007: үүргээс хамааран эрх хязгаарлах */
export function assertRole(user, ...roles) {
  if (!user || !roles.includes(user.role) || user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Танд энэ үйлдлийг хийх эрх байхгүй байна.');
  }
}

export function latestVerification(db, userId) {
  return db.verifications.filter((v) => v.userId === userId).sort((a, b) => b.id - a.id)[0] || null;
}

export function isVerifiedJournalist(db, user) {
  return user?.role === ROLES.JOURNALIST && latestVerification(db, user.id)?.status === VERIFY.APPROVED;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(email, password) {
  const db = getDb();
  const u = db.users.find((x) => x.email === String(email).trim().toLowerCase());
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    throw new AppError('И-мэйл эсвэл нууц үг буруу байна.');
  }
  if (u.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Таны бүртгэл түдгэлзсэн байна. Админтай холбогдоно уу.');
  }
  mutate((d) => addLog(d, u.id, 'Нэвтэрсэн', `Хэрэглэгч #${u.id}`));
  return u;
}

async function checkVerificationFile(docType, file, errors) {
  if (!DOC_TYPES[docType]) errors.docType = 'Баримтын төрлийг сонгоно уу.';
  if (!file) {
    errors.file = 'Баталгаажуулах баримтаа хавсаргана уу.';
    return;
  }
  const r = await validateFile(file, 'verification');
  if (!r.ok) errors.file = r.error;
}

export async function register(data) {
  const errors = {};
  const fullName = (data.fullName || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const phone = (data.phone || '').trim();
  const org = (data.org || '').trim();
  const role = data.role === ROLES.JOURNALIST ? ROLES.JOURNALIST : ROLES.CITIZEN;

  if (!fullName) errors.fullName = 'Овог нэрээ оруулна уу.';
  else if (fullName.length > LIMITS.fullName) errors.fullName = `${LIMITS.fullName} тэмдэгтээс хэтрэхгүй.`;
  if (!EMAIL_RE.test(email)) errors.email = 'И-мэйл хаяг буруу байна (name@domain).';
  else if (getDb().users.some((u) => u.email === email)) errors.email = 'Энэ и-мэйлээр бүртгэл үүссэн байна.';
  if (phone && !/^\d{8}$/.test(phone)) errors.phone = 'Утасны дугаар 8 оронтой тоо байна.';
  if (role === ROLES.JOURNALIST && !phone) errors.phone = 'Сэтгүүлч утасны дугаараа заавал оруулна.';
  if (!data.password || data.password.length < 8) errors.password = 'Нууц үг хамгийн багадаа 8 тэмдэгт.';
  else if (data.password !== data.password2) errors.password2 = 'Нууц үг таарахгүй байна.';
  if (org.length > LIMITS.org) errors.org = `${LIMITS.org} тэмдэгтээс хэтрэхгүй.`;
  if (!data.terms) errors.terms = 'Ашиглалтын нөхцөл, хувийн мэдээллийн бодлоготой танилцаж зөвшөөрнө үү.';
  if (role === ROLES.JOURNALIST) await checkVerificationFile(data.docType, data.file, errors);

  // Баримтгүй хүсэлтийг систем хадгалахгүй
  if (Object.keys(errors).length) throw new AppError('Маягтын алдааг засна уу.', errors);

  const passwordHash = await hashPassword(data.password);
  let fileUrl = null;
  if (role === ROLES.JOURNALIST) {
    try {
      fileUrl = await uploadFile(data.file);
    } catch {
      throw new AppError('Файл хадгалж чадсангүй. Дахин оролдоно уу.', { file: 'Дахин хавсаргана уу.' });
    }
  }

  return mutate((d) => {
    const id = nextId(d, 'users');
    const user = { id, fullName, email, phone, passwordHash, role, org, status: USER_STATUS.ACTIVE, createdAt: now() };
    d.users.push(user);
    if (role === ROLES.JOURNALIST) {
      d.verifications.push({
        id: nextId(d, 'verifications'), userId: id, docType: data.docType, fileUrl,
        fileName: data.file.name, status: VERIFY.PENDING, reviewerId: null, decidedAt: null,
        reason: '', createdAt: now(),
      });
      notifyRole(d, ROLES.ADMIN, `Шинэ сэтгүүлч ${fullName} баталгаажуулах хүсэлт илгээлээ.`);
    }
    addLog(d, id, 'Бүртгүүлсэн', `${role === ROLES.JOURNALIST ? 'Сэтгүүлч' : 'Иргэн'} #${id}`);
    return user;
  });
}

/** FR-AUTH-001 4а: татгалзсан бол баримтаа дахин илгээх */
export async function resubmitVerification(user, docType, file) {
  assertRole(user, ROLES.JOURNALIST);
  const current = latestVerification(getDb(), user.id);
  if (current && current.status !== VERIFY.REJECTED) {
    throw new AppError('Таны хүсэлт хянагдаж байгаа эсвэл аль хэдийн баталгаажсан байна.');
  }
  const errors = {};
  await checkVerificationFile(docType, file, errors);
  if (Object.keys(errors).length) throw new AppError('Маягтын алдааг засна уу.', errors);
  let fileUrl;
  try {
    fileUrl = await uploadFile(file);
  } catch {
    throw new AppError('Файл хадгалж чадсангүй. Дахин оролдоно уу.');
  }
  mutate((d) => {
    d.verifications.push({
      id: nextId(d, 'verifications'), userId: user.id, docType, fileUrl, fileName: file.name,
      status: VERIFY.PENDING, reviewerId: null, decidedAt: null, reason: '', createdAt: now(),
    });
    notifyRole(d, ROLES.ADMIN, `${user.fullName} баталгаажуулах баримтаа дахин илгээлээ.`);
    addLog(d, user.id, 'Баримт дахин илгээсэн', `Хэрэглэгч #${user.id}`);
  });
}
