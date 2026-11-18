// Аймгаар мэдээ үзэх: газрын зураг + сонгосон аймгийн нийтлэгдсэн мэдээ
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Newspaper } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { LOCATIONS } from '../lib/constants';
import { listPublished, locationById } from '../api/news';
import MongoliaMap from '../components/MongoliaMap';
import NewsCard from '../components/NewsCard';
import { Empty } from '../components/ui';

export function useAimagCounts() {
  const db = useDb();
  const counts = {};
  listPublished().forEach((n) => {
    const aimag = locationById(db, n.locationId)?.aimag;
    if (aimag) counts[aimag] = (counts[aimag] || 0) + 1;
  });
  return counts;
}

export default function AimagNews() {
  const db = useDb();
  const nav = useNavigate();
  const { name } = useParams();
  const selected = name && LOCATIONS[name] ? name : null;
  const counts = useAimagCounts();
  const go = (aimag) => nav(`/aimag/${encodeURIComponent(aimag)}`);
  const list = selected ? listPublished().filter((n) => locationById(db, n.locationId)?.aimag === selected) : [];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{selected || 'Аймгаар мэдээ'}</h1>
          <p>
            {selected
              ? `${list.length} нийтлэгдсэн мэдээ · газрын зураг дээрээс өөр аймаг сонгож болно`
              : 'Газрын зураг дээрээс аймгаа сонгоно уу. Өнгө тод байх тусам мэдээ олон.'}
          </p>
        </div>
        {selected && <Link to="/aimag" className="btn btn-secondary btn-sm">Бүх аймаг</Link>}
      </div>

      <div className="card card-body">
        <MongoliaMap counts={counts} selected={selected} onSelect={go} />
        <div className="aimag-chips">
          {Object.keys(LOCATIONS).map((a) => (
            <button key={a} type="button" className={`aimag-chip ${selected === a ? 'active' : ''}`} onClick={() => go(a)}>
              {a} <span>{counts[a] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <section className="mt-16">
          <h2 className="section-title"><MapPin size={20} className="inline-icon" /> {selected} — мэдээ</h2>
          {list.length ? (
            <div className="card-grid">{list.map((n) => <NewsCard key={n.id} news={n} />)}</div>
          ) : (
            <div className="card">
              <Empty icon={Newspaper} title="Мэдээ алга" text="Энэ аймгаас одоогоор нийтлэгдсэн мэдээ алга байна." />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
