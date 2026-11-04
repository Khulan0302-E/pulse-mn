// FR-CNT-003: ноорогийн дэлгэрэнгүй, редакторын шийдвэр, шалтгаан, өөрчлөлтийн түүх
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, PenLine, Send, ExternalLink, Clock } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STATUS } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { newsDetail, submitDraft } from '../../api/news';
import NewsPreview from '../../components/NewsPreview';
import { Alert, StatusBadge, Spinner } from '../../components/ui';
import { DecisionTimeline, VersionHistory, InfoList } from '../../components/History';

export default function DraftDetail() {
  useDb();
  const { user } = useAuth();
  const toast = useToast();
  const id = Number(useParams().id);
  const [busy, setBusy] = useState(false);

  let data;
  try {
    data = newsDetail(user, id);
  } catch (e) {
    return <Alert tone="error" title={e.message} />;
  }
  if (!data) return <Alert tone="error" title="Ноорог олдсонгүй." action={<Link className="btn btn-secondary btn-sm" to="/j">Буцах</Link>} />;
  const { news, media, decisions, versions } = data;

  const submit = async () => {
    setBusy(true);
    try {
      await submitDraft(user, id);
      toast.success('Редакторт илгээлээ.');
    } catch (e) {
      toast.error(e.fields ? `${e.message} ${Object.values(e.fields).join(' ')}` : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/j" className="back"><ArrowLeft size={15} /> Миний ноорог</Link>
          <div className="row"><h2 className="h-title">{news.title}</h2><StatusBadge status={news.status} /></div>
          <p>Ноорог #{news.id} · хувилбар {news.version}</p>
        </div>
        <div className="row">
          {news.status === STATUS.DRAFT && (
            <>
              <Link className="btn btn-secondary" to={`/j/edit/${news.id}`}><PenLine size={16} /> Засах</Link>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? <Spinner /> : <Send size={16} />} Редакторт илгээх</button>
            </>
          )}
          {news.status === STATUS.RETURNED && (
            <Link className="btn btn-primary" to={`/j/edit/${news.id}`}><PenLine size={16} /> Засаж дахин илгээх</Link>
          )}
          {news.status === STATUS.PUBLISHED && (
            <Link className="btn btn-secondary" to={`/news/${news.id}`}><ExternalLink size={16} /> Нийтлэлийг үзэх</Link>
          )}
        </div>
      </div>

      {news.status === STATUS.REVIEW && (
        <Alert tone="info" title="Хянагдаж буй">Редактор шийдвэр гаргаагүй байна. Шийдвэр гармагц танд мэдэгдэл очно.</Alert>
      )}
      {news.status === STATUS.SCHEDULED && (
        <Alert tone="success" title={`Зөвшөөрөгдсөн — ${fmtDate(news.scheduledAt)}-нд нийтлэгдэнэ`} />
      )}
      {news.status === STATUS.REJECTED && (
        <Alert tone="error" title="Татгалзсан">Татгалзсан ноорогийг дахин илгээх боломжгүй. Түүхэнд хадгалагдана.</Alert>
      )}

      <div className="detail-grid">
        <div className="card card-body">
          <NewsPreview news={news} media={media} showAuthor={false} />
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Редакторын шийдвэр</h3></div>
            <div className="card-body">
              {decisions.length ? <DecisionTimeline decisions={decisions} /> : (
                <p className="muted"><Clock size={14} className="inline-icon" /> {news.status === STATUS.DRAFT ? 'Ноорог илгээгдээгүй байна.' : 'Хянагдаж буй'}</p>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Мэдээлэл</h3></div>
            <div className="card-body">
              <InfoList items={[
                ['Үүсгэсэн', fmtDate(news.createdAt)],
                ['Илгээсэн', fmtDate(news.submittedAt)],
                ['Товлосон', news.scheduledAt ? fmtDate(news.scheduledAt) : null],
                ['Нийтэлсэн', news.publishedAt ? fmtDate(news.publishedAt) : null],
                ['Сүүлд шинэчилсэн', fmtDate(news.updatedAt)],
              ]} />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Өөрчлөлтийн түүх</h3></div>
            <div className="card-body"><VersionHistory versions={versions} /></div>
          </div>
        </div>
      </div>
    </>
  );
}
