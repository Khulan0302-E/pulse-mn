// NFR-PERF-002: Холболт тасарсан үед илгээх гэсэн мэдээллийг түр хадгалж,
// холболт сэргэхэд автоматаар дахин илгээнэ.
import { uid } from './files';

const KEY = 'pulse_outbox';

export function getOutbox() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function enqueue(item) {
  const list = getOutbox();
  list.push({ ...item, id: uid(), queuedAt: new Date().toISOString() });
  save(list);
}

let flushing = false;
/** @param {(item:any)=>Promise<any>} processor */
export async function flushOutbox(processor) {
  if (flushing) return { sent: 0, failed: [] };
  flushing = true;
  let sent = 0;
  const failed = [];
  try {
    for (const item of getOutbox()) {
      try {
        await processor(item);
        sent++;
      } catch (e) {
        failed.push({ item, error: e.message });
      }
      // Амжилттай болон бизнес дүрмээр унасан (дахин оролдоод нэмэргүй) зүйлсийг хасна
      save(getOutbox().filter((x) => x.id !== item.id));
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}
