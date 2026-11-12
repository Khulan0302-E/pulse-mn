// FR-PUB-003: нийтлэгдсэн мэдээг засварлах, шинэчлэх
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STATUS } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { updatePublished, mediaFor, versionsFor } from '../../api/news';
import NewsForm from '../../components/NewsForm';
import { VersionHistory } from '../../components/History';
import { Alert, Spinner } from '../../components/ui';

export default function EditPublished() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const id = Number(useParams().id);
  const news = db.news.find((n) => n.id === id && n.status === STATUS.PUBLISHED);
  const [form, setForm] = useState(() =>
    news
      ? { title: news.title, content: news.content, categoryId: String(news.categoryId), locationId: String(news.locationId), source: news.source || '', sourceConfidential: !!news.sourceConfidential, mediaLayout: news.mediaLayout || '', mediaOrder: [] }
      : null,
  );
  const [newFiles, setNewFiles] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (!news || !form) return <Alert tone="error" title="Нийтлэгдсэн нийтлэл олдсонгүй." action={<Link to="/e/published" className="btn btn-secondary btn-sm">Буцах</Link>} />;

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await updatePublished(user, id, { ...form, newFiles, removeMediaIds: removed });
      toast.success('Нийтлэл шинэчлэгдлээ. Өмнөх хувилбар түүхэнд хадгалагдсан.');
      nav(`/news/${id}`);
    } catch (e) {
      setErrors(e.fields || {});
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/e/published" className="back"><ArrowLeft size={15} /> Нийтлэгдсэн</Link>
          <h1>Нийтлэл засварлах</h1>
          <p>#{news.id} · хувилбар {news.version} · нийтэлсэн {fmtDate(news.publishedAt)}</p>
        </div>
      </div>
      <div className="detail-grid">
        <div className="card card-body">
          <NewsForm form={form} set={set} errors={errors} existingMedia={mediaFor(db, id)} removed={removed} setRemoved={setRemoved}
            newFiles={newFiles} setNewFiles={setNewFiles} showConsent={false} />
          <div className="form-actions">
            <Link to="/e/published" className="btn btn-secondary">Болих</Link>
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <Save size={16} />} Шинэчлэх</button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Өөрчлөлтийн түүх</h3></div>
          <div className="card-body"><VersionHistory versions={versionsFor(db, id)} /></div>
        </div>
      </div>
    </>
  );
}
