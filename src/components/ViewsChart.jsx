// Өдөр тутмын үзэлтийн шугаман график (нэг цуваа). Хулганаар заахад өдөр, тоо харагдана.
import { useMemo, useRef, useState } from 'react';

const W = 720;
const H = 260;
const PAD = { l: 44, r: 16, t: 16, b: 30 };

const niceMax = (v) => {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (p / 2)) * (p / 2);
};
const shortDay = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export default function ViewsChart({ points, label = 'Үзэлт' }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const max = useMemo(() => niceMax(Math.max(0, ...points.map((p) => p.v))), [points]);
  const n = points.length;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => PAD.t + ih - (v / max) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = n ? `${path} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const every = Math.max(1, Math.ceil(n / 8));

  const onMove = (e) => {
    const box = ref.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - PAD.l) / iw) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  const h = hover != null ? points[hover] : null;

  return (
    <div className="views-chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: өдөр тутмын график`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="vc-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} className="vc-axis" textAnchor="end">{t.toLocaleString('en-US')}</text>
          </g>
        ))}
        {points.map((p, i) => (i % every === 0 || i === n - 1) && (
          <text key={p.day} x={x(i)} y={H - 8} className="vc-axis" textAnchor="middle">{shortDay(p.day)}</text>
        ))}
        <path d={area} className="vc-area" />
        <path d={path} className="vc-line" />
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} className="vc-cross" />
            <circle cx={x(hover)} cy={y(h.v)} r={5} className="vc-dot" />
          </g>
        )}
      </svg>
      {h && (
        <div className="vc-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <span className="muted small">{h.day}</span>
          <strong>{h.v.toLocaleString('en-US')}</strong> <span className="small">{label.toLowerCase()}</span>
        </div>
      )}
    </div>
  );
}
