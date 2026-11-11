// Мэдээний үзэлтийн статистик: Админ бүх мэдээ, сэтгүүлч зөвхөн өөрийн мэдээ
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Eye, CalendarDays, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../lib/useDb';
import { ROLES } from '../lib/constants';
import { statsNews, loadDailyViews, dayRange } from '../api/stats';
import { categoryName, userById } from '../api/news';
import ViewsChart from '../components/ViewsChart';
import { Alert, Empty, Spinner } from '../components/ui';

const PERIODS = [7, 30, 90];

export default function Stats() {
  const { user } = useAuth();
  const db = useDb();
  const admin = user.role === ROLES.ADMIN;
  const [days, setDays] = useState(30);
  const [newsId, setNewsId] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const news = useMemo(() => statsNews(user), [user, db]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError('');
    loadDailyViews(user, days)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && (setError(e.message), setRows([])));
    return () => { alive = false; };
  }, [user.id, user.role, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const range = dayRange(days);
  const sel = newsId ? Number(newsId) : null;
  const filtered = (rows || []).filter((r) => !sel || r.newsId === sel);
  const byDay = new Map(range.map((d) => [d, 0]));
  filtered.forEach((r) => byDay.has(r.day) && byDay.set(r.day, byDay.get(r.day) + r.views));
  const points = range.map((d) => ({ day: d, v: byDay.get(d) }));
  const total = points.reduce((s, p) => s + p.v, 0);
  const best = points.reduce((b, p) => (p.v > b.v ? p : b), { v: 0, day: null });
  const perNews = new Map();
  (rows || []).forEach((r) => perNews.set(r.newsId, (perNews.get(r.newsId) || 0) + r.views));
  const allTime = (sel ? news.filter((n) => n.id === sel) : news).reduce((s, n) => s + (n.views || 0), 0);
  const ranked = [...news].sort((a, b) => (perNews.get(b.id) || 0) - (perNews.get(a.id) || 0) || (b.views || 0) - (a.views || 0));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Статистик</h1>
          <p>{admin ? 'Бүх нийтлэгдсэн мэдээний үзэлт.' : 'Таны нийтлэгдсэн мэдээний үзэлт.'} Өдөр тутмын тоолол 2026-11-12-ны шинэчлэлээс эхэлсэн.</p>
        </div>
      </div>
      <div className="filters">
        <div className="segmented" role="group" aria-label="Хугацаа">
          {PERIODS.map((p) => <button key={p} type="button" className={days === p ? 'active' : ''} onClick={() => setDays(p)}>{p} хоног</button>)}
        </div>
        <select className="select auto grow" value={newsId} onChange={(e) => setNewsId(e.target.value)} aria-label="Мэдээ сонгох">
          <option value="">{admin ? 'Бүх мэдээ' : 'Миний бүх мэдээ'} ({news.length})</option>
          {news.map((n) => <option key={n.id} value={n.id}>{n.title.slice(0, 80)}</option>)}
        </select>
      </div>
      {error && <Alert tone="warn" title={error} />}

      <div className="stat-tiles">
        <div className="stat-tile"><span><Eye size={15} /> {days} хоногийн үзэлт</span><strong>{rows ? total.toLocaleString('en-US') : '…'}</strong></div>
        <div className="stat-tile"><span><TrendingUp size={15} /> Өдрийн дундаж</span><strong>{rows ? Math.round(total / days).toLocaleString('en-US') : '…'}</strong></div>
        <div className="stat-tile"><span><CalendarDays size={15} /> Хамгийн их</span><strong>{best.day ? `${best.v.toLocaleString('en-US')}` : '—'}</strong>{best.day && <em className="muted small">{best.day}</em>}</div>
        <div className="stat-tile"><span><BarChart3 size={15} /> Нийт (бүх хугацаа)</span><strong>{allTime.toLocaleString('en-US')}</strong></div>
      </div>

      <div className="card mt-16">
        <div className="card-head"><h3>Өдөр тутмын үзэлт{sel ? ` — ${news.find((n) => n.id === sel)?.title.slice(0, 60)}` : ''}</h3></div>
        <div className="card-body">{rows ? <ViewsChart points={points} /> : <div className="center"><Spinner /></div>}</div>
      </div>

      <div className="card mt-16">
        <div className="card-head"><h3>Мэдээгээр</h3></div>
        {!news.length ? <Empty icon={BarChart3} title="Нийтлэгдсэн мэдээ алга" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Гарчиг</th><th>Төрөл</th>{admin && <th>Сэтгүүлч</th>}<th className="num">{days} хоног</th><th className="num">Нийт</th></tr></thead>
            <tbody>{ranked.map((n) => (
              <tr key={n.id} className={sel === n.id ? 'row-active' : ''}>
                <td><Link className="cell-title link-plain" to={`/news/${n.id}`}>{n.title}</Link></td>
                <td>{categoryName(db, n.categoryId)}</td>
                {admin && <td className="nowrap">{userById(db, n.journalistId)?.fullName || '—'}</td>}
                <td className="num">{(perNews.get(n.id) || 0).toLocaleString('en-US')}</td>
                <td className="num">{(n.views || 0).toLocaleString('en-US')}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
