// «Сүүлийн мэдээ» — 21st.dev-ийн Team Showcase загвараас санаа авсан.
// Зүүн талд нэг том зураг, баруун талд гарчгийн жагсаалт.
// Гарчиг дээр хулгана аваачихад (эсвэл Tab-аар очиход) зураг тухайн мэдээнийх болж зөөлөн солигдоно.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { timeAgo } from '../lib/format';
import { categoryName, locationLabel } from '../api/news';
import { CatLabel } from './NewsCard';
import Cover from './Cover';

export default function LatestShowcase({ items }) {
  const db = useDb();
  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const [pointing, setPointing] = useState(false); // жагсаалт дээр хулгана байгаа эсэх
  const active = items.find((n) => n.id === activeId) || items[0];
  if (!active) return null;

  return (
    <div className="ls">
      <Link to={`/news/${active.id}`} className="ls-stage" aria-label={active.title}>
        {/* Бүх зургийг давхарлаж, идэвхтэйг нь л харуулна — солигдохдоо зөөлөн уусна */}
        {items.map((n) => (
          <div key={n.id} className={`ls-slide ${n.id === active.id ? 'is-active' : ''}`} aria-hidden={n.id !== active.id}>
            <Cover news={n} />
          </div>
        ))}
        <span className="ls-stage-cat"><CatLabel id={active.categoryId} /></span>
      </Link>

      <ul className={`ls-list ${pointing ? 'is-pointing' : ''}`} onMouseEnter={() => setPointing(true)} onMouseLeave={() => setPointing(false)}>
        {items.map((n) => (
          <li key={n.id}>
            <Link
              to={`/news/${n.id}`}
              className={`ls-row ${n.id === active.id ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveId(n.id)}
              onFocus={() => setActiveId(n.id)}
            >
              <span className="ls-title-line">
                <span className="ls-bar" aria-hidden="true" />
                <span className="ls-title">{n.title}</span>
                <ArrowRight size={16} className="ls-arrow" aria-hidden="true" />
              </span>
              <span className="ls-meta">
                {categoryName(db, n.categoryId)} · {locationLabel(db, n.locationId)} · {timeAgo(n.publishedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
