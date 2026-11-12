// FR-CNT-001 ноорог оруулах, FR-CNT-004 буцаагдсан ноорог засаж дахин илгээх, NFR-PERF-002
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save, Send, Eye, ArrowLeft, RotateCcw } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { getDb } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STATUS, STATUS_LABELS } from '../../lib/constants';
import { fmtDate, timeAgo } from '../../lib/format';
import { enqueue } from '../../lib/outbox';
import { isVerifiedJournalist } from '../../api/auth';
import { createNews, updateDraft, resubmitNews, prepareFiles, validateNewsData, mediaFor, decisionsFor, userById } from '../../api/news';
import NewsForm from '../../components/NewsForm';
import NewsPreview from '../../components/NewsPreview';
import { Alert, Modal, Confirm, Spinner } from '../../components/ui';
import { VerificationNotice } from './Dashboard';

const EMPTY = { title: '', content: '', categoryId: '', locationId: '', source: '', sourceConfidential: false, copyrightConsent: false, mediaLayout: '', mediaOrder: [] };
/** Урьдчилсан харагдацад сэтгүүлчийн сонгосон дарааллыг хэрэгжүүлнэ */
const orderMedia = (list, order = []) =>
  [...list].sort((a, b) => (order.includes(a.key) ? order.indexOf(a.key) : 1e9) - (order.includes(b.key) ? order.indexOf(b.key) : 1e9));

const fromNews = (n) =>
  n
    ? {
        title: n.title, content: n.content, categoryId: String(n.categoryId), locationId: String(n.locationId),
        source: n.source || '', sourceConfidential: !!n.sourceConfidential, copyrightConsent: !!n.copyrightConsent,
        mediaLayout: n.mediaLayout || '', mediaOrder: [],
      }
    : EMPTY;

export default function DraftEditor() {
  const { id } = useParams();
  const newsId = id ? Number(id) : null;
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const existing = newsId ? db.news.find((n) => n.id === newsId && n.journalistId === user.id) : null;
  const mode = !newsId ? 'create' : !existing ? 'missing' : existing.status === STATUS.DRAFT ? 'edit' : existing.status === STATUS.RETURNED ? 'resubmit' : 'locked';
  const original = useMemo(() => fromNews(existing), [existing?.id, existing?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const autoKey = `pulse_autosave_${user.id}_${newsId || 'new'}`;

  const [form, setForm] = useState(original);
  const [newFiles, setNewFiles] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmUnchanged, setConfirmUnchanged] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [restore, setRestore] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(autoKey) || 'null');
      return s && JSON.stringify(s.form) !== JSON.stringify(original) ? s : null;
    } catch {
      return null;
    }
  });

  // NFR-PERF-002: бичиж буй мэдээллийг автоматаар түр хадгална
  const dirty = JSON.stringify(form) !== JSON.stringify(original);
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(autoKey, JSON.stringify({ form, at: new Date().toISOString() }));
        setSavedAt(new Date().toISOString());
      } catch {
        /* ignore */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  if (mode === 'missing') return <Alert tone="error" title="Ноорог олдсонгүй." action={<Link className="btn btn-secondary btn-sm" to="/j">Буцах</Link>} />;
  if (mode === 'locked') {
    return (
      <Alert tone="info" title={`Энэ мэдээ «${STATUS_LABELS[existing.status]}» төлөвтэй тул засах боломжгүй.`}
        action={<Link className="btn btn-secondary btn-sm" to={`/j/news/${existing.id}`}>Дэлгэрэнгүй</Link>} />
    );
  }
  if (!isVerifiedJournalist(db, user)) return <VerificationNotice />;

  const existingMedia = existing ? mediaFor(db, existing.id) : [];
  const lastDecision = existing ? decisionsFor(db, existing.id)[0] : null;
  const kind = mode === 'create' ? 'create' : mode === 'edit' ? 'update' : 'resubmit';

  const save = async (submit, force = false) => {
    setErrors({});
    setBusy(true);
    const data = { ...form, newFiles, removeMediaIds: removed };
    try {
      if (!navigator.onLine) {
        validateNewsData(getDb(), data, { forSubmit: submit || mode === 'resubmit' });
        const prepared = await prepareFiles(newFiles);
        enqueue({ kind, userId: user.id, newsId, submit, data: { ...form, newFiles: prepared, removeMediaIds: removed } });
        localStorage.removeItem(autoKey);
        toast.info('Холболт тасарсан тул түр хадгаллаа. Холболт сэргэхэд автоматаар илгээгдэнэ.');
        nav('/j');
        return;
      }
      let resultId = newsId;
      if (mode === 'create') resultId = await createNews(user, data, { submit });
      else if (mode === 'edit') await updateDraft(user, newsId, data, { submit });
      else await resubmitNews(user, newsId, data, { force });
      localStorage.removeItem(autoKey);
      toast.success(submit || mode === 'resubmit' ? 'Амжилттай илгээлээ. Редактор хянах болно.' : 'Ноорог амжилттай хадгалагдлаа.');
      nav(`/j/news/${resultId}`);
    } catch (e) {
      if (e.code === 'UNCHANGED') setConfirmUnchanged(true);
      else {
        setErrors(e.fields || {});
        toast.error(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'create' ? 'Шинэ ноорог' : mode === 'edit' ? 'Ноорог засах' : 'Засаж дахин илгээх';

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={existing ? `/j/news/${existing.id}` : '/j'} className="back"><ArrowLeft size={15} /> Буцах</Link>
          <h1>{title}</h1>
          <p>
            {savedAt ? `Автоматаар түр хадгалсан · ${timeAgo(savedAt)}` : 'Талбарыг бөглөхөд автоматаар түр хадгална.'}
            {existing && ` · Хувилбар ${existing.version}`}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setPreview(true)}><Eye size={16} /> Урьдчилан харах</button>
      </div>

      {restore && (
        <Alert tone="info" title="Хадгалагдаагүй засвар олдлоо"
          action={
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => { setForm(restore.form); setRestore(null); }}><RotateCcw size={14} /> Сэргээх</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem(autoKey); setRestore(null); }}>Устгах</button>
            </div>
          }>
          {fmtDate(restore.at)}-нд түр хадгалсан мэдээлэл байна.
        </Alert>
      )}

      {mode === 'resubmit' && lastDecision && (
        <div className="card decision-note">
          <div className="decision-note-head">
            <strong>Редакторын тайлбар, зөвлөмж</strong>
            <span className="muted small">{userById(db, lastDecision.editorId)?.fullName} · {fmtDate(lastDecision.createdAt)}</span>
          </div>
          <p>{lastDecision.comment}</p>
        </div>
      )}

      <div className="card card-body">
        <NewsForm form={form} set={set} errors={errors} existingMedia={existingMedia} removed={removed} setRemoved={setRemoved} newFiles={newFiles} setNewFiles={setNewFiles} />
        <div className="form-actions">
          {mode === 'resubmit' ? (
            <button className="btn btn-primary" disabled={busy} onClick={() => save(true)}>
              {busy ? <Spinner /> : <Send size={16} />} Дахин илгээх
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" disabled={busy} onClick={() => save(false)}>
                <Save size={16} /> Ноорог хадгалах
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={() => save(true)}>
                {busy ? <Spinner /> : <Send size={16} />} Редакторт илгээх
              </button>
            </>
          )}
        </div>
      </div>

      {preview && (
        <Modal title="Урьдчилсан харагдац" wide onClose={() => setPreview(false)}>
          <NewsPreview
            news={{ ...form, journalistId: user.id }}
            media={orderMedia([...existingMedia.filter((m) => !removed.includes(m.id)).map((m) => ({ ...m, key: `m${m.id}` })), ...newFiles], form.mediaOrder)}
          />
        </Modal>
      )}
      {confirmUnchanged && (
        <Confirm
          title="Агуулга өөрчлөгдөөгүй байна"
          text="Та ноорогт өөрчлөлт оруулаагүй байна. Ингээд дахин илгээх үү?"
          confirmLabel="Тийм, илгээх"
          onConfirm={() => save(true, true)}
          onClose={() => setConfirmUnchanged(false)}
        />
      )}
    </>
  );
}
