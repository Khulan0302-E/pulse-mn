// FR-CNT-001 ноорог оруулах маягт (сэтгүүлч, редакторын засварт хоёуланд нь ашиглана)
import { useEffect, useRef, useState } from 'react';
import { Upload, X, Video, LayoutGrid } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getDb } from '../lib/db';
import { CATEGORIES, LOCATIONS, MEDIA_HINT, MAX_MEDIA_PER_NEWS, LIMITS } from '../lib/constants';
import { validateFile, uid } from '../lib/files';
import { Field, MediaView } from './ui';
import MediaLayoutPicker from './MediaLayoutPicker';
import RichTextEditor from './RichTextEditor';
import { layoutLabel } from './MediaGallery';

function LocationFields({ value, onChange, error }) {
  const db = getDb();
  const current = db.locations.find((l) => l.id === Number(value));
  const [aimag, setAimag] = useState(current?.aimag || '');
  useEffect(() => {
    if (current && current.aimag !== aimag) setAimag(current.aimag);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const sums = db.locations.filter((l) => l.aimag === aimag);
  return (
    <>
      <Field label="Аймаг / нийслэл" required error={error && !aimag ? error : null}>
        <select className="select" value={aimag} onChange={(e) => { setAimag(e.target.value); onChange(''); }}>
          <option value="">Сонгох</option>
          {Object.keys(LOCATIONS).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
      <Field label="Сум / дүүрэг" required error={error && aimag ? error : null}>
        <select className="select" value={value || ''} disabled={!aimag} onChange={(e) => onChange(e.target.value)}>
          <option value="">{aimag ? 'Сонгох' : 'Эхлээд аймгаа сонгоно'}</option>
          {sums.map((l) => <option key={l.id} value={l.id}>{l.sum}</option>)}
        </select>
      </Field>
    </>
  );
}

function Tile({ media, onRemove }) {
  return (
    <div className="file-tile">
      <div className="thumb">
        <MediaView media={media} />
        {media.type === 'video' && <span className="thumb-tag"><Video size={12} /> Бичлэг</span>}
      </div>
      <div className="name" title={media.name || media.file?.name}>{media.name || media.file?.name}</div>
      <button type="button" className="rm" onClick={onRemove} aria-label="Хасах"><X size={14} /></button>
    </div>
  );
}

export default function NewsForm({
  form, set, errors = {}, existingMedia = [], removed, setRemoved, newFiles, setNewFiles, showConsent = true,
}) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [picker, setPicker] = useState(false);
  const keptMedia = existingMedia.filter((m) => !removed.includes(m.id));
  // Зураг/бичлэгийг сэтгүүлчийн сонгосон дарааллаар (form.mediaOrder) жагсаана
  const items = [
    ...keptMedia.map((m) => ({ ...m, key: `m${m.id}`, existing: true })),
    ...newFiles.map((f) => ({ ...f, existing: false })),
  ];
  const order = form.mediaOrder || [];
  const rank = (k) => (order.includes(k) ? order.indexOf(k) : order.length + items.findIndex((x) => x.key === k));
  const ordered = [...items].sort((a, b) => rank(a.key) - rank(b.key));

  const addFiles = async (list) => {
    let count = keptMedia.length + newFiles.length;
    const added = [];
    for (const file of Array.from(list)) {
      if (count >= MAX_MEDIA_PER_NEWS) {
        toast.error(`Нэг мэдээнд ${MAX_MEDIA_PER_NEWS}-аас ихгүй файл хавсаргана.`);
        break;
      }
      const r = await validateFile(file, 'media');
      if (!r.ok) {
        toast.error(r.error);
        continue;
      }
      added.push({ key: uid(), file, name: file.name, type: r.type, sizeMB: r.sizeMB, preview: URL.createObjectURL(file) });
      count++;
    }
    if (added.length) setNewFiles((p) => [...p, ...added]);
  };

  return (
    <div className="form-grid">
      <Field label="Гарчиг" required error={errors.title} hint={`${form.title.length}/${LIMITS.title}`}>
        <input className="input input-lg" maxLength={LIMITS.title} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Мэдээний гарчиг" />
      </Field>

      <div className="form-row-3">
        <Field label="Мэдээний төрөл" required error={errors.categoryId}>
          <select className="select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Сонгох</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <LocationFields value={form.locationId} onChange={(v) => set('locationId', v)} error={errors.locationId} />
      </div>

      <Field label="Агуулга" required error={errors.content} hint="Текстээ сонгоод фонт, хэмжээ, тод (Ctrl+B), налуу (Ctrl+I)-г сонгоно. Enter дарж шинэ догол мөр эхэлнэ.">
        <RichTextEditor value={form.content} onChange={(v) => set('content', v)} placeholder="Мэдээний агуулга…" invalid={Boolean(errors.content)} />
      </Field>

      <Field label="Зураг, дүрс бичлэг" hint={MEDIA_HINT}>
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          role="button"
          tabIndex={0}
        >
          <Upload size={22} />
          <span><strong>Файл сонгох</strong> эсвэл энд чирж оруулна уу</span>
          <input ref={inputRef} type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>
        {ordered.length > 0 && (
          <div className="file-list">
            {ordered.map((m) => (
              <Tile key={m.key} media={m} onRemove={() => (m.existing
                ? setRemoved((r) => [...r, m.id])
                : setNewFiles((p) => p.filter((x) => x.key !== m.key)))} />
            ))}
          </div>
        )}
        {ordered.length > 1 && (
          <button type="button" className="btn btn-secondary btn-sm mt-8 layout-btn" onClick={() => setPicker(true)}>
            <LayoutGrid size={15} /> Байршил: <strong>{layoutLabel(form.mediaLayout)}</strong> · Өөрчлөх
          </button>
        )}
        {picker && (
          <MediaLayoutPicker items={ordered} layout={form.mediaLayout}
            onSave={({ layout, order: o }) => { set('mediaLayout', layout); set('mediaOrder', o); }}
            onClose={() => setPicker(false)} />
        )}
      </Field>

      <Field label="Эх сурвалж" error={errors.source} hint="Мэдээллийг хаанаас авсан: байгууллага, баримт бичиг, ярилцлага, холбоос">
        <input className="input" maxLength={LIMITS.source} value={form.source} disabled={form.sourceConfidential}
          onChange={(e) => set('source', e.target.value)} placeholder="Жишээ: Аймгийн ЗДТГ-ын албан мэдэгдэл" />
      </Field>
      <label className="check">
        <input type="checkbox" checked={form.sourceConfidential} onChange={(e) => set('sourceConfidential', e.target.checked)} />
        <span>Эх сурвалжийг хууль тогтоомж, редакцийн бодлогын дагуу нууцлах</span>
      </label>

      {showConsent && (
        <div className={`consent ${errors.copyrightConsent ? 'has-error' : ''}`}>
          <label className="check">
            <input type="checkbox" checked={form.copyrightConsent} onChange={(e) => set('copyrightConsent', e.target.checked)} />
            <span>
              Хавсаргасан бичвэр, зураг, бичлэг нь миний бүтээл эсвэл ашиглах зөвшөөрөлтэй бөгөөд Pulse.mn-д нийтлэх
              лиценз олгож байгааг баталж байна. <span className="muted">(Зохиогчийн эрхийн тухай хууль)</span>
            </span>
          </label>
          {errors.copyrightConsent && <div className="field-error">{errors.copyrightConsent}</div>}
        </div>
      )}
    </div>
  );
}
