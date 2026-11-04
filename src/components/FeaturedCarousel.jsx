// «Онцлох мэдээ» карусель.
// 21st.dev-ийн «Connected Carousel» (CalendlyCarousel) компонентоос санаа авч,
// Next.js / Tailwind / framer-motion-гүйгээр манай CSS-ээр дахин бичсэн.
// Идэвхтэй картын хоёр талд «холбогдсон» жижиг картууд, автомат гүйлт, явцын зураас,
// ← → товчлуур, хажуугийн карт дээр дарж шилжих боломжтой.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { excerpt, timeAgo } from '../lib/format';
import { locationLabel, userById } from '../api/news';
import { CatLabel } from './NewsCard';
import Cover from './Cover';

const OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const NOTCH_BIG =
  'M0 0C0 0 1.2422 13.5759 10 13.5759C18.7578 13.5759 20 0 20 0V37.3338C20 37.3338 18.7578 23.7578 10 23.7578C1.2422 23.7578 0 37.3338 0 37.3338V0Z';
const NOTCH_SMALL =
  'M0 0C0 0 0.993759 10.1818 8 10.1818C15.0062 10.1818 16 0 16 0V28C16 28 15.0062 17.8182 8 17.8182C0.993759 17.8182 0 28 0 28V0Z';

/** Контейнерын өргөнөөс хамааран картуудын хэмжээ */
function computeLayout(W) {
  if (W >= 980) {
    const side = { w: 104, h: 320 };
    const far = { w: 72, h: 190 };
    const g1 = 20;
    const g2 = 16;
    return { tier: 'desktop', active: { w: Math.min(780, W - 2 * (g1 + side.w + g2 + far.w) - 8), h: 460 }, side, far, g1, g2 };
  }
  if (W >= 640) {
    const side = { w: 84, h: 320 };
    const g1 = 16;
    return { tier: 'tablet', active: { w: Math.min(640, W - 2 * (g1 + side.w) - 8), h: 420 }, side, far: null, g1, g2: 0 };
  }
  const side = { w: 34, h: 400 };
  const g1 = 10;
  return { tier: 'mobile', active: { w: W - 2 * (g1 + side.w) - 4, h: 500 }, side, far: null, g1, g2: 0 };
}

function variant(offset, L) {
  const { active: A, side: S, far: F, g1, g2 } = L;
  if (offset === 0) return { x: -A.w / 2, y: -A.h / 2, w: A.w, h: A.h, opacity: 1, z: 1, visible: true };
  if (Math.abs(offset) === 1) {
    const x = offset < 0 ? -A.w / 2 - g1 - S.w : A.w / 2 + g1;
    return { x, y: -S.h / 2, w: S.w, h: S.h, opacity: 1, z: 2, visible: true };
  }
  if (F && Math.abs(offset) === 2) {
    const x = offset < 0 ? -A.w / 2 - g1 - S.w - g2 - F.w : A.w / 2 + g1 + S.w + g2;
    return { x, y: -F.h / 2, w: F.w, h: F.h, opacity: 1, z: 2, visible: true };
  }
  const small = F || S;
  const edge = A.w / 2 + g1 + S.w + (F ? g2 + F.w : 0) + 140;
  return { x: offset < 0 ? -edge - small.w : edge, y: -small.h / 2, w: small.w, h: small.h, opacity: 0, z: 0, visible: false };
}

function Notch({ big, side }) {
  const size = big ? { width: 22, height: 42 } : { width: 18, height: 28 };
  return (
    <div className="cc-notch" aria-hidden="true" style={{ ...size, [side]: 'calc(100% - 1px)' }}>
      <svg viewBox={big ? '0 0 20 37.3338' : '0 0 16 28'} preserveAspectRatio="none">
        <path d={big ? NOTCH_BIG : NOTCH_SMALL} />
      </svg>
    </div>
  );
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function FeaturedCarousel({ items, autoPlayInterval = 6000, pauseOnHover = true }) {
  const db = useDb();
  const rootRef = useRef(null);
  const fillRef = useRef(null);
  const elapsedRef = useRef(0);
  const lastRef = useRef(null);
  const [width, setWidth] = useState(1152);
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);

  const total = items.length;
  const activeIndex = ((page % total) + total) % total;
  const L = computeLayout(width);

  // Контейнерын өргөнийг хэмжинэ (цонхны биш — sidebar-тай байсан ч зөв ажиллана)
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = useCallback((delta) => {
    elapsedRef.current = 0;
    lastRef.current = null;
    if (fillRef.current) fillRef.current.style.transform = 'scaleX(0)';
    setPage((p) => p + delta);
  }, []);

  // Автомат гүйлт. Явцын зураасыг state-гүйгээр шууд шинэчилнэ (карт бүрийг 60fps-ээр дахин зурахгүй)
  useEffect(() => {
    if (total < 2 || prefersReducedMotion() || (pauseOnHover && hovered)) {
      lastRef.current = null;
      return undefined;
    }
    let raf;
    const step = (t) => {
      if (lastRef.current === null) lastRef.current = t;
      elapsedRef.current += t - lastRef.current;
      lastRef.current = t;
      if (elapsedRef.current >= autoPlayInterval) {
        go(1);
        return;
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${elapsedRef.current / autoPlayInterval})`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      lastRef.current = null;
    };
  }, [page, hovered, pauseOnHover, autoPlayInterval, total, go]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };

  const selectTab = (idx) => {
    let diff = idx - activeIndex;
    if (diff > total / 2) diff -= total;
    else if (diff < -total / 2) diff += total;
    if (diff) go(diff);
  };

  return (
    <div
      ref={rootRef}
      className={`cc is-${L.tier}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Онцлох мэдээ"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="cc-stage" id="cc-panel" aria-live="polite" style={{ height: L.active.h + 40 }}>
        {OFFSETS.map((offset) => {
          const virtualIndex = page + offset;
          const n = items[((virtualIndex % total) + total) % total];
          const isActive = offset === 0;
          const v = variant(offset, L);
          const author = userById(db, n.journalistId);
          return (
            <div
              key={virtualIndex}
              className={`cc-card ${isActive ? 'is-active' : 'is-side'}`}
              style={{
                width: v.w,
                height: v.h,
                opacity: v.opacity,
                zIndex: v.z,
                transform: `translate(${v.x}px, ${v.y}px)`,
                pointerEvents: v.visible ? 'auto' : 'none',
              }}
              onClick={isActive ? undefined : () => go(offset)}
              aria-hidden={!isActive}
            >
              {offset === -1 && <Notch big side="left" />}
              {offset === 1 && <Notch big side="right" />}
              {offset === -2 && L.far && <Notch side="left" />}
              {offset === 2 && L.far && <Notch side="right" />}

              <div className="cc-inner">
                {/* Хажуугийн картад зөвхөн зураг харагдана */}
                <div className="cc-peek" style={{ opacity: isActive ? 0 : 1 }}>
                  <Cover news={n} />
                </div>

                {/* Идэвхтэй картын агуулга — хэмжээ нь тогтмол тул шилжих үед текст хөдлөхгүй */}
                <Link
                  to={`/news/${n.id}`}
                  className="cc-content"
                  tabIndex={isActive ? 0 : -1}
                  style={{
                    width: L.active.w,
                    height: L.active.h,
                    opacity: isActive ? 1 : 0,
                    transform: `translate(-50%, -50%) translateX(${isActive ? 0 : offset < 0 ? -L.active.w : L.active.w}px)`,
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  <div className="cc-text">
                    <CatLabel id={n.categoryId} />
                    <h2 className="cc-title">{n.title}</h2>
                    <p className="cc-quote">{excerpt(n.content, L.tier === 'mobile' ? 120 : 200)}</p>
                    <div className="cc-chips">
                      <span className="cc-chip strong">{author?.fullName || 'Pulse.mn'}</span>
                      <svg className="cc-joint" viewBox="0 -2 14 12" width="14" height="10" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 -2 V0 C0 0 5.09091 0.49688 5.09091 4 C5.09091 7.50312 0 8 0 8 V10 H14 V8 C14 8 8.90909 7.50312 8.90909 4 C8.90909 0.49688 14 0 14 0 V-2 Z" />
                      </svg>
                      <span className="cc-chip">{locationLabel(db, n.locationId)} · {timeAgo(n.publishedAt)}</span>
                    </div>
                    <span className="cc-more">Унших <ArrowRight size={16} /></span>
                  </div>
                  <div className="cc-media">
                    <Cover news={n} />
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cc-tabs" role="tablist" aria-label="Онцлох мэдээнүүд">
        {items.map((n, idx) => {
          const selected = idx === activeIndex;
          return (
            <button
              key={n.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="cc-panel"
              aria-label={`${idx + 1}-р мэдээ: ${n.title}`}
              tabIndex={selected ? 0 : -1}
              className={`cc-tab ${selected ? 'is-active' : ''}`}
              onClick={() => selectTab(idx)}
            >
              {selected && <span ref={fillRef} className="cc-tab-fill" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
