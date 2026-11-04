import { Link } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { CATEGORIES } from '../lib/constants';
import { timeAgo, excerpt } from '../lib/format';
import { locationLabel } from '../api/news';
import Cover from './Cover';

export function CatLabel({ id }) {
  const c = CATEGORIES.find((x) => x.id === id);
  return (
    <span className="cat-label" style={{ color: c?.color }}>
      {c?.name}
    </span>
  );
}

export default function NewsCard({ news }) {
  const db = useDb();
  return (
    <Link to={`/news/${news.id}`} className="card news-card">
      <Cover news={news} />
      <div className="news-card-body">
        <CatLabel id={news.categoryId} />
        <h3>{news.title}</h3>
        <p className="muted small clamp-2">{excerpt(news.content, 120)}</p>
        <div className="meta">
          <span><MapPin size={13} />{locationLabel(db, news.locationId)}</span>
          <span><Clock size={13} />{timeAgo(news.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function LeadStory({ news }) {
  const db = useDb();
  return (
    <Link to={`/news/${news.id}`} className="card lead">
      <Cover news={news} className="lead-cover" />
      <div className="lead-body">
        <CatLabel id={news.categoryId} />
        <h2>{news.title}</h2>
        <p className="muted">{excerpt(news.content, 220)}</p>
        <div className="meta">
          <span><MapPin size={13} />{locationLabel(db, news.locationId)}</span>
          <span><Clock size={13} />{timeAgo(news.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
