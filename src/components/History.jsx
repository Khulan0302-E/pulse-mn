// Редакторын шийдвэрийн түүх, мэдээний хувилбарын түүх (NFR-DAT-001)
import { useState } from 'react';
import { CheckCircle2, Undo2, XCircle, ChevronDown } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { DECISION_LABELS, DECISION_TONE } from '../lib/constants';
import { fmtDate, excerpt } from '../lib/format';
import { userById, categoryName, locationLabel } from '../api/news';
import { Badge } from './ui';

const DECISION_ICONS = { approve: CheckCircle2, return: Undo2, reject: XCircle };

export function DecisionTimeline({ decisions }) {
  const db = useDb();
  return (
    <ol className="timeline">
      {decisions.map((d) => {
        const Icon = DECISION_ICONS[d.decision];
        return (
          <li key={d.id} className={`tl-item tone-${DECISION_TONE[d.decision]}`}>
            <span className="tl-dot"><Icon size={15} /></span>
            <div className="tl-body">
              <div className="row">
                <Badge tone={DECISION_TONE[d.decision]}>{DECISION_LABELS[d.decision]}</Badge>
                <span className="muted small">хувилбар {d.version}</span>
              </div>
              <div className="muted small">{userById(db, d.editorId)?.fullName || 'Редактор'} · {fmtDate(d.createdAt)}</div>
              {d.comment && <div className="comment">{d.comment}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function VersionHistory({ versions }) {
  const db = useDb();
  const [open, setOpen] = useState(null);
  if (!versions.length) return <p className="muted">Түүх алга.</p>;
  return (
    <ul className="versions">
      {versions.map((v) => (
        <li key={v.id}>
          <button className="version-head" onClick={() => setOpen(open === v.id ? null : v.id)}>
            <span className="version-num">v{v.version}</span>
            <span className="version-meta">
              <span>{userById(db, v.userId)?.fullName || '—'}</span>
              <span className="muted small">{fmtDate(v.createdAt)}</span>
            </span>
            <ChevronDown size={16} className={open === v.id ? 'rot' : ''} />
          </button>
          {open === v.id && (
            <div className="version-body">
              <strong>{v.snapshot.title}</strong>
              <div className="muted small">{categoryName(db, v.snapshot.categoryId)} · {locationLabel(db, v.snapshot.locationId)}</div>
              <p className="small">{excerpt(v.snapshot.content, 400)}</p>
              <div className="muted small">
                Эх сурвалж: {v.snapshot.sourceConfidential ? 'Нууцалсан' : v.snapshot.source || '—'}
                {v.snapshot.media?.length ? ` · ${v.snapshot.media.length} файл` : ''}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function InfoList({ items }) {
  return (
    <dl className="info-list">
      {items.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
