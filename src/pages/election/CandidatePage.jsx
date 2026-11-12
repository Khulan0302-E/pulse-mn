// Нэр дэвшигчийн дэлгэрэнгүй: нас, нам, тойрог, боловсрол, өмнөх сонгуулийн түүх
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, GraduationCap, Vote, Star } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { candidateById, partyById, ageOf } from '../../api/election';
import { Portrait, PartyChip } from './Election';
import NotFound from '../NotFound';

const RESULT_TONE = { 'Сонгогдсон': 'green', 'Сонгогдоогүй': 'gray', 'Нөхөн сонгууль': 'blue', 'Нэрээ татсан': 'amber' };

export default function CandidatePage() {
  const db = useDb();
  const c = candidateById(db, useParams().id);
  if (!c) return <NotFound />;
  const party = partyById(db, c.partyId);
  const age = ageOf(c.birthYear);
  const history = [...(c.electionHistory || [])].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  return (
    <div className="container page narrow-page">
      <nav className="crumbs">
        <Link to="/songuuli">Сонгууль</Link><ChevronRight size={14} /><span>{c.fullName}</span>
      </nav>
      <div className="card cand-profile" style={{ '--party': party?.color || 'var(--accent)' }}>
        <Portrait c={c} size="xl" />
        <div className="cand-profile-body">
          {c.featured && <span className="badge badge-amber"><Star size={12} /> Онцлох нэр дэвшигч</span>}
          <h1>{c.fullName}</h1>
          <PartyChip party={party} />
          <dl className="party-facts mt-16">
            <div><dt>Нас</dt><dd>{age ? `${age} (${c.birthYear} онд төрсөн)` : '—'}</dd></div>
            <div><dt>Тойрог</dt><dd>{c.district || '—'}</dd></div>
            <div className="span-2"><dt>Одоогийн албан тушаал</dt><dd>{c.position || '—'}</dd></div>
          </dl>
        </div>
      </div>

      {c.bio && (
        <section className="card mt-16"><div className="card-body">
          <h2 className="h-title">Танилцуулга</h2>
          {c.bio.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
        </div></section>
      )}

      <section className="card mt-16"><div className="card-body">
        <h2 className="h-title"><GraduationCap size={18} /> Боловсрол</h2>
        {c.education?.length ? (
          <ul className="timeline">
            {c.education.map((e, i) => (
              <li key={i}><span className="tl-year">{e.year || '—'}</span><div><strong>{e.school}</strong>{e.degree && <div className="muted small">{e.degree}</div>}</div></li>
            ))}
          </ul>
        ) : <p className="muted">Мэдээлэл ороогүй.</p>}
      </div></section>

      <section className="card mt-16"><div className="card-body">
        <h2 className="h-title"><Vote size={18} /> Өмнөх сонгуулийн оролцоо</h2>
        {history.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Он</th><th>Сонгууль</th><th>Тойрог</th><th>Нам</th><th>Санал</th><th>Үр дүн</th></tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="nowrap">{h.year || '—'}</td><td>{h.election || '—'}</td><td>{h.district || '—'}</td>
                    <td>{h.party || '—'}</td><td className="nowrap">{h.votes || '—'}</td>
                    <td>{h.result ? <span className={`badge badge-${RESULT_TONE[h.result] || 'gray'}`}>{h.result}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">Өмнө нь сонгуульд нэр дэвшиж байсан мэдээлэл ороогүй.</p>}
      </div></section>
    </div>
  );
}
