// Мэдээний агуулгын форматлалт (фонт, хэмжээ, тод, налуу, доогуур зураас).
// Агуулгыг зөвшөөрсөн цөөн HTML таг/классаар хадгална; бусад бүх зүйлийг (script, холбоос,
// style, onclick…) хаядаг тул хортой код агуулгаар дамжиж ажиллахгүй (XSS).
// Хуучин энгийн текст агуулга хэвээрээ ажиллана.

export const FONTS = [
  { id: 'sans', label: 'Үндсэн' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Моно' },
];
export const SIZES = [
  { id: 'sm', label: 'Жижиг' },
  { id: 'md', label: 'Энгийн' },
  { id: 'lg', label: 'Том' },
  { id: 'xl', label: 'Маш том' },
];
const ALLOWED_CLASSES = new Set([...FONTS.map((f) => `rt-f-${f.id}`), ...SIZES.map((s) => `rt-s-${s.id}`)]);

const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'UL', 'OL', 'PRE', 'TABLE', 'TR']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'HEAD', 'TITLE',
  'META', 'LINK', 'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'FORM', 'CANVAS']);
const MARKS = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u' };

const RICH_RE = /<\/?(p|br|strong|em|u|b|i|span|div)\b/i;
export const isRich = (s) => RICH_RE.test(s || '');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Энгийн текстийг догол мөр бүрийг <p> болгож HTML болгоно */
export function plainToHtml(text) {
  return (text || '')
    .split(/\n\s*\n|\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

/** Зөвхөн зөвшөөрсөн таг, классыг үлдээнэ. Үр дүн: <p> догол мөрүүд. */
export function sanitizeRich(html) {
  if (!isRich(html)) return plainToHtml(html);
  const src = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html').body;
  const doc = document.implementation.createHTMLDocument('');
  const out = doc.createElement('div');
  let para = null;
  const newPara = () => {
    para = doc.createElement('p');
    out.appendChild(para);
    return para;
  };

  const walk = (node, target) => {
    for (const ch of Array.from(node.childNodes)) {
      if (ch.nodeType === 3) {
        const t = ch.nodeValue;
        if (!target && !t.trim()) continue;
        (target || para || newPara()).appendChild(doc.createTextNode(t));
        continue;
      }
      if (ch.nodeType !== 1) continue;
      const tag = ch.tagName;
      if (DROP.has(tag)) continue;
      if (BLOCK.has(tag)) {
        para = null;
        walk(ch, newPara());
        para = null;
        continue;
      }
      const host = target || para || newPara();
      if (tag === 'BR') {
        host.appendChild(doc.createElement('br'));
        continue;
      }
      let el = null;
      if (MARKS[tag]) el = doc.createElement(MARKS[tag]);
      else if (tag === 'SPAN' || tag === 'FONT') {
        const classes = [...ch.classList].filter((c) => ALLOWED_CLASSES.has(c));
        if (classes.length) {
          el = doc.createElement('span');
          el.className = classes.join(' ');
        }
      }
      if (el) {
        host.appendChild(el);
        walk(ch, el);
      } else {
        walk(ch, host); // танигдаагүй тагийг задалж, текстийг нь үлдээнэ
      }
    }
  };
  walk(src, null);
  // Хоосон догол мөрийг хасна
  Array.from(out.children).forEach((p) => {
    if (!p.textContent.trim()) p.remove();
  });
  return out.innerHTML;
}

/** Агуулгаас зөвхөн текст (хайлт, товчлол, хоосон эсэхийг шалгахад) */
export function plainText(content) {
  const s = content || '';
  if (!isRich(s)) return s;
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Нийтлэлд харуулах аюулгүй HTML */
export const renderHtml = (content) => (isRich(content) ? sanitizeRich(content) : plainToHtml(content));
