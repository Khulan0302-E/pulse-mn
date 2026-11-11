// Өгөгдлийн давхарга. Хоёр горимтой:
//  • Supabase горим (VITE_SUPABASE_URL тохируулсан үед): өгөгдөл Supabase Postgres-д,
//    эрхийг сервер талд Row Level Security шалгана.
//  • Демо горим: өгөгдөл браузерын localStorage-д.
// Бүх өөрчлөлт mutate()-ээр дамжина. Сервер (эсвэл localStorage) амжилттай хадгалсны дараа л
// төлөв солигдоно; алдаа гарвал өмнөх өгөгдөл хэвээр үлдэнэ (NFR-REL-002).
import { buildSeed } from './seed';
import { isRemote, supabase } from './supabase';
import { loadRemote, pushDiff, keepFresherExternal } from './remote';

const KEY = 'pulse_db_v1';
const BACKUP_KEY = 'pulse_backup_v1';
export const SESSION_KEY = 'pulse_session';
export { isRemote };

let state = null;
let version = 0;
const listeners = new Set();

function loadLocal() {
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

// Өөрчлөлтүүдийг дарааллаар нь гүйцэтгэнэ (нэг нь дуусаагүй байхад нөгөө нь эхлэхгүй)
let queue = Promise.resolve();
function enqueue(task) {
  const p = queue.then(task, task);
  queue = p.catch(() => {});
  return p;
}

export function getCurrentUser() {
  const id = Number(localStorage.getItem(SESSION_KEY));
  return (id && state?.users.find((u) => u.id === id)) || null;
}

/** Supabase-ийн сешнээс өөрийн профайлыг олж SESSION_KEY-д хадгална */
async function syncSession() {
  const { data } = await supabase.auth.getSession();
  const authId = data.session?.user?.id;
  const me = (authId && state.users.find((u) => u.authId === authId)) || null;
  if (me) localStorage.setItem(SESSION_KEY, String(me.id));
  else localStorage.removeItem(SESSION_KEY);
  return me;
}

/** Серверээс бүх өгөгдлийг дахин уншина. Нэвтэрсэн хэрэглэгчийн профайлыг буцаана. */
export function reloadRemote() {
  if (!isRemote) return Promise.resolve(getCurrentUser());
  return enqueue(async () => {
    const prev = state;
    const next = await loadRemote();
    if (getCurrentUser()?.role !== 'admin') keepFresherExternal(prev, next);
    state = next;
    const me = await syncSession();
    emit();
    return me;
  });
}

export async function initDb() {
  if (isRemote) {
    state = await loadRemote();
    await syncSession();
    return;
  }
  state = loadLocal();
  if (!state) {
    state = await buildSeed();
    persist(state);
  }
  // Хуучин демо өгөгдөлд шинэ хүснэгтүүд байхгүй байж болно
  state.parties ||= [];
  state.candidates ||= [];
  // Өөр таб дээр хийсэн өөрчлөлтийг тусгах
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      const next = loadLocal();
      if (next) {
        next.parties ||= [];
        next.candidates ||= [];
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

/**
 * Өгөгдөл өөрчлөх цорын ганц зам. fn(draft) нь хуулбар дээр өөрчлөлт хийнэ.
 * @param {{sync?: boolean}} opts sync:false — Supabase руу илгээхгүй, зөвхөн энэ браузерт
 * @returns {Promise<any>} fn-ийн буцаасан утга
 */
export function mutate(fn, { sync = true } = {}) {
  return enqueue(async () => {
    const prev = state;
    const draft = structuredClone(state);
    const result = fn(draft); // энд алдаа шидэгдвэл state өөрчлөгдөхгүй
    if (isRemote) {
      if (sync) {
        try {
          await pushDiff(prev, draft);
        } catch (e) {
          reloadRemote().catch(() => {}); // хагас хадгалагдсан бол серверийн төлөвтэй тэнцүүлнэ
          throw e;
        }
      }
    } else {
      try {
        persist(draft);
      } catch {
        throw new Error('Өгөгдөл хадгалах үед алдаа гарлаа (санах ой дүүрсэн байж магадгүй). Өмнөх мэдээлэл хэвээр хадгалагдсан.');
      }
    }
    state = draft;
    emit();
    return result;
  });
}

export const now = () => new Date().toISOString();

let lastRemoteId = 0;
export function nextId(db, table) {
  if (isRemote) {
    // Олон хэрэглэгч зэрэг бичихэд давхцахгүй ID (≈ микросекундын хугацаа + санамсаргүй)
    const id = Math.max(lastRemoteId + 1, Date.now() * 1000 + Math.floor(Math.random() * 1000));
    lastRemoteId = id;
    return id;
  }
  db.seq[table] = (db.seq[table] || 0) + 1;
  return db.seq[table];
}

// Үйлдлийн лог (Өгөгдөл → Үйлдлийн лог)
export function addLog(db, userId, action, object) {
  db.logs.unshift({ id: nextId(db, 'logs'), userId, action, object, createdAt: now() });
  if (!isRemote && db.logs.length > 3000) db.logs.length = 3000;
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

// ---- NFR-REL-001: 24 цаг тутамд автомат нөөц (демо горим) ----
export function maybeAutoBackup() {
  if (isRemote) return;
  try {
    const meta = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
    if (meta && Date.now() - new Date(meta.createdAt).getTime() < 24 * 3600 * 1000) return;
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ createdAt: now(), data: state }));
  } catch {
    /* санах ой хүрэлцэхгүй бол алгасна */
  }
}

export function getBackupInfo() {
  if (isRemote) return null;
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
  if (isRemote) throw new Error('Supabase горимд нөөцийг Supabase-ийн самбараас сэргээнэ.');
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
  if (isRemote) return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(SESSION_KEY);
  window.location.href = '/';
}
