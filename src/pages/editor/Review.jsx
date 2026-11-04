// FR-EDT-004: ноорог хянах, шийдвэр гаргах, тайлбартай мэдэгдэх, нийтлэх огноо товлох
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Undo2, XCircle, Send, ShieldCheck } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STATUS, DECISION, DOC_TYPES, LIMITS } from '../../lib/constants';
import { fmtDate, toLocalInput } from '../../lib/format';
import { newsDetail, decide, userById } from '../../api/news';
import { latestVerification } from '../../api/auth';
import NewsPreview from '../../components/NewsPreview';
import { Alert, Field, StatusBadge, Spinner } from '../../components/ui';
import { DecisionTimeline, VersionHistory, InfoList } from '../../components/History';

const OPTIONS = [
  { value: DECISION.APPROVE, label: 'Зөвшөөрөх', icon: CheckCircle2, tone: 'green' },
  { value: DECISION.RETURN, label: 'Буцаах', icon: Undo2, tone: 'amber' },
  { value: DECISION.REJECT, label: 'Татгалзах', icon: XCircle, tone: 'red' },
];

export default function Review() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const id = Number(useParams().id);
  const [decision, setDecision] = useState(DECISION.APPROVE);
  const [comment, setComment] = useState('');
  const [mode, setMode] = useState('now');
  const [when, setWhen] = useState('');
  const [checks, setChecks] = useState({ facts: false, legal: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  let data;
  try {
    data = newsDetail(user, id);
  } catch (e) {
    return <Alert tone="error" title={e.message} />;
  }
  if (!data) return <Alert tone="error" title="Ноорог олдсонгүй." />;
  const { news, media, decisions, versions } = data;
  const journalist = userById(db, news.journalistId);
  const ver = latestVerification(db, news.journalistId);

  const submit = (e) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      decide(user, id, {
        decision, comment, publishMode: mode, checks,
        scheduledAt: mode === 'schedule' && when ? new Date(when).toISOString() : null,
      });
      toast.success('Шийдвэр хадгалагдаж, сэтгүүлчид мэдэгдэл очлоо.');
      nav('/e');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/e" className="back"><ArrowLeft size={15} /> Хянах жагсаалт</Link>
          <div className="row"><h2 className="h-title">Ноорог хянах</h2><StatusBadge status={news.status} /></div>
          <p>#{news.id} · хувилбар {news.version} · илгээсэн {fmtDate(news.submittedAt)}</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card card-body">
          <NewsPreview news={news} media={media} />
        </div>

        <div className="stack">
          {news.status === STATUS.REVIEW ? (
            <form className="card" onSubmit={submit} noValidate>
              <div className="card-head"><h3>Шийдвэр</h3></div>
              <div className="card-body form-grid">
                <div className="decision-options">
                  {OPTIONS.map(({ value, label, icon: Icon, tone }) => (
                    <button type="button" key={value} className={`decision-opt tone-${tone} ${decision === value ? 'active' : ''}`} onClick={() => setDecision(value)}>
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>

                <Field label="Тайлбар" required={decision !== DECISION.APPROVE} error={errors.comment}
                  hint={decision === DECISION.APPROVE ? 'Заавал биш' : 'Сэтгүүлчид юуг засах, яагаад гэдгийг тодорхой бичнэ үү'}>
                  <textarea className="textarea sm" maxLength={LIMITS.comment} value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder={decision === DECISION.RETURN ? 'Жишээ: Эх сурвалжийн нэрийг тодруулна уу…' : ''} />
                </Field>

                {decision === DECISION.APPROVE && (
                  <>
                    <div className={`checks ${errors.checks ? 'has-error' : ''}`}>
                      <div className="label">Редакцийн шалгалт</div>
                      <label className="check">
                        <input type="checkbox" checked={checks.facts} onChange={(e) => setChecks((c) => ({ ...c, facts: e.target.checked }))} />
                        <span>Нэр, огноо, тоо баримтыг эх сурвалжтай тулгасан</span>
                      </label>
                      <label className="check">
                        <input type="checkbox" checked={checks.legal} onChange={(e) => setChecks((c) => ({ ...c, legal: e.target.checked }))} />
                        <span>Гүтгэлэг, хууль зүйн эрсдэлийг шалгасан</span>
                      </label>
                      {errors.checks && <div className="field-error">{errors.checks}</div>}
                    </div>
                    <div>
                      <div className="label">Нийтлэх</div>
                      <div className="segmented mt-8">
                        <button type="button" className={mode === 'now' ? 'active' : ''} onClick={() => setMode('now')}>Шууд нийтлэх</button>
                        <button type="button" className={mode === 'schedule' ? 'active' : ''} onClick={() => setMode('schedule')}>Огноо товлох</button>
                      </div>
                    </div>
                    {mode === 'schedule' && (
                      <Field label="Нийтлэх огноо, цаг" required error={errors.scheduledAt}>
                        <input className="input" type="datetime-local" min={toLocalInput(new Date())} value={when} onChange={(e) => setWhen(e.target.value)} />
                      </Field>
                    )}
                  </>
                )}

                <button className={`btn btn-block ${decision === DECISION.APPROVE ? 'btn-success' : decision === DECISION.RETURN ? 'btn-warn' : 'btn-danger'}`} disabled={busy}>
                  {busy ? <Spinner /> : <Send size={16} />} Шийдвэр илгээх
                </button>
              </div>
            </form>
          ) : (
            <Alert tone="info" title="Энэ ноорог хянагдах төлөвт байхгүй байна." />
          )}

          <div className="card">
            <div className="card-head"><h3>Сэтгүүлч</h3></div>
            <div className="card-body">
              <InfoList items={[
                ['Нэр', journalist?.fullName],
                ['Байгууллага', journalist?.org || 'Хувь хүн'],
                ['И-мэйл', journalist?.email],
                ['Утас', journalist?.phone],
                ['Баталгаажуулалт', ver ? <span className="row"><ShieldCheck size={14} /> {DOC_TYPES[ver.docType]}</span> : '—'],
              ]} />
            </div>
          </div>
          {decisions.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Өмнөх шийдвэрүүд</h3></div>
              <div className="card-body"><DecisionTimeline decisions={decisions} /></div>
            </div>
          )}
          <div className="card">
            <div className="card-head"><h3>Хувилбарын түүх</h3></div>
            <div className="card-body"><VersionHistory versions={versions} /></div>
          </div>
        </div>
      </div>
    </>
  );
}
