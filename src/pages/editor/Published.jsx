// FR-PUB-003: нийтлэгдсэн мэдээг хайх, засварлах
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Newspaper, PenLine, ExternalLink } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { STATUS, CATEGORIES } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { editorList, categoryName, userById } from '../../api/news';
import { Empty } from '../../components/ui';

export default function Published() {
  const db = useDb();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const list = editorList(user, STATUS.PUBLISHED)
    .filter((n) => !cat || n.categoryId === Number(cat))
    .filter((n) => !q.trim() || n.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Нийтлэгдсэн</h1>
          <p>Засвар бүр хувилбарын түүхэнд бүртгэгдэнэ.</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <div className="search grow">
            <Search size={16} />
            <input className="input" placeholder="Гарчгаар хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select auto" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Бүх төрөл</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {!list.length ? (
          <Empty icon={Newspaper} title="Нийтлэл олдсонгүй" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Гарчиг</th><th>Төрөл</th><th>Сэтгүүлч</th><th>Нийтэлсэн</th><th>Хувилбар</th><th>Үзэлт</th><th /></tr></thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n.id}>
                    <td><span className="cell-title">{n.title}</span></td>
                    <td>{categoryName(db, n.categoryId)}</td>
                    <td className="nowrap">{userById(db, n.journalistId)?.fullName}</td>
                    <td className="nowrap">{fmtDate(n.publishedAt)}</td>
                    <td>v{n.version}</td>
                    <td>{n.views || 0}</td>
                    <td>
                      <div className="row nowrap">
                        <Link to={`/news/${n.id}`} className="icon-btn sm" title="Үзэх"><ExternalLink size={15} /></Link>
                        <Link to={`/e/published/${n.id}/edit`} className="btn btn-secondary btn-sm"><PenLine size={14} /> Засах</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
