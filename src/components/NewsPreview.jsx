import { MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { fmtDate, initials } from '../lib/format';
import { locationLabel, userById } from '../api/news';
import { CatLabel } from './NewsCard';
import { MediaView } from './ui';

/** Нийтлэлийн харагдац — нийтийн хуудас, урьдчилсан харагдац, редакторын хяналтад ашиглана */
export default function NewsPreview({ news, media = [], showAuthor = true }) {
  const db = useDb();
  const author = userById(db, news.journalistId);
  const paragraphs = (news.content || '').split(/\n\s*\n|\n/).filter((p) => p.trim());
  const updated = news.publishedAt && news.updatedAt && new Date(news.updatedAt) - new Date(news.publishedAt) > 60000;
  return (
    <article className="article">
      <CatLabel id={Number(news.categoryId)} />
      <h1>{news.title || 'Гарчиггүй'}</h1>
      <div className="meta">
        <span><MapPin size={14} />{locationLabel(db, news.locationId)}</span>
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

      {media.length > 0 && (
        <div className={`gallery ${media.length > 1 ? 'gallery-multi' : ''}`}>
          {media.map((m) => (
            <MediaView key={m.id || m.key} media={m} />
          ))}
        </div>
      )}

      <div className="article-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
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
