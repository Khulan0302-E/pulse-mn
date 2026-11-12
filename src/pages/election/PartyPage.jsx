// Намын дэлгэрэнгүй: байгуулагдсан огноо, дарга, танилцуулга, гишүүн нэр дэвшигчид
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ExternalLink, Users } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { partyById, partyMembers, partyAge, ageOf } from '../../api/election';
import { fmtDate } from '../../lib/format';
import { Portrait } from './Election';
import { Empty } from '../../components/ui';
import NotFound from '../NotFound';

export default function PartyPage() {
  const db = useDb();
  const p = partyById(db, useParams().id);
  if (!p) return <NotFound />;
  const members = partyMembers(db, p.id);
  const yrs = partyAge(p.foundedOn);
  return (
    <div className="container page narrow-page">
      <nav className="crumbs">
        <Link to="/songuuli?tab=namuud">Намууд</Link><ChevronRight size={14} /><span>{p.name}</span>
      </nav>
      <div className="card party-profile" style={{ '--party': p.color || 'var(--accent)' }}>
        {p.logoUrl ? <img src={p.logoUrl} alt="" className="party-logo party-logo-lg" /> : <span className="party-logo party-logo-lg party-logo-empty">{(p.shortName || p.name).slice(0, 3)}</span>}
        <div>
          <h1>{p.name}</h1>
          {p.shortName && <p className="muted">{p.shortName}</p>}
          <dl className="party-facts mt-16">
            <div><dt>Байгуулагдсан</dt><dd>{p.foundedOn ? `${fmtDate(p.foundedOn, { time: false })}${yrs != null ? ` · ${yrs} жил` : ''}` : '—'}</dd></div>
            <div><dt>Дарга</dt><dd>{p.chairman || '—'}</dd></div>
            <div><dt>Нэр дэвшигч</dt><dd>{members.length}</dd></div>
            {p.website && <div><dt>Вэб сайт</dt><dd><a className="link" href={p.website} target="_blank" rel="noreferrer">Үзэх <ExternalLink size={12} /></a></dd></div>}
          </dl>
        </div>
      </div>
      {p.description && (
        <section className="card mt-16"><div className="card-body">
          <h2 className="h-title">Танилцуулга</h2>
          {p.description.split(/\n+/).map((t, i) => <p key={i}>{t}</p>)}
        </div></section>
      )}
      <section className="card mt-16"><div className="card-body">
        <h2 className="h-title"><Users size={18} /> Нэр дэвшигчид ({members.length})</h2>
        {!members.length ? <Empty icon={Users} title="Энэ намаас нэр дэвшигч бүртгэгдээгүй" /> : (
          <div className="member-list">
            {members.map((c) => (
              <Link key={c.id} to={`/songuuli/ner-devshigch/${c.id}`} className="member-row">
                <Portrait c={c} size="sm" />
                <div><strong>{c.fullName}</strong><div className="muted small">{[ageOf(c.birthYear) && `${ageOf(c.birthYear)} настай`, c.district].filter(Boolean).join(' · ')}</div></div>
                <ChevronRight size={16} className="muted" />
              </Link>
            ))}
          </div>
        )}
      </div></section>
    </div>
  );
}
