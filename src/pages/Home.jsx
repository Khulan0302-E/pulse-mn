// FR-PUB-004: нүүр хуудсанд мэдээг төрлөөр ангилан харуулах
import { Link, useParams } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { CATEGORIES } from '../lib/constants';
import { listPublished } from '../api/news';
import NewsCard, { LeadStory, CatLabel } from '../components/NewsCard';
import { WeatherCard, FxCard } from '../components/InfoWidgets';
import FeaturedCarousel from '../components/FeaturedCarousel';
import { Empty } from '../components/ui';
import { timeAgo } from '../lib/format';
import NotFound from './NotFound';

function Popular({ list }) {
  return (
    <div className="card widget">
      <div className="widget-head"><h3>Их уншсан</h3></div>
      <ol className="popular">
        {list.map((n, i) => (
          <li key={n.id}>
            <span className="popular-num">{i + 1}</span>
            <Link to={`/news/${n.id}`}>
              <CatLabel id={n.categoryId} />
              <span className="popular-title">{n.title}</span>
              <span className="muted small">{timeAgo(n.publishedAt)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Home() {
  useDb();
  const { slug } = useParams();
  const cat = slug ? CATEGORIES.find((c) => c.slug === slug) : null;
  if (slug && !cat) return <NotFound />;

  const all = listPublished();
  const items = cat ? all.filter((n) => n.categoryId === cat.id) : all;
  // Нүүр хуудсанд 3-аас дээш мэдээ байвал хамгийн сүүлийн 5-ыг каруселд харуулна
  const featured = !cat && items.length >= 3 ? items.slice(0, 5) : [];
  const [lead, ...others] = items;
  // Карусельтэй үед түүний дараах 6 мэдээ, үгүй бол онцлох мэдээний дараах мэдээнүүд
  const latest = featured.length ? items.slice(featured.length, featured.length + 6) : cat ? others : others.slice(0, 6);
  const popular = [...all].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div className="container page">
      {cat && (
        <div className="cat-head" style={{ '--c': cat.color }}>
          <h1>{cat.name}</h1>
          <span className="muted">{items.length} мэдээ</span>
        </div>
      )}
      {featured.length > 0 && (
        <section aria-labelledby="featured-title">
          <h2 id="featured-title" className="section-title top">Онцлох мэдээ</h2>
          <FeaturedCarousel items={featured} />
        </section>
      )}
      <div className="home-grid">
        <div className="home-main">
          {!lead ? (
            <div className="card"><Empty icon={Newspaper} title="Мэдээ олдсонгүй" text="Энэ ангилалд нийтлэгдсэн мэдээ одоогоор алга байна." /></div>
          ) : (
            <>
              {!featured.length && <LeadStory news={lead} />}
              {latest.length > 0 && (
                <>
                  <h2 className={`section-title ${featured.length ? 'first' : ''}`}>{cat ? 'Бусад мэдээ' : 'Сүүлийн мэдээ'}</h2>
                  <div className="card-grid">
                    {latest.map((n) => <NewsCard key={n.id} news={n} />)}
                  </div>
                </>
              )}
            </>
          )}

          {!cat && (
            <div className="cat-sections">
              {CATEGORIES.map((c) => {
                const list = all.filter((n) => n.categoryId === c.id).slice(0, 3);
                if (!list.length) return null;
                return (
                  <section key={c.id} className="cat-section">
                    <div className="cat-section-head" style={{ '--c': c.color }}>
                      <h2>{c.name}</h2>
                      <Link to={`/category/${c.slug}`} className="link">Бүгдийг үзэх →</Link>
                    </div>
                    <div className="card-grid">
                      {list.map((n) => <NewsCard key={n.id} news={n} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
        <aside className="sidebar">
          <WeatherCard />
          <FxCard />
          {popular.length > 0 && <Popular list={popular} />}
        </aside>
      </div>
    </div>
  );
}
