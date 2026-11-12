// Facebook шиг: олон зураг/бичлэг оруулахад байршлаа сонгож, дарааллаа өөрчлөх цонх
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { Modal, MediaView } from './ui';
import MediaGallery, { LAYOUTS } from './MediaGallery';

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

/** items: [{key, ...media}], value: {layout, order}, onSave({layout, order}) */
export default function MediaLayoutPicker({ items, layout, onSave, onClose }) {
  const [sel, setSel] = useState(layout || 'auto');
  const [list, setList] = useState(items);
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
        <button className="btn btn-primary" onClick={() => { onSave({ layout: sel, order: list.map((x) => x.key) }); onClose(); }}>Хадгалах</button>
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
          <h4 className="mt-16">Дараалал</h4>
          <p className="muted small">Сумаар байрыг нь сольж, ☆ дарж нүүр (эхний) зураг болгоно.</p>
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
