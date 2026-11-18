// Монгол Улсын интерактив газрын зураг: аймаг дээр дарахад тухайн аймгийн мэдээ рүү орно.
// Өнгө нь нийтлэгдсэн мэдээний тоогоор (их байх тусам тод) будагдана.
import { useState } from 'react';
import { MAP_VIEWBOX, AIMAG_SHAPES } from '../lib/mongoliaMap';

const SHORT = { 'Баян-Өлгий': 'Б-Өлгий', 'Говь-Алтай': 'Г-Алтай' };

function shade(count, max) {
  if (!count) return 'var(--map-0)';
  const r = count / max;
  if (r > 0.66) return 'var(--map-3)';
  if (r > 0.33) return 'var(--map-2)';
  return 'var(--map-1)';
}

/**
 * @param {{counts: Record<string, number>, selected?: string, onSelect: (aimag: string) => void, compact?: boolean}} props
 */
export default function MongoliaMap({ counts = {}, selected, onSelect, compact = false }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...Object.values(counts));
  const tip = hover ? AIMAG_SHAPES.find((a) => a.name === hover) : null;
  const [, , vw, vh] = MAP_VIEWBOX.split(' ').map(Number);

  return (
    <div className={`mn-map ${compact ? 'compact' : ''}`}>
      <svg viewBox={MAP_VIEWBOX} role="group" aria-label="Монгол Улсын газрын зураг — аймгаа сонгоно уу">
        {AIMAG_SHAPES.map((a) => {
          const n = counts[a.name] || 0;
          return (
            <path
              key={a.name}
              d={a.d}
              className={`mn-aimag ${selected === a.name ? 'is-selected' : ''} ${hover === a.name ? 'is-hover' : ''}`}
              style={{ fill: shade(n, max) }}
              tabIndex={0}
              role="link"
              aria-label={`${a.name}: ${n} мэдээ`}
              onClick={() => onSelect(a.name)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(a.name))}
              onMouseEnter={() => setHover(a.name)}
              onMouseLeave={() => setHover((h) => (h === a.name ? null : h))}
              onFocus={() => setHover(a.name)}
              onBlur={() => setHover((h) => (h === a.name ? null : h))}
            />
          );
        })}
        {!compact &&
          AIMAG_SHAPES.filter((a) => !a.small).map((a) => (
            <text key={a.name} x={a.x} y={a.y} className={`mn-label ${selected === a.name ? 'is-selected' : ''}`}>
              {SHORT[a.name] || a.name}
            </text>
          ))}
        {/* Нийслэл маш жижиг тул тусгай тэмдэглэгээ */}
        {(() => {
          const ub = AIMAG_SHAPES.find((a) => a.name === 'Улаанбаатар');
          return ub ? <circle cx={ub.x} cy={ub.y} r={compact ? 7 : 5} className="mn-capital" onClick={() => onSelect(ub.name)} /> : null;
        })()}
      </svg>
      {tip && (
        <div className="mn-tip" style={{ left: `${(tip.x / vw) * 100}%`, top: `${(tip.y / vh) * 100}%` }} aria-hidden="true">
          <strong>{tip.name}</strong>
          <span>{counts[tip.name] || 0} мэдээ</span>
        </div>
      )}
      <div className="mn-legend" aria-hidden="true">
        <span><i style={{ background: 'var(--map-0)' }} /> Мэдээгүй</span>
        <span><i style={{ background: 'var(--map-1)' }} /> Цөөн</span>
        <span><i style={{ background: 'var(--map-3)' }} /> Олон</span>
      </div>
    </div>
  );
}
