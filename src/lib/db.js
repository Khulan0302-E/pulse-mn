// Өгөгдлийн давхарга. Энэ хувилбарт браузерын localStorage-д хадгална (демо backend).
// Бүх өөрчлөлт mutate()-ээр дамжина: амжилттай хадгалагдсан үед л төлөв солигдоно,
// алдаа гарвал өмнөх өгөгдөл хэвээр үлдэнэ (NFR-REL-002).
import { buildSeed } from './seed';

const KEY = 'pulse_db_v1';
const BACKUP_KEY = 'pulse_backup_v1';
export const SESSION_KEY = 'pulse_session';

let state = null;
let version = 0;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export async function initDb() {
  state = load();
  if (!state) {
    state = await buildSeed();
    persist(state);
  }
  // Өөр таб дээр хийсэн өөрчлөлтийг тусгах
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      const next = load();
      if (next) {
        state = next;
        emit();
      }
    }
  });
}

export const getDb = () => state;
export const getVersion = () => version;
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function mutate(fn) {
  const draft = structuredClone(state);
  const result = fn(draft); // энд алдаа шидэгдвэл state өөрчлөгдөхгүй
  try {
    persist(draft);
  } catch {
    throw new Error('Өгөгдөл хадгалах үед алдаа гарлаа (санах ой дүүрсэн байж магадгүй). Өмнөх мэдээлэл хэвээр хадгалагдсан.');
  }
  state = draft;
  emit();
  return result;
}

export const now = () => new Date().toISOString();

export function nextId(db, table) {
  db.seq[table] = (db.seq[table] || 0) + 1;
  return db.seq[table];
}

// Үйлдлийн лог (Өгөгдөл → Үйлдлийн лог)
export function addLog(db, userId, action, object) {
  db.logs.unshift({ id: nextId(db, 'logs'), userId, action, object, createdAt: now() });
  if (db.logs.length > 3000) db.logs.length = 3000;
}

// Мэдэгдэл (INT-003 — энэ хувилбарт платформ доторх мэдэгдэл)
export function notify(db, userId, content, newsId = null) {
  db.notifications.unshift({
    id: nextId(db, 'notifications'),
    userId,
    newsId,
    content,
    createdAt: now(),
    read: false,
  });
}

export function notifyRole(db, role, content, newsId = null) {
  db.users
    .filter((u) => u.role === role && u.status === 'active')
    .forEach((u) => notify(db, u.id, content, newsId));
}

// ---- NFR-REL-001: 24 цаг тутамд автомат нөөц ----
export function maybeAutoBackup() {
  try {
    const meta = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
    if (meta && Date.now() - new Date(meta.createdAt).getTime() < 24 * 3600 * 1000) return;
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ createdAt: now(), data: state }));
  } catch {
    /* санах ой хүрэлцэхгүй бол алгасна */
  }
}

export function getBackupInfo() {
  try {
    const meta = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
    return meta ? { createdAt: meta.createdAt } : null;
  } catch {
    return null;
  }
}

export function exportDb() {
  return JSON.stringify(state, null, 2);
}

export function restoreDb(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const required = ['users', 'news', 'categories', 'locations', 'seq', 'settings'];
  if (!data || !required.every((k) => k in data)) throw new Error('Нөөц файлын бүтэц буруу байна.');
  persist(data);
  state = data;
  emit();
}

export function restoreFromAutoBackup() {
  const meta = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
  if (!meta) throw new Error('Автомат нөөц олдсонгүй.');
  restoreDb(meta.data);
}

export function resetDb() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
}
