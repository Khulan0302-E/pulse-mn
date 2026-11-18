// Зураг, бичлэгийн байршлын цонх:
//  • зургийн дараалал
//  • текст дэх байрлал — нийтлэлийн харагдац дээр зургийг хулганаар чирж хүссэн газарт буулгана
//    (гар, утсаар ашиглахад зураг бүрийн доорх сонголт ажиллана)
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Star, GripVertical } from 'lucide-react';
import { Modal, MediaView } from './ui';
import MediaGallery from './MediaGallery';
import { placementOptions } from '../lib/placement';
import { renderHtml } from '../lib/richtext';

/** items: [{key, ...media}], content: мэдээний агуулга (HTML), onSave({layout, order, placement}) */
export default function MediaLayoutPicker({ items, layout, content = '', placements = {}, onSave, onClose }) {
  // Цомгийн хэлбэр сонгох хэсгийг хассан; хадгалсан хэлбэр (анхдагч нь «Автомат») хэвээр ажиллана
  const sel = layout || 'auto';
  const [list, setList] = useState(items);
  const [place, setPlace] = useState(() => Object.fromEntries(items.map((m) => [m.key, placements[m.key] || 'top'])));
  const [dragKey, setDragKey] = useState(null);
  const [over, setOver] = useState(null);

  const paragraphs = renderHtml(content).match(/<p\b[\s\S]*?<\/p>/g) || [];
  const options = placementOptions(paragraphs.length);
  // Буулгах цэгүүд: текстийн өмнө, догол мөр бүрийн дараа, төгсгөлд
  const slotAfter = (i) => (i === paragraphs.length - 1 ? 'end' : `p${i + 1}`);
  const groupOf = (slot) => list.filter((m) => {
    const p = place[m.key] || 'top';
    if (!paragraphs.length) return true; // текстгүй бол бүгд эхэнд
    if (slot === 'end') return p === 'end' || (p.startsWith('p') && Number(p.slice(1)) >= paragraphs.length);
    return p === slot;
  });

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  const toFront = (i) => setList([list[i], ...list.filter((_, j) => j !== i)]);

  const dragProps = (m) => ({
    draggable: true,
    title: 'Чирж текстийн өөр газарт тавина',
    onDragStart: (e) => {
      e.dataTransfer.setData('text/plain', m.key);
      e.dataTransfer.effectAllowed = 'move';
      setDragKey(m.key);
    },
    onDragEnd: () => {
      setDragKey(null);
      setOver(null);
    },
  });
  const dropProps = (slot) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (over !== slot) setOver(slot);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOver((o) => (o === slot ? null : o));
    },
    onDrop: (e) => {
      e.preventDefault();
      const key = e.dataTransfer.getData('text/plain') || dragKey;
      if (key) setPlace((p) => ({ ...p, [key]: slot }));
      setDragKey(null);
      setOver(null);
    },
  });

  // Энгийн функц (компонент биш) — чирэх үед DOM дахин үүсгэгдэж чирэлт тасрахаас сэргийлнэ
  const renderZone = (slot, label) => {
    const group = groupOf(slot);
    return (
      <div key={`zone-${slot}`} className={`mlp-zone ${group.length ? 'has' : 'is-empty'} ${dragKey ? 'dragging' : ''} ${over === slot ? 'over' : ''}`} {...dropProps(slot)}>
        {group.length > 0 ? (
          <MediaGallery media={group} layout={sel} compact itemProps={dragProps} />
        ) : (
          <span className="mlp-zone-hint">Энд буулгана · {label}</span>
        )}
      </div>
    );
  };

  return (
    <Modal wide title="Зураг, бичлэгийн байршил" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Болих</button>
        <button className="btn btn-primary" onClick={() => { onSave({ layout: sel, order: list.map((x) => x.key), placement: place }); onClose(); }}>Хадгалах</button>
      </>}>
      <div className="mlp">
        <div className="mlp-side">
          <h4>Зургууд</h4>
          <p className="muted small">Зургийг баруун талын нийтлэл рүү <strong>чирж</strong> хүссэн газартаа тавина. Сумаар дарааллыг сольж, ☆ дарж нүүр зураг болгоно.</p>
          <div className="mlp-order">
            {list.map((m, i) => (
              <div key={m.key} className={`mlp-item ${dragKey === m.key ? 'is-dragging' : ''}`}>
                <div className="mlp-thumb" {...dragProps(m)}>
                  <MediaView media={m} />
                  <span className="mlp-idx">{i + 1}</span>
                  <span className="mlp-grip" aria-hidden="true"><GripVertical size={14} /></span>
                  <div className="mlp-tools">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Өмнө нь"><ArrowLeft size={13} /></button>
                    <button type="button" onClick={() => toFront(i)} disabled={i === 0} aria-label="Нүүр зураг болгох" title="Нүүр зураг болгох"><Star size={13} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Дараа нь"><ArrowRight size={13} /></button>
                  </div>
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
          <h4>Нийтлэл дээр ингэж харагдана</h4>
          <div className={`mlp-stage mlp-article ${dragKey ? 'is-dragging' : ''}`}>
            {paragraphs.length === 0 ? (
              <>
                <MediaGallery media={list} layout={sel} compact />
                <p className="muted small mt-16">Агуулгаа бичсэний дараа зургийг догол мөрийн хооронд чирж байрлуулах боломжтой болно.</p>
              </>
            ) : (
              <>
                {renderZone('top', 'текстийн өмнө')}
                {paragraphs.map((p, i) => (
                  <div key={i}>
                    <div className="mlp-para" dangerouslySetInnerHTML={{ __html: p }} />
                    {renderZone(slotAfter(i), i === paragraphs.length - 1 ? 'текстийн төгсгөлд' : `${i + 1}-р догол мөрийн дараа`)}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
