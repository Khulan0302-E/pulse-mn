// INT-004 FileStorage: файлыг хадгалж fileURL буцаана.
// Энэ хувилбарт браузерын IndexedDB-д хадгална. Жинхэнэ серверт шилжүүлэхдээ
// uploadFile / getFileBlob функцийг REST дуудлагаар солиход хангалттай.
import { FILE_RULES } from './constants';

const DB_NAME = 'pulse_files';
const STORE = 'files';
export const FILE_PREFIX = 'pulsefile://';

let dbPromise;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export function uid() {
  const a = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadFile(blob) {
  const id = uid();
  await tx('readwrite', (s) => s.put(blob, id));
  return FILE_PREFIX + id;
}

export async function getFileBlob(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith(FILE_PREFIX)) return null;
  return tx('readonly', (s) => s.get(fileUrl.slice(FILE_PREFIX.length)));
}

const urlCache = new Map();
export async function resolveFileUrl(fileUrl) {
  if (!fileUrl) return null;
  if (!fileUrl.startsWith(FILE_PREFIX)) return fileUrl;
  if (urlCache.has(fileUrl)) return urlCache.get(fileUrl);
  const blob = await getFileBlob(fileUrl);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(fileUrl, url);
  return url;
}

// ---- NFR-SEC-008: файлын төрөл, хэмжээ, агуулгын шалгалт ----
const str = (b, from, to) => String.fromCharCode(...b.slice(from, to));
const SIGNATURES = {
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => str(b, 0, 4) === 'RIFF' && str(b, 8, 12) === 'WEBP',
  mp4: (b) => str(b, 4, 8) === 'ftyp',
  webm: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
};
const DANGEROUS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'js', 'vbs', 'ps1', 'sh', 'php',
  'html', 'htm', 'svg', 'jar', 'apk', 'dll', 'py',
]);

/**
 * @param {File} file
 * @param {'verification'|'media'} kind
 * @returns {Promise<{ok:boolean,error?:string,type?:'image'|'video'|'document',sizeMB?:number}>}
 */
export async function validateFile(file, kind) {
  const name = file.name || 'файл';
  const parts = name.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  if (parts.slice(1).some((p) => DANGEROUS.has(p)) || DANGEROUS.has(ext)) {
    return { ok: false, error: `«${name}» файлын нэр, өргөтгөл аюултай тул хүлээн авах боломжгүй.` };
  }

  let rule = null;
  let type = null;
  let allowed;
  if (kind === 'verification') {
    allowed = FILE_RULES.verification.label;
    if (FILE_RULES.verification.exts.includes(ext)) {
      rule = FILE_RULES.verification;
      type = ext === 'pdf' ? 'document' : 'image';
    }
  } else {
    allowed = 'JPG, PNG, WEBP, MP4, WEBM';
    if (FILE_RULES.image.exts.includes(ext)) {
      rule = FILE_RULES.image;
      type = 'image';
    } else if (FILE_RULES.video.exts.includes(ext)) {
      rule = FILE_RULES.video;
      type = 'video';
    }
  }
  if (!rule) return { ok: false, error: `«${name}» — дэмжигдээгүй файлын төрөл. Зөвшөөрөгдөх: ${allowed}.` };
  if (file.size === 0) return { ok: false, error: `«${name}» файл хоосон байна.` };

  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > rule.maxMB) {
    return { ok: false, error: `«${name}» файлын хэмжээ ${sizeMB.toFixed(1)} MB байна. Дээд хязгаар ${rule.maxMB} MB.` };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const key = ext === 'jpeg' ? 'jpg' : ext;
  if (!SIGNATURES[key](head)) {
    return { ok: false, error: `«${name}» файлын агуулга өргөтгөлтэйгээ таарахгүй байна (аюултай байж болзошгүй).` };
  }
  return { ok: true, type, sizeMB: Number(sizeMB.toFixed(2)) };
}
