// Сонгууль: онцлох нэр дэвшигчид, бүх нэр дэвшигчид, намууд
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Star, Users, Landmark, CalendarDays, ChevronRight } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { listCandidates, listParties, partyById, partyMembers, ageOf, partyAge } from '../../api/election';
import { Empty } from '../../components/ui';

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';

export function Portrait({ c, size = 'md' }) {
  return c.photoUrl ? (
    <img className={`portrait portrait-${size}`} src={c.photoUrl} alt={c.fullName} loading="lazy" />
  ) : (
    <span className={`portrait portrait-${size} portrait-empty`} aria-hidden="true">{initials(c.fullName)}</span>
  );
}

export function PartyChip({ party }) {
  if (!party) return <span className="party-chip muted">Бие даагч</span>;
  return (
    <Link to={`/songuuli/nam/${party.id}`} className="party-chip" style={{ '--party': party.color || 'var(--ink-2)' }}>
      <span className="party-dot" />{party.shortName || party.name}
    </Link>
  );
}

function CandidateCard({ c, party }) {
  const age = ageOf(c.birthYear);
  return (
    <Link to={`/songuuli/ner-devshigch/${c.id}`} className="cand-card">
      <Portrait c={c} />
      <div className="cand-body">
        <h3>{c.fullName}</h3>
        <div className="cand-meta">
          {age && <span>{age} настай</span>}
          {c.district && <span>{c.district}</span>}
        </div>
        <span className="party-line" style={{ '--party': party?.color || 'var(--muted)' }}>
          <span className="party-dot" />{party ? party.shortName || party.name : 'Бие даагч'}
        </span>
      </div>
    </Link>
  );
}

function FeaturedCandidates({ list, db }) {
  if (!list.length) return null;
  return (
    <section className="section" aria-labelledby="feat-cand">
      <div className="section-head">
        <h2 id="feat-cand" className="h-title"><Star size={18} className="star-ico" /> Онцлох нэр дэвшигчид</h2>
      </div>
      <div className="feat-cands">
        {list.map((c) => {
          const party = partyById(db, c.partyId);
          const age = ageOf(c.birthYear);
          return (
            <Link key={c.id} to={`/songuuli/ner-devshigch/${c.id}`} className="feat-cand" style={{ '--party': party?.color || 'var(--accent)' }}>
              <Portrait c={c} size="lg" />
              <div className="feat-cand-body">
                <span className="party-line"><span className="party-dot" />{party ? party.name : 'Бие даагч'}</span>
                <h3>{c.fullName}</h3>
                <p className="muted small">{[age && `${age} настай`, c.district, c.position].filter(Boolean).join(' · ')}</p>
                {c.bio && <p className="clamp-2 small">{c.bio}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CandidatesTab({ db }) {
  const [q, setQ] = useState('');
  const [party, setParty] = useState('');
  const all = listCandidates(db);
  const list = all
    .filter((c) => !party || (party === 'none' ? !c.partyId : c.partyId === Number(party)))
    .filter((c) => !q.trim() || `${c.fullName} ${c.district || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="filters">
        <div className="search grow">
          <Search size={16} />
          <input className="input" placeholder="Нэр, тойргоор хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select auto" value={party} onChange={(e) => setParty(e.target.value)} aria-label="Намаар шүүх">
          <option value="">Бүх нам</option>
          {listParties(db).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="none">Бие даагч</option>
        </select>
      </div>
      {!list.length ? (
        <Empty icon={Users} title={all.length ? 'Илэрц олдсонгүй' : 'Нэр дэвшигчийн мэдээлэл хараахан ороогүй байна'} />
      ) : (
        <div className="cand-grid">
          {list.map((c) => <CandidateCard key={c.id} c={c} party={partyById(db, c.partyId)} />)}
        </div>
      )}
    </>
  );
}

function PartiesTab({ db }) {
  const parties = listParties(db);
  if (!parties.length) return <Empty icon={Landmark} title="Намын мэдээлэл хараахан ороогүй байна" />;
  return (
    <div className="party-grid">
      {parties.map((p) => {
        const members = partyMembers(db, p.id);
        const yrs = partyAge(p.foundedOn);
        return (
          <Link key={p.id} to={`/songuuli/nam/${p.id}`} className="party-card" style={{ '--party': p.color || 'var(--accent)' }}>
            <div className="party-card-head">
              {p.logoUrl ? <img src={p.logoUrl} alt="" className="party-logo" /> : <span className="party-logo party-logo-empty">{(p.shortName || p.name).slice(0, 3)}</span>}
              <div>
                <h3>{p.name}</h3>
                {p.shortName && <span className="muted small">{p.shortName}</span>}
              </div>
            </div>
            <dl className="party-facts">
              <div><dt><CalendarDays size={13} /> Байгуулагдсан</dt><dd>{p.foundedOn ? `${p.foundedOn.slice(0, 4)}${yrs != null ? ` (${yrs} жил)` : ''}` : '—'}</dd></div>
              <div><dt><Users size={13} /> Нэр дэвшигч</dt><dd>{members.length}</dd></div>
              <div className="span-2"><dt>Дарга</dt><dd>{p.chairman || '—'}</dd></div>
            </dl>
            <span className="link small">Дэлгэрэнгүй <ChevronRight size={13} /></span>
          </Link>
        );
      })}
    </div>
  );
}

export default function Election() {
  const db = useDb();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'namuud' ? 'namuud' : 'ner-devshigchid';
  const featured = listCandidates(db).filter((c) => c.featured).slice(0, 6);
  return (
    <div className="container page">
      <div className="election-hero">
        <span className="eyebrow">Сонгууль</span>
        <h1>Нэр дэвшигчид ба намууд</h1>
        <p className="muted">Нэр дэвшигч бүрийн нас, боловсрол, өмнөх сонгуулийн оролцоо, намын мэдээллийг нэг дороос.</p>
      </div>
      <FeaturedCandidates list={featured} db={db} />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'ner-devshigchid'} className={tab === 'ner-devshigchid' ? 'active' : ''} onClick={() => setParams({})}>
          <Users size={15} /> Нэр дэвшигчид <span className="tab-count">{(db.candidates || []).length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'namuud'} className={tab === 'namuud' ? 'active' : ''} onClick={() => setParams({ tab: 'namuud' })}>
          <Landmark size={15} /> Намууд <span className="tab-count">{(db.parties || []).length}</span>
        </button>
      </div>
      <div className="card"><div className="card-body">{tab === 'namuud' ? <PartiesTab db={db} /> : <CandidatesTab db={db} />}</div></div>
    </div>
  );
}
