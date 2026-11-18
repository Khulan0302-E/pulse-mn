// Зургийн текст доторх байрлал: top | p1, p2, … (N-р догол мөрийн дараа) | end
import { renderHtml } from './richtext';

export const paragraphCount = (content) => (renderHtml(content || '').match(/<p\b/g) || []).length;

export function placementOptions(count) {
  const opts = [{ value: 'top', label: 'Текстийн өмнө' }];
  for (let i = 1; i < count; i++) opts.push({ value: `p${i}`, label: `${i}-р догол мөрийн дараа` });
  opts.push({ value: 'end', label: 'Текстийн төгсгөлд' });
  return opts;
}

export function placementLabel(p) {
  if (!p || p === 'top') return 'Эхэнд';
  if (p === 'end') return 'Төгсгөлд';
  return `${p.slice(1)}-р догол мөрийн дараа`;
}
