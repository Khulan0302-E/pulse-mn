// Сонгууль: нэр дэвшигчид, намууд. Редактор, Админ оруулж засна; бүх хүн үзнэ.
import { getDb, mutate, nextId, now, addLog } from '../lib/db';
import { uploadFile, validateFile } from '../lib/files';
import { ROLES } from '../lib/constants';
import { AppError, assertRole } from './auth';

export const ELECTION_RESULTS = ['Сонгогдсон', 'Сонгогдоогүй', 'Нөхөн сонгууль', 'Нэрээ татсан'];

const clean = (v, max) => {
  const s = String(v ?? '').trim();
  return max ? s.slice(0, max) : s;
};
const orNull = (v) => (v === '' || v === undefined ? null : v);

// ---------- Унших ----------
export const listParties = (db = getDb()) => [...(db.parties || [])].sort((a, b) => a.name.localeCompare(b.name, 'mn'));
export const listCandidates = (db = getDb()) =>
  [...(db.candidates || [])].sort((a, b) => Number(b.featured) - Number(a.featured) || a.fullName.localeCompare(b.fullName, 'mn'));
export const partyById = (db, id) => (db.parties || []).find((p) => p.id === Number(id)) || null;
export const candidateById = (db, id) => (db.candidates || []).find((c) => c.id === Number(id)) || null;
export const partyMembers = (db, partyId) => listCandidates(db).filter((c) => c.partyId === Number(partyId));

export function ageOf(birthYear) {
  const y = Number(birthYear);
  return y ? new Date().getFullYear() - y : null;
}
export function partyAge(foundedOn) {
  if (!foundedOn) return null;
  return new Date().getFullYear() - new Date(foundedOn).getFullYear();
}

// ---------- Зураг ----------
async function uploadImage(file) {
  if (!file) return null;
  const r = await validateFile(file, 'media');
  if (!r.ok) throw new AppError(r.error);
  if (r.type !== 'image') throw new AppError('Зөвхөн зураг (JPG, PNG, WEBP) оруулна.');
  try {
    return await uploadFile(file, 'media');
  } catch {
    throw new AppError('Зураг байршуулж чадсангүй. Дахин оролдоно уу.');
  }
}

// ---------- Нам ----------
export function validateParty(data) {
  const errors = {};
  if (!clean(data.name)) errors.name = 'Намын нэрийг оруулна уу.';
  if (data.foundedOn && Number.isNaN(Date.parse(data.foundedOn))) errors.foundedOn = 'Огноо буруу байна.';
  if (data.website && !/^https?:\/\//i.test(clean(data.website))) errors.website = 'http:// эсвэл https://-ээр эхэлнэ.';
  if (Object.keys(errors).length) throw new AppError('Мэдээллээ шалгана уу.', errors);
}

export async function saveParty(user, data, logoFile) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  validateParty(data);
  const logoUrl = (await uploadImage(logoFile)) || data.logoUrl || null;
  return mutate((d) => {
    d.parties ||= [];
    let p = data.id ? d.parties.find((x) => x.id === data.id) : null;
    if (data.id && !p) throw new AppError('Нам олдсонгүй.');
    if (!p) {
      p = { id: nextId(d, 'parties'), createdAt: now() };
      d.parties.push(p);
    }
    Object.assign(p, {
      name: clean(data.name, 150),
      shortName: orNull(clean(data.shortName, 30)),
      logoUrl,
      color: orNull(clean(data.color, 9)),
      foundedOn: orNull(data.foundedOn || ''),
      chairman: orNull(clean(data.chairman, 100)),
      description: orNull(clean(data.description)),
      website: orNull(clean(data.website, 300)),
      updatedAt: now(),
    });
    addLog(d, user.id, data.id ? 'Нам зассан' : 'Нам нэмсэн', p.name.slice(0, 80));
    return p.id;
  });
}

export async function deleteParty(user, id) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  await mutate((d) => {
    const p = (d.parties || []).find((x) => x.id === id);
    if (!p) throw new AppError('Нам олдсонгүй.');
    d.parties = d.parties.filter((x) => x.id !== id);
    // Серверт party_id нь «on delete set null»; энд ч мөн адил
    (d.candidates || []).forEach((c) => {
      if (c.partyId === id) c.partyId = null;
    });
    addLog(d, user.id, 'Нам устгасан', p.name.slice(0, 80));
  });
}

// ---------- Нэр дэвшигч ----------
const cleanRows = (rows, keys) =>
  (rows || [])
    .map((r) => Object.fromEntries(keys.map((k) => [k, clean(r[k], 200)])))
    .filter((r) => keys.some((k) => r[k]));

export function validateCandidate(data) {
  const errors = {};
  if (!clean(data.fullName)) errors.fullName = 'Нэрийг оруулна уу.';
  const y = Number(data.birthYear);
  if (data.birthYear && (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear() - 18)) {
    errors.birthYear = 'Төрсөн оныг зөв оруулна уу (жишээ: 1975).';
  }
  if (Object.keys(errors).length) throw new AppError('Мэдээллээ шалгана уу.', errors);
}

export async function saveCandidate(user, data, photoFile) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  validateCandidate(data);
  const photoUrl = (await uploadImage(photoFile)) || data.photoUrl || null;
  return mutate((d) => {
    d.candidates ||= [];
    let c = data.id ? d.candidates.find((x) => x.id === data.id) : null;
    if (data.id && !c) throw new AppError('Нэр дэвшигч олдсонгүй.');
    if (!c) {
      c = { id: nextId(d, 'candidates'), createdAt: now(), featured: false };
      d.candidates.push(c);
    }
    Object.assign(c, {
      fullName: clean(data.fullName, 100),
      photoUrl,
      birthYear: data.birthYear ? Number(data.birthYear) : null,
      partyId: data.partyId ? Number(data.partyId) : null,
      district: orNull(clean(data.district, 150)),
      position: orNull(clean(data.position, 150)),
      education: cleanRows(data.education, ['school', 'degree', 'year']),
      electionHistory: cleanRows(data.electionHistory, ['year', 'election', 'district', 'party', 'result', 'votes']),
      bio: orNull(clean(data.bio)),
      featured: Boolean(data.featured),
      updatedAt: now(),
    });
    addLog(d, user.id, data.id ? 'Нэр дэвшигч зассан' : 'Нэр дэвшигч нэмсэн', c.fullName.slice(0, 80));
    return c.id;
  });
}

export async function setCandidateFeatured(user, id, featured) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  await mutate((d) => {
    const c = (d.candidates || []).find((x) => x.id === id);
    if (!c) throw new AppError('Нэр дэвшигч олдсонгүй.');
    c.featured = Boolean(featured);
    c.updatedAt = now();
  });
}

export async function deleteCandidate(user, id) {
  assertRole(user, ROLES.EDITOR, ROLES.ADMIN);
  await mutate((d) => {
    const c = (d.candidates || []).find((x) => x.id === id);
    if (!c) throw new AppError('Нэр дэвшигч олдсонгүй.');
    d.candidates = d.candidates.filter((x) => x.id !== id);
    addLog(d, user.id, 'Нэр дэвшигч устгасан', c.fullName.slice(0, 80));
  });
}
