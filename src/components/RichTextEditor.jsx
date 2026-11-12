// Мэдээний агуулга бичих талбар: фонт, хэмжээ, тод (Ctrl+B), налуу (Ctrl+I), доогуур зураас (Ctrl+U)
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, RemoveFormatting } from 'lucide-react';
import { FONTS, SIZES, sanitizeRich, renderHtml } from '../lib/richtext';

const MARKER = 'pulse-marker';

export default function RichTextEditor({ value, onChange, placeholder, invalid }) {
  const ref = useRef(null);
  const last = useRef(null);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false, font: '', size: '' });

  // Гаднаас ирсэн утгыг (анх ачаалах, түр хадгалснаас сэргээх) талбарт тусгана
  useEffect(() => {
    if (!ref.current || value === last.current) return;
    ref.current.innerHTML = renderHtml(value || '');
    last.current = value;
  }, [value]);

  const emit = () => {
    const html = sanitizeRich(ref.current.innerHTML);
    last.current = html;
    onChange(html);
  };

  const refresh = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !ref.current?.contains(sel.anchorNode)) return;
    let el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    let font = '';
    let size = '';
    while (el && el !== ref.current) {
      el.classList?.forEach((c) => {
        if (!font && c.startsWith('rt-f-')) font = c.slice(5);
        if (!size && c.startsWith('rt-s-')) size = c.slice(5);
      });
      el = el.parentElement;
    }
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      font,
      size,
    });
  };

  useEffect(() => {
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = (cmd, arg) => {
    ref.current.focus();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand(cmd, false, arg);
    emit();
    refresh();
  };

  // Фонт/хэмжээ: execCommand-ийн <font> тагийг манай зөвшөөрсөн класстай <span> болгоно
  const applyClass = (prefix, id) => {
    ref.current.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.isCollapsed) return;
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontName', false, MARKER);
    ref.current.querySelectorAll(`font[face="${MARKER}"]`).forEach((f) => {
      const span = document.createElement('span');
      // Доторх ижил төрлийн классыг арилгаж, шинийг онооно
      f.querySelectorAll(`[class*="${prefix}"]`).forEach((x) => x.classList.forEach((c) => c.startsWith(prefix) && x.classList.remove(c)));
      if (id) span.className = `${prefix}${id}`;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
    emit();
    refresh();
  };

  const onPaste = (e) => {
    // Өөр газраас хуулсан форматыг авахгүй, зөвхөн текст
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const onKeyDown = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'i' || k === 'u') {
      e.preventDefault();
      exec({ b: 'bold', i: 'italic', u: 'underline' }[k]);
    }
  };

  return (
    <div className={`rte ${invalid ? 'has-error' : ''}`}>
      <div className="rte-bar" role="toolbar" aria-label="Текстийн формат">
        <select className="select sm" value={active.font} onChange={(e) => applyClass('rt-f-', e.target.value)} aria-label="Фонт" title="Фонт (эхлээд текстээ сонгоно)">
          <option value="">Фонт</option>
          {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select className="select sm" value={active.size} onChange={(e) => applyClass('rt-s-', e.target.value === 'md' ? '' : e.target.value)} aria-label="Хэмжээ" title="Хэмжээ (эхлээд текстээ сонгоно)">
          <option value="">Хэмжээ</option>
          {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span className="rte-sep" />
        <button type="button" className={active.bold ? 'on' : ''} aria-pressed={active.bold} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} title="Тод (Ctrl+B)" aria-label="Тод"><Bold size={16} /></button>
        <button type="button" className={active.italic ? 'on' : ''} aria-pressed={active.italic} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} title="Налуу (Ctrl+I)" aria-label="Налуу"><Italic size={16} /></button>
        <button type="button" className={active.underline ? 'on' : ''} aria-pressed={active.underline} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} title="Доогуур зураас (Ctrl+U)" aria-label="Доогуур зураас"><Underline size={16} /></button>
        <span className="rte-sep" />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { applyClass('rt-f-', ''); applyClass('rt-s-', ''); exec('removeFormat'); }} title="Форматыг арилгах" aria-label="Форматыг арилгах"><RemoveFormatting size={16} /></button>
      </div>
      <div
        ref={ref}
        className="rte-area article-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Мэдээний агуулга"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onKeyUp={refresh}
        onMouseUp={refresh}
      />
    </div>
  );
}
