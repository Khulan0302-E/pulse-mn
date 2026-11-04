// FR-AUTH-001: сэтгүүлчийн бүртгэл, эрхийн баталгаажуулалт
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Paperclip, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DOC_TYPES, ROLES, FILE_RULES } from '../lib/constants';
import { LogoMark } from '../components/Logo';
import { Field, Alert, Spinner } from '../components/ui';

export function DocFields({ docType, setDocType, file, setFile, errors }) {
  return (
    <>
      <Field label="Баталгаажуулах баримтын төрөл" required error={errors.docType}>
        <select className="select" value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="">Сонгох</option>
          {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Баримтын файл" required error={errors.file} hint={FILE_RULES.verification.label + ' · аль нэг баримт хангалттай'}>
        <label className="file-pick">
          <Paperclip size={16} />
          <span className={file ? '' : 'muted'}>{file ? file.name : 'Файл сонгох…'}</span>
          <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
      </Field>
    </>
  );
}

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [role, setRole] = useState(ROLES.JOURNALIST);
  const [f, setF] = useState({ fullName: '', email: '', phone: '', org: '', password: '', password2: '', terms: false });
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    try {
      const u = await register({ ...f, role, docType, file });
      if (u.role === ROLES.JOURNALIST) {
        toast.success('Бүртгэл үүслээ. Таны баримтыг админ хянаж баталгаажуулна.');
        nav('/j/verification');
      } else {
        toast.success('Амжилттай бүртгүүллээ.');
        nav('/');
      }
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth-card wide">
        <div className="auth-head">
          <LogoMark size={52} className="lg" />
          <h1>Бүртгүүлэх</h1>
          <p className="muted">Сэтгүүлч бол баримтаа хавсарган эрхээ баталгаажуулна</p>
        </div>
        <div className="segmented">
          <button type="button" className={role === ROLES.JOURNALIST ? 'active' : ''} onClick={() => setRole(ROLES.JOURNALIST)}>Сэтгүүлч</button>
          <button type="button" className={role === ROLES.CITIZEN ? 'active' : ''} onClick={() => setRole(ROLES.CITIZEN)}>Иргэн</button>
        </div>
        <form className="form-grid mt-16" onSubmit={submit} noValidate>
          {error && <Alert tone="error" title={error} />}
          <div className="form-row">
            <Field label="Овог нэр" required error={errors.fullName}>
              <input className="input" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Б. Болд" />
            </Field>
            <Field label="Утас" required={role === ROLES.JOURNALIST} error={errors.phone}>
              <input className="input" inputMode="numeric" maxLength={8} value={f.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="99112233" />
            </Field>
          </div>
          <Field label="И-мэйл" required error={errors.email}>
            <input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@domain.mn" />
          </Field>
          {role === ROLES.JOURNALIST && (
            <Field label="Байгууллагын нэр" error={errors.org} hint="Байгууллагын нэрийн өмнөөс ажилладаг бол бөглөнө">
              <input className="input" value={f.org} onChange={(e) => set('org', e.target.value)} placeholder="Жишээ: Хөвсгөл ТВ" />
            </Field>
          )}
          <div className="form-row">
            <Field label="Нууц үг" required error={errors.password} hint="Хамгийн багадаа 8 тэмдэгт">
              <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} />
            </Field>
            <Field label="Нууц үг давтах" required error={errors.password2}>
              <input className="input" type="password" autoComplete="new-password" value={f.password2} onChange={(e) => set('password2', e.target.value)} />
            </Field>
          </div>
          {role === ROLES.JOURNALIST && (
            <div className="form-row">
              <DocFields docType={docType} setDocType={(v) => { setDocType(v); setErrors((x) => ({ ...x, docType: undefined })); }}
                file={file} setFile={(v) => { setFile(v); setErrors((x) => ({ ...x, file: undefined })); }} errors={errors} />
            </div>
          )}
          <div className={`consent ${errors.terms ? 'has-error' : ''}`}>
            <label className="check">
              <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
              <span>Ашиглалтын нөхцөл болон хувийн мэдээллийг Хүний хувийн мэдээлэл хамгаалах тухай хуулийн дагуу боловсруулахыг зөвшөөрч байна.</span>
            </label>
            {errors.terms && <div className="field-error">{errors.terms}</div>}
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Spinner /> : <UserPlus size={16} />} Бүртгүүлэх
          </button>
        </form>
        <p className="center muted small mt-16">
          Бүртгэлтэй юу? <Link to="/login" className="link">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}
