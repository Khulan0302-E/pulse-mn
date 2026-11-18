// Facebook шиг: олон зураг/бичлэг оруулахад байршлаа сонгож, дарааллаа өөрчлөх цонх
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { Modal, MediaView } from './ui';
import MediaGallery, { LAYOUTS } from './MediaGallery';
import { placementOptions } from '../lib/placement';

function LayoutIcon({ id }) {
  // Байршил бүрийн жижиг дүрслэл (тор)
  const cells = {
    auto: ['a', 'b', 'c'],
    feature: ['a', 'b', 'c', 'd'],
    columns: ['a', 'b', 'c'],
    stack: ['a', 'b'],
    carousel: ['a'],
  }[id];
  return (
    <span className={`li li-${id}`} aria-hidden="true">
      {cells.map((c) => <i key={c} />)}
    </span>
  );
}

/** items: [{key, ...media}], value: {layout, order, placements}, onSave({layout, order, placement}) */
export default function MediaLayoutPicker({ items, layout, paragraphs = 0, placements = {}, onSave, onClose }) {
  const [sel, setSel] = useState(layout || 'auto');
  const [list, setList] = useState(items);
  const [place, setPlace] = useState(() => Object.fromEntries(items.map((m) => [m.key, placements[m.key] || 'top'])));
  const options = placementOptions(paragraphs);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  const toFront = (i) => setList([list[i], ...list.filter((_, j) => j !== i)]);
  return (
    <Modal wide title="Зураг, бичлэгийн байршил" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Болих</button>
        <button className="btn btn-primary" onClick={() => { onSave({ layout: sel, order: list.map((x) => x.key), placement: place }); onClose(); }}>Хадгалах</button>
      </>}>
      <div className="mlp">
        <div className="mlp-side">
          <h4>Байршил</h4>
          <div className="mlp-layouts" role="radiogroup" aria-label="Байршил">
            {LAYOUTS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={sel === l.id} className={`mlp-layout ${sel === l.id ? 'on' : ''}`} onClick={() => setSel(l.id)}>
                <LayoutIcon id={l.id} />
                <span><strong>{l.label}</strong><em>{l.hint}</em></span>
              </button>
            ))}
          </div>
          <h4 className="mt-16">Дараалал ба текст дэх байрлал</h4>
          <p className="muted small">Сумаар байрыг нь сольж, ☆ дарж нүүр (эхний) зураг болгоно. Доорх сонголтоор зураг бүрийг
            текстийн өмнө, аль нэг догол мөрийн дараа эсвэл төгсгөлд байрлуулна. Нэг байрлалтай зургууд дээрх хэлбэрээр нэг цомог болно.</p>
          <div className="mlp-order">
            {list.map((m, i) => (
              <div key={m.key} className="mlp-thumb">
                <MediaView media={m} />
                <span className="mlp-idx">{i + 1}</span>
                <div className="mlp-tools">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Өмнө нь"><ArrowLeft size={13} /></button>
                  <button type="button" onClick={() => toFront(i)} disabled={i === 0} aria-label="Нүүр зураг болгох" title="Нүүр зураг болгох"><Star size={13} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Дараа нь"><ArrowRight size={13} /></button>
                </div>
                <select className="select sm mlp-place" value={place[m.key]} aria-label={`${i + 1}-р файлын текст дэх байрлал`}
                  onChange={(e) => setPlace((p) => ({ ...p, [m.key]: e.target.value }))}>
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="mlp-preview">
          <h4>Урьдчилан харах</h4>
          <div className="mlp-stage"><MediaGallery media={list} layout={sel} /></div>
        </div>
      </div>
    </Modal>
  );
}
