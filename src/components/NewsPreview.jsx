import { Link } from 'react-router-dom';
import { MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { fmtDate, initials } from '../lib/format';
import { locationLabel, locationById, userById } from '../api/news';
import { CatLabel } from './NewsCard';
import MediaGallery from './MediaGallery';
import { renderHtml } from '../lib/richtext';

/** Нийтлэлийн харагдац — нийтийн хуудас, урьдчилсан харагдац, редакторын хяналтад ашиглана */
export default function NewsPreview({ news, media = [], showAuthor = true }) {
  const db = useDb();
  const author = userById(db, news.journalistId);
  const loc = locationById(db, news.locationId);

  // Зураг бүрийн байрлал: top (эхэнд, анхдагч) | p<N> (N-р догол мөрийн дараа) | end (төгсгөлд)
  const paragraphs = renderHtml(news.content).match(/<p\b[\s\S]*?<\/p>/g) || [];
  const slotOf = (m) => {
    const p = m.placement || 'top';
    if (p === 'top' || !paragraphs.length) return 'top';
    if (p === 'end') return paragraphs.length;
    const n = Number(p.slice(1));
    return n >= 1 ? Math.min(n, paragraphs.length) : 'top';
  };
  const bySlot = new Map();
  media.forEach((m) => {
    const k = slotOf(m);
    bySlot.set(k, [...(bySlot.get(k) || []), m]);
  });
  const layout = news.mediaLayout || 'auto';
  const updated = news.publishedAt && news.updatedAt && new Date(news.updatedAt) - new Date(news.publishedAt) > 60000;
  return (
    <article className="article">
      <CatLabel id={Number(news.categoryId)} />
      <h1>{news.title || 'Гарчиггүй'}</h1>
      <div className="meta">
        <span>
          <MapPin size={14} />
          {loc ? <Link className="meta-link" to={`/aimag/${encodeURIComponent(loc.aimag)}`}>{locationLabel(db, news.locationId)}</Link> : '—'}
        </span>
        {news.publishedAt && <span><Calendar size={14} />{fmtDate(news.publishedAt)}</span>}
        {updated && <span>Шинэчилсэн: {fmtDate(news.updatedAt)}</span>}
      </div>

      {showAuthor && author && (
        <div className="author">
          <span className="avatar">{initials(author.fullName)}</span>
          <div>
            <strong>{author.fullName}</strong>
            <span className="muted small">
              Сэтгүүлч{author.org ? ` · ${author.org}` : ''}
            </span>
          </div>
          <span className="verified"><ShieldCheck size={14} /> Баталгаажсан сэтгүүлч</span>
        </div>
      )}

      {bySlot.has('top') && <MediaGallery media={bySlot.get('top')} layout={layout} />}

      {/* renderHtml нь зөвхөн зөвшөөрсөн таг/классыг үлдээдэг тул аюулгүй */}
      <div className="article-body">
        {paragraphs.map((p, i) => (
          <div key={i} className="article-chunk">
            <div dangerouslySetInnerHTML={{ __html: p }} />
            {bySlot.has(i + 1) && (
              <div className="inline-media"><MediaGallery media={bySlot.get(i + 1)} layout={layout} /></div>
            )}
          </div>
        ))}
      </div>

      <div className="source-box">
        <strong>Эх сурвалж</strong>
        <p>
          {news.sourceConfidential
            ? 'Эх сурвалжийг холбогдох хууль тогтоомж, редакцийн бодлогын дагуу нууцалсан.'
            : news.source || 'Эх сурвалж заагаагүй'}
        </p>
      </div>
    </article>
  );
}
