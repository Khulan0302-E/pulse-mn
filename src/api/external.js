// FR-INT-001, INT-001, INT-002: цаг агаар, валютын ханшийг API-аас татах
import { getDb, mutate, nextId, now, addLog, notifyRole, isRemote, getCurrentUser } from '../lib/db';
import { ROLES } from '../lib/constants';

export const EXTERNAL_LABELS = { weather: 'Цаг агаар', fx: 'Валютын ханш' };

export function weatherLabel(code) {
  if (code === 0) return 'Цэлмэг';
  if (code <= 2) return 'Багавтар үүлтэй';
  if (code === 3) return 'Үүлэрхэг';
  if (code === 45 || code === 48) return 'Манантай';
  if (code >= 51 && code <= 57) return 'Шиврээ бороо';
  if (code >= 61 && code <= 67) return 'Бороо';
  if (code >= 71 && code <= 77) return 'Цас';
  if (code >= 80 && code <= 82) return 'Аадар бороо';
  if (code === 85 || code === 86) return 'Цасан шуурга';
  if (code >= 95) return 'Аянга цахилгаантай';
  return 'Тодорхойгүй';
}

function parseWeather(json, s) {
  const c = json?.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new Error('Хариуны бүтэц таарахгүй байна');
  const condition = weatherLabel(c.weather_code);
  return [{
    type: 'weather', key: s.city, value: `${Math.round(c.temperature_2m)}°C, ${condition}`,
    temp: c.temperature_2m, code: c.weather_code, condition, source: s.sourceName, fetchedAt: now(),
  }];
}

function parseFx(json, s) {
  const rates = json?.rates;
  if (!rates || !rates.MNT) throw new Error('Хариуны бүтэц таарахгүй байна (MNT ханш алга)');
  return s.currencies
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c && c !== 'MNT' && rates[c])
    .map((c) => ({
      type: 'fx', key: c, value: (rates.MNT / rates[c]).toFixed(2), source: s.sourceName,
      sourceDate: json.time_last_update_utc || null, fetchedAt: now(),
    }));
}

function isDue(type) {
  const s = getDb().settings[type];
  if (!s.lastAttemptAt) return true;
  const waitMin = s.lastError ? Math.min(5, s.intervalMin) : s.intervalMin;
  return Date.now() - new Date(s.lastAttemptAt).getTime() >= waitMin * 60000;
}

// Supabase горимд хуваалцсан хүснэгтэд зөвхөн админ бичнэ; бусад зочин зөвхөн өөрийн браузерт шинэчилнэ
const shared = () => ({ sync: !isRemote || getCurrentUser()?.role === 'admin' });

const inflight = {};
export function refreshExternal(type, { force = false } = {}) {
  if (!force && (!isDue(type) || !navigator.onLine)) return Promise.resolve();
  if (inflight[type]) return inflight[type];
  inflight[type] = (async () => {
    const s = getDb().settings[type];
    const label = EXTERNAL_LABELS[type];
    try {
      const url = s.url.replace('{KEY}', encodeURIComponent(s.apiKey || ''));
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = type === 'weather' ? parseWeather(json, s) : parseFx(json, s);
      if (!rows.length) throw new Error('Хоосон хариу ирлээ');
      await mutate((d) => {
        d.external = d.external.filter((r) => r.type !== type);
        rows.forEach((r) => d.external.push({ id: nextId(d, 'external'), ...r }));
        const st = d.settings[type];
        if (st.lastError) addLog(d, 0, 'API сэргэсэн', label);
        st.lastAttemptAt = now();
        st.lastSuccessAt = now();
        st.lastError = null;
      }, shared());
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Хариу өгөх хугацаа хэтэрсэн' : e.message || 'Холболтын алдаа';
      await mutate((d) => {
        const st = d.settings[type];
        // 2а: сүүлд амжилттай татсан өгөгдлийг хэвээр үлдээж, админд мэдэгдэнэ
        if (!st.lastError) {
          notifyRole(d, ROLES.ADMIN, `${label}-ын API хариу өгөхгүй байна (${msg}). Сүүлд амжилттай татсан өгөгдлийг харуулж байна.`);
          addLog(d, 0, 'API алдаа', `${label}: ${msg}`);
        }
        st.lastAttemptAt = now();
        st.lastError = msg;
        st.lastErrorAt = now();
      }, shared()).catch(() => {});
    } finally {
      inflight[type] = null;
    }
  })();
  return inflight[type];
}
