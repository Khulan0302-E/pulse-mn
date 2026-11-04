import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, PenLine, ChevronRight } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, ROLES } from '../lib/constants';
import { getPublished, incrementView, listPublished, mediaFor } from '../api/news';
import NewsPreview from '../components/NewsPreview';
import NewsCard from '../components/NewsCard';
import { WeatherCard, FxCard } from '../components/InfoWidgets';
import NotFound from './NotFound';

export default function Article() {
  const db = useDb();
  const { user } = useAuth();
  const id = Number(useParams().id);
  const news = getPublished(id);

  useEffect(() => {
    if (news) incrementView(news.id);
  }, [news?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!news) return <NotFound text="Энэ нийтлэл олдсонгүй эсвэл хараахан нийтлэгдээгүй байна." />;
  const cat = CATEGORIES.find((c) => c.id === news.categoryId);
  const related = listPublished(news.categoryId).filter((n) => n.id !== news.id).slice(0, 3);

  return (
    <div className="container page">
      <nav className="crumbs">
        <Link to="/">Нүүр</Link>
        <ChevronRight size={14} />
        <Link to={`/category/${cat.slug}`}>{cat.name}</Link>
      </nav>
      <div className="article-wrap">
        <div>
          <NewsPreview news={news} media={mediaFor(db, news.id)} />
          <div className="article-foot">
            <span className="muted small"><Eye size={14} /> {news.views || 0} удаа үзсэн</span>
            {user?.role === ROLES.EDITOR && (
              <Link to={`/e/published/${news.id}/edit`} className="btn btn-secondary btn-sm"><PenLine size={15} /> Засварлах</Link>
            )}
          </div>
        </div>
        <aside className="sidebar">
          <WeatherCard />
          <FxCard />
        </aside>
      </div>
      {related.length > 0 && (
        <section className="related">
          <h2 className="section-title">Холбоотой мэдээ</h2>
          <div className="card-grid">{related.map((n) => <NewsCard key={n.id} news={n} />)}</div>
        </section>
      )}
    </div>
  );
}
