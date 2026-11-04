const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

export function fmtDate(iso, { time = true } = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return time ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

export function fmtLongDate(d = new Date()) {
  return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS[d.getDay()]} гараг`;
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'Дөнгөж сая';
  if (s < 3600) return `${Math.floor(s / 60)} минутын өмнө`;
  if (s < 86400) return `${Math.floor(s / 3600)} цагийн өмнө`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} өдрийн өмнө`;
  return fmtDate(iso, { time: false });
}

/** datetime-local input-д тохирох утга */
export function toLocalInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function initials(name = '') {
  const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || '?';
  return last.slice(0, 2).toUpperCase();
}

export function excerpt(text = '', n = 160) {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}
