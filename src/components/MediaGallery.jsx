// Нийтлэлийн зураг, бичлэгийг сэтгүүлчийн сонгосон байршлаар (layout) харуулна
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaView } from './ui';

export const LAYOUTS = [
  { id: 'auto', label: 'Автомат', hint: 'Facebook шиг: тооноос хамаарч тор болно' },
  { id: 'feature', label: 'Нэг том', hint: 'Эхний зураг том, бусад нь доор жижиг' },
  { id: 'columns', label: 'Эгнээ', hint: 'Бүгд нэг мөрөнд зэрэгцэнэ' },
  { id: 'stack', label: 'Доош дараалан', hint: 'Нэг нэгээр нь бүтэн өргөнөөр' },
  { id: 'carousel', label: 'Гүйдэг', hint: 'Нэг удаад нэгийг, сумаар гүйлгэнэ' },
];

export const layoutLabel = (id) => (LAYOUTS.find((l) => l.id === id) || LAYOUTS[0]).label;

function Carousel({ media }) {
  const [i, setI] = useState(0);
  const go = (d) => setI((x) => (x + d + media.length) % media.length);
  return (
    <div className="mg-carousel">
      <div className="mg-carousel-frame">
        <MediaView key={media[i].id || media[i].key} media={media[i]} />
        {media.length > 1 && (
          <>
            <button type="button" className="mg-nav prev" onClick={() => go(-1)} aria-label="Өмнөх"><ChevronLeft size={20} /></button>
            <button type="button" className="mg-nav next" onClick={() => go(1)} aria-label="Дараах"><ChevronRight size={20} /></button>
            <span className="mg-count">{i + 1} / {media.length}</span>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="mg-dots" role="tablist">
          {media.map((m, j) => (
            <button key={m.id || m.key} type="button" role="tab" aria-selected={j === i} className={j === i ? 'on' : ''} onClick={() => setI(j)} aria-label={`${j + 1}-р зураг`} />
          ))}
        </div>
      )}
    </div>
  );
}

/** layout: auto | feature | columns | stack | carousel */
export default function MediaGallery({ media = [], layout = 'auto', compact = false }) {
  if (!media.length) return null;
  if (media.length === 1) {
    return <div className="mg mg-single"><MediaView media={media[0]} /></div>;
  }
  const kind = LAYOUTS.some((l) => l.id === layout) ? layout : 'auto';
  if (kind === 'carousel') return <Carousel media={media} />;
  // «Автомат»: Facebook шиг 5-аас олон бол сүүлийн нүдэнд «+N» харуулна
  const max = kind === 'auto' && !compact ? 5 : media.length;
  const shown = media.slice(0, max);
  const extra = media.length - shown.length;
  return (
    <div className={`mg mg-${kind} mg-n${Math.min(shown.length, 5)}`}>
      {shown.map((m, i) => (
        <div key={m.id || m.key} className="mg-cell">
          <MediaView media={m} />
          {extra > 0 && i === shown.length - 1 && <span className="mg-more">+{extra}</span>}
        </div>
      ))}
    </div>
  );
}
