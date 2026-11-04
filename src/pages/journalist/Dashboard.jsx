// FR-CNT-003: өмнө оруулсан ноорогийн түүх, төлөв, шүүлтүүр
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenLine, FileText } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { STATUS, STATUS_LABELS, VERIFY } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { myNews, categoryName, locationLabel } from '../../api/news';
import { isVerifiedJournalist, latestVerification } from '../../api/auth';
import { Alert, Empty, StatusBadge, Field } from '../../components/ui';

export function VerificationNotice() {
  const db = useDb();
  const { user } = useAuth();
  if (isVerifiedJournalist(db, user)) return null;
  const v = latestVerification(db, user.id);
  return v?.status === VERIFY.REJECTED ? (
    <Alert tone="error" title="Таны баталгаажуулах хүсэлт татгалзагдсан" action={<Link to="/j/verification" className="btn btn-secondary btn-sm">Дахин илгээх</Link>}>
      Шалтгаан: {v.reason}
    </Alert>
  ) : (
    <Alert tone="warn" title="Таны бүртгэл баталгаажаагүй байна" action={<Link to="/j/verification" className="btn btn-secondary btn-sm">Дэлгэрэнгүй</Link>}>
      Админ баримтыг баталгаажуулсны дараа ноорог оруулах боломжтой болно.
    </Alert>
  );
}

const STAT_ORDER = [STATUS.DRAFT, STATUS.REVIEW, STATUS.RETURNED, STATUS.SCHEDULED, STATUS.PUBLISHED, STATUS.REJECTED];

export default function Dashboard() {
  const db = useDb();
  const { user } = useAuth();
  const nav = useNavigate();
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const all = myNews(user);
  const list = myNews(user, filters);
  const verified = isVerifiedJournalist(db, user);
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Миний ноорог</h1>
          <p>Илгээсэн огноо, төлөв, редакторын шийдвэрийг эндээс харна.</p>
        </div>
        {verified && <Link to="/j/new" className="btn btn-primary"><PenLine size={16} /> Шинэ ноорог</Link>}
      </div>
      <VerificationNotice />

      <div className="stats">
        {STAT_ORDER.map((s) => (
          <button key={s} className={`card stat ${filters.status === s ? 'active' : ''}`} onClick={() => setF('status', filters.status === s ? '' : s)}>
            <span className="num">{all.filter((n) => n.status === s).length}</span>
            <span className="lbl">{STATUS_LABELS[s]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="filters">
          <Field label="Төлөв">
            <select className="select" value={filters.status} onChange={(e) => setF('status', e.target.value)}>
              <option value="">Бүгд</option>
              {STAT_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Эхлэх огноо">
            <input className="input" type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} />
          </Field>
          <Field label="Дуусах огноо">
            <input className="input" type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)} />
          </Field>
          {(filters.status || filters.from || filters.to) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', from: '', to: '' })}>Цэвэрлэх</button>
          )}
        </div>
        {!list.length ? (
          <Empty icon={FileText} title="Ноорог олдсонгүй" text={all.length ? 'Шүүлтүүрт тохирох ноорог алга.' : 'Та одоогоор ноорог оруулаагүй байна.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Гарчиг</th><th>Төрөл</th><th>Байршил</th><th>Илгээсэн</th><th>Хувилбар</th><th>Төлөв</th></tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n.id} className="clickable" onClick={() => nav(`/j/news/${n.id}`)}>
                    <td><span className="cell-title">{n.title}</span></td>
                    <td>{categoryName(db, n.categoryId)}</td>
                    <td className="nowrap">{locationLabel(db, n.locationId)}</td>
                    <td className="nowrap">{n.submittedAt ? fmtDate(n.submittedAt) : <span className="muted">Илгээгээгүй</span>}</td>
                    <td>v{n.version}</td>
                    <td><StatusBadge status={n.status} /></td>
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
