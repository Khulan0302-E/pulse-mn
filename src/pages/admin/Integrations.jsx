// FR-INT-001: API холболтын тохиргоо (URL, түлхүүр, давтамж), гараар татах
import { useState } from 'react';
import { RefreshCw, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fmtDate } from '../../lib/format';
import { saveIntegration } from '../../api/admin';
import { refreshExternal, EXTERNAL_LABELS } from '../../api/external';
import { Field, Alert, Spinner } from '../../components/ui';

function IntegrationCard({ type }) {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const s = db.settings[type];
  const rows = db.external.filter((r) => r.type === type);
  const [f, setF] = useState({ url: s.url, apiKey: s.apiKey, intervalMin: s.intervalMin, sourceName: s.sourceName, city: s.city || '', currencies: s.currencies || '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    try {
      saveIntegration(user, type, f);
      toast.success('Тохиргоо хадгалагдлаа.');
    } catch (e) {
      toast.error(e.message);
    }
  };
  const pull = async () => {
    setBusy(true);
    await refreshExternal(type, { force: true });
    setBusy(false);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>{EXTERNAL_LABELS[type]}</h3>
        {s.lastError ? (
          <span className="status-pill red"><AlertTriangle size={14} /> Алдаатай</span>
        ) : s.lastSuccessAt ? (
          <span className="status-pill green"><CheckCircle2 size={14} /> Хэвийн</span>
        ) : null}
      </div>
      <div className="card-body form-grid">
        <Field label="API URL" required hint="{KEY} гэж бичвэл API түлхүүрээр солигдоно">
          <input className="input mono" value={f.url} onChange={(e) => set('url', e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="API түлхүүр"><input className="input" type="password" value={f.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder="Шаардлагагүй бол хоосон" /></Field>
          <Field label="Шинэчлэх давтамж (минут)" required><input className="input" type="number" min={5} value={f.intervalMin} onChange={(e) => set('intervalMin', e.target.value)} /></Field>
        </div>
        <div className="form-row">
          <Field label="Эх сурвалжийн нэр"><input className="input" value={f.sourceName} onChange={(e) => set('sourceName', e.target.value)} /></Field>
          {type === 'weather' ? (
            <Field label="Хот"><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
          ) : (
            <Field label="Валютын жагсаалт" hint="Таслалаар тусгаарлана"><input className="input mono" value={f.currencies} onChange={(e) => set('currencies', e.target.value)} /></Field>
          )}
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={save}><Save size={16} /> Хадгалах</button>
          <button className="btn btn-secondary" onClick={pull} disabled={busy}>{busy ? <Spinner /> : <RefreshCw size={16} />} Одоо татах</button>
        </div>
        {s.lastError && <Alert tone="error" title={`Сүүлийн алдаа: ${s.lastError}`}>{fmtDate(s.lastErrorAt)}. Нийтийн хуудсанд сүүлд амжилттай татсан өгөгдлийг огноотой нь харуулж байна.</Alert>}
        <div className="muted small">Сүүлд амжилттай татсан: {fmtDate(s.lastSuccessAt)}</div>
        {rows.length > 0 && (
          <div className="table-wrap bordered">
            <table className="table">
              <thead><tr><th>{type === 'weather' ? 'Хот' : 'Валют'}</th><th>Утга</th><th>Эх сурвалж</th><th>Татсан</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}><td><strong>{r.key}</strong></td><td>{type === 'fx' ? `₮${r.value}` : r.value}</td><td>{r.source}</td><td className="nowrap">{fmtDate(r.fetchedAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Integrations() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>API интеграц</h1>
          <p>Зөвхөн нийтэд нээлттэй эх сурвалжаас татна. Эх сурвалж, татсан цагийг платформд харуулна.</p>
        </div>
      </div>
      <div className="stack">
        <IntegrationCard type="weather" />
        <IntegrationCard type="fx" />
      </div>
    </>
  );
}
