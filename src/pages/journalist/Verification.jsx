// FR-AUTH-001: баталгаажуулалтын төлөв, татгалзсан бол дахин илгээх
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Clock, XCircle, Send } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { VERIFY, VERIFY_LABELS, VERIFY_TONE, DOC_TYPES } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { latestVerification, resubmitVerification } from '../../api/auth';
import { Badge, Spinner } from '../../components/ui';
import { InfoList } from '../../components/History';
import { DocFields } from '../Register';

const ICON = { pending: Clock, approved: BadgeCheck, rejected: XCircle };

export default function Verification() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const v = latestVerification(db, user.id);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const Icon = v ? ICON[v.status] : Clock;

  const resend = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await resubmitVerification(user, docType, file);
      toast.success('Баримтыг дахин илгээлээ. Админ хянах болно.');
      setFile(null);
      setDocType('');
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
          <h1>Баталгаажуулалт</h1>
          <p>Баталгаажсан сэтгүүлч л ноорог оруулах эрхтэй.</p>
        </div>
      </div>
      <div className="card card-body verify-card">
        <div className={`verify-icon tone-${v ? VERIFY_TONE[v.status] : 'gray'}`}><Icon size={28} /></div>
        <div className="grow">
          <div className="row">
            <h3>Бүртгэлийн төлөв</h3>
            {v && <Badge tone={VERIFY_TONE[v.status]}>{VERIFY_LABELS[v.status]}</Badge>}
          </div>
          {v ? (
            <InfoList items={[
              ['Баримтын төрөл', DOC_TYPES[v.docType]],
              ['Файл', v.fileName],
              ['Илгээсэн', fmtDate(v.createdAt)],
              ['Шийдвэрлэсэн', v.decidedAt ? fmtDate(v.decidedAt) : null],
              ['Татгалзсан шалтгаан', v.status === VERIFY.REJECTED ? v.reason : null],
            ]} />
          ) : (
            <p className="muted">Баталгаажуулах хүсэлт олдсонгүй.</p>
          )}
          {v?.status === VERIFY.APPROVED && <Link to="/j/new" className="btn btn-primary mt-16">Шинэ ноорог оруулах</Link>}
          {v?.status === VERIFY.PENDING && <p className="muted mt-16">Админ таны баримтыг хянаж байна. Шийдвэр гармагц мэдэгдэл очно.</p>}
        </div>
      </div>

      {(!v || v.status === VERIFY.REJECTED) && (
        <form className="card card-body mt-16 form-grid" onSubmit={resend} noValidate>
          <h3>Баримт дахин илгээх</h3>
          <div className="form-row">
            <DocFields docType={docType} setDocType={setDocType} file={file} setFile={setFile} errors={errors} />
          </div>
          <div><button className="btn btn-primary" disabled={busy}>{busy ? <Spinner /> : <Send size={16} />} Илгээх</button></div>
        </form>
      )}
    </>
  );
}
