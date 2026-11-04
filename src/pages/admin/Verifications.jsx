// FR-AUTH-001 (алхам 4): админ сэтгүүлчийн баримтыг хянаж баталгаажуулах
import { useState } from 'react';
import { BadgeCheck, FileText, Check, X } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { VERIFY, VERIFY_LABELS, VERIFY_TONE, DOC_TYPES, LIMITS } from '../../lib/constants';
import { fmtDate, initials } from '../../lib/format';
import { resolveFileUrl } from '../../lib/files';
import { listVerifications, decideVerification } from '../../api/admin';
import { userById } from '../../api/news';
import { Badge, Empty, Modal, Field } from '../../components/ui';

export default function Verifications() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(VERIFY.PENDING);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const list = listVerifications(user, tab);
  const count = (s) => db.verifications.filter((v) => v.status === s).length;

  const openDoc = async (v) => {
    const win = window.open('', '_blank'); // попап хориглохоос сэргийлж эхлээд нээнэ
    const url = await resolveFileUrl(v.fileUrl).catch(() => null);
    if (url && win) win.location.href = url;
    else {
      win?.close();
      toast.error('Файл олдсонгүй (жишээ өгөгдөлд файл хавсаргаагүй байж болно).');
    }
  };

  const act = async (v, approve, why = '') => {
    try {
      await decideVerification(user, v.id, approve, why);
      toast.success(approve ? 'Сэтгүүлчийг баталгаажууллаа.' : 'Хүсэлтийг татгалзаж, шалтгааныг мэдэгдлээ.');
      setRejecting(null);
      setReason('');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Сэтгүүлч баталгаажуулах</h1>
          <p>Ирсэн баримтыг шалгаж баталгаажуулна. Байгууллагын үнэмлэх, МСНЭ-ийн гишүүнчлэл эсвэл мэргэжлийн дипломын аль нэг нь хангалттай.</p>
        </div>
      </div>
      <div className="tabs">
        {Object.values(VERIFY).map((s) => (
          <button key={s} className={`tab ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
            {VERIFY_LABELS[s]} <span className="count">{count(s)}</span>
          </button>
        ))}
      </div>
      {!list.length ? (
        <div className="card"><Empty icon={BadgeCheck} title="Хүсэлт алга" /></div>
      ) : (
        <div className="verify-grid">
          {list.map((v) => {
            const u = userById(db, v.userId);
            return (
              <div key={v.id} className="card card-body verify-item">
                <div className="row between">
                  <div className="row">
                    <span className="avatar">{initials(u?.fullName)}</span>
                    <div>
                      <strong>{u?.fullName}</strong>
                      <div className="muted small">{u?.org || 'Хувь хүн'}</div>
                    </div>
                  </div>
                  <Badge tone={VERIFY_TONE[v.status]}>{VERIFY_LABELS[v.status]}</Badge>
                </div>
                <dl className="info-list compact">
                  <div><dt>И-мэйл</dt><dd>{u?.email}</dd></div>
                  <div><dt>Утас</dt><dd>{u?.phone || '—'}</dd></div>
                  <div><dt>Баримт</dt><dd>{DOC_TYPES[v.docType]}</dd></div>
                  <div><dt>Илгээсэн</dt><dd>{fmtDate(v.createdAt)}</dd></div>
                  {v.decidedAt && <div><dt>Шийдвэрлэсэн</dt><dd>{fmtDate(v.decidedAt)}</dd></div>}
                  {v.reason && <div><dt>Шалтгаан</dt><dd>{v.reason}</dd></div>}
                </dl>
                <button className="file-link" onClick={() => openDoc(v)}><FileText size={16} /> {v.fileName}</button>
                {v.status === VERIFY.PENDING && (
                  <div className="row">
                    <button className="btn btn-success btn-sm grow" onClick={() => act(v, true)}><Check size={15} /> Баталгаажуулах</button>
                    <button className="btn btn-secondary btn-sm grow" onClick={() => setRejecting(v)}><X size={15} /> Татгалзах</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {rejecting && (
        <Modal
          title="Хүсэлт татгалзах"
          onClose={() => setRejecting(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRejecting(null)}>Болих</button>
              <button className="btn btn-danger" onClick={() => act(rejecting, false, reason)}>Татгалзах</button>
            </>
          }
        >
          <Field label="Татгалзсан шалтгаан" required hint="Сэтгүүлчид мэдэгдэл болж очих бөгөөд баримтаа дахин илгээх боломжтой.">
            <textarea className="textarea sm" maxLength={LIMITS.reason} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Жишээ: Баримтын зураг бүдэг, нэр уншигдахгүй байна." autoFocus />
          </Field>
        </Modal>
      )}
    </>
  );
}
