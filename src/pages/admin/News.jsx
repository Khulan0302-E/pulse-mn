// Админ: бүх мэдээг (ноорог, хянагдаж буй, нийтлэгдсэн…) харах, онцлох болгох, устгах
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Newspaper, ExternalLink } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { STATUS, STATUS_LABELS, CATEGORIES } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { categoryName, userById } from '../../api/news';
import { Empty, StatusBadge } from '../../components/ui';
import { FeaturedToggle, DeleteNewsButton } from '../../components/NewsActions';

export default function AdminNews() {
  const db = useDb();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [cat, setCat] = useState('');
  const list = [...db.news]
    .filter((n) => !status || n.status === status)
    .filter((n) => !cat || n.categoryId === Number(cat))
    .filter((n) => !q.trim() || n.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Мэдээ</h1>
          <p>Системийн бүх мэдээ. Нийт {db.news.length}. Устгасан мэдээг сэргээх боломжгүй.</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <div className="search grow">
            <Search size={16} />
            <input className="input" placeholder="Гарчгаар хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Бүх төлөв</option>
            {Object.values(STATUS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select className="select auto" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Бүх төрөл</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {!list.length ? (
          <Empty icon={Newspaper} title="Мэдээ олдсонгүй" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Онцлох</th><th>Гарчиг</th><th>Төрөл</th><th>Сэтгүүлч</th><th>Төлөв</th><th>Шинэчилсэн</th><th /></tr></thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n.id}>
                    <td>{n.status === STATUS.PUBLISHED ? <FeaturedToggle news={n} /> : <span className="muted">—</span>}</td>
                    <td><span className="cell-title">{n.title}</span></td>
                    <td>{categoryName(db, n.categoryId)}</td>
                    <td className="nowrap">{userById(db, n.journalistId)?.fullName || '—'}</td>
                    <td><StatusBadge status={n.status} /></td>
                    <td className="nowrap">{fmtDate(n.updatedAt || n.createdAt)}</td>
                    <td>
                      <div className="row nowrap">
                        {n.status === STATUS.PUBLISHED && (
                          <Link to={`/news/${n.id}`} className="icon-btn sm" title="Үзэх"><ExternalLink size={15} /></Link>
                        )}
                        <DeleteNewsButton news={n} />
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
