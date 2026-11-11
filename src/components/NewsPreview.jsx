import { MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { fmtDate, initials } from '../lib/format';
import { locationLabel, userById } from '../api/news';
import { CatLabel } from './NewsCard';
import MediaGallery from './MediaGallery';
import { renderHtml } from '../lib/richtext';

/** Нийтлэлийн харагдац — нийтийн хуудас, урьдчилсан харагдац, редакторын хяналтад ашиглана */
export default function NewsPreview({ news, media = [], showAuthor = true }) {
  const db = useDb();
  const author = userById(db, news.journalistId);
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

      {media.length > 0 && <MediaGallery media={media} layout={news.mediaLayout || 'auto'} />}

      {/* renderHtml нь зөвхөн зөвшөөрсөн таг/классыг үлдээдэг тул аюулгүй */}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: renderHtml(news.content) }} />

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
