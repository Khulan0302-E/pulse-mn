// FR-AUTH-001: иргэн / сэтгүүлчийн бүртгэл, эрхийн баталгаажуулалт, и-мэйлийн код (OTP)
import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Paperclip, UserPlus, MailCheck, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DOC_TYPES, ROLES, FILE_RULES } from '../lib/constants';
import { resendSignupOtp } from '../api/auth';
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

/** И-мэйлээр ирсэн кодыг оруулах алхам (Supabase дээр «Confirm email» асаалттай үед) */
function OtpStep({ email, onVerify, onBack }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(60);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    try {
      await resendSignupOtp(email);
      toast.success('Шинэ код илгээлээ.');
      setWait(60);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form className="form-grid" onSubmit={verify} noValidate>
      <Alert tone="info" title={`${email} хаяг руу баталгаажуулах код илгээлээ`}>
        Ирсэн захианаас кодоо оруулна уу. Захиа ирээгүй бол Spam хавтсаа шалгана уу.
      </Alert>
      {error && <Alert tone="error" title={error} />}
      <Field label="Баталгаажуулах код" required>
        <input className="input input-lg otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={10} autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
      </Field>
      <button className="btn btn-primary btn-block" disabled={busy || code.length < 6}>
        {busy ? <Spinner /> : <MailCheck size={16} />} Баталгаажуулах
      </button>
      <div className="row between">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>Буцах</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={wait > 0} onClick={resend}>
          <RotateCw size={14} /> {wait > 0 ? `Дахин илгээх (${wait}с)` : 'Код дахин илгээх'}
        </button>
      </div>
    </form>
  );
}

export default function Register() {
  const { user, register, confirmOtp } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [role, setRole] = useState(ROLES.CITIZEN);
  const [otpFor, setOtpFor] = useState(null); // кодоор баталгаажуулах и-мэйл
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

  const done = (u) => {
    if (u.role === ROLES.JOURNALIST) {
      toast.success('Бүртгэл үүслээ. Таны баримтыг админ хянаж баталгаажуулна.');
      nav('/j/verification');
    } else {
      toast.success('Амжилттай бүртгүүллээ.');
      nav('/');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    try {
      done(await register({ ...f, role, docType, file }));
    } catch (err) {
      if (err.code === 'OTP_REQUIRED') {
        setOtpFor(f.email.trim().toLowerCase());
        return;
      }
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
          <h1>{otpFor ? 'И-мэйлээ баталгаажуулах' : 'Бүртгүүлэх'}</h1>
          <p className="muted">
            {otpFor ? 'Бүртгэлээ дуусгахын тулд кодоо оруулна уу'
              : role === ROLES.JOURNALIST ? 'Сэтгүүлч баримтаа хавсарган эрхээ баталгаажуулна' : 'Pulse.mn-д иргэнээр бүртгүүлэх'}
          </p>
        </div>
        {otpFor ? (
          <OtpStep
            email={otpFor}
            onVerify={async (code) => done(await confirmOtp(otpFor, code, { fullName: f.fullName.trim(), role, docType, file }))}
            onBack={() => setOtpFor(null)}
          />
        ) : (
        <>
        <div className="segmented">
          <button type="button" className={role === ROLES.CITIZEN ? 'active' : ''} onClick={() => setRole(ROLES.CITIZEN)}>Иргэн</button>
          <button type="button" className={role === ROLES.JOURNALIST ? 'active' : ''} onClick={() => setRole(ROLES.JOURNALIST)}>Сэтгүүлч</button>
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
        </>
        )}
        <p className="center muted small mt-16">
          Бүртгэлтэй юу? <Link to="/login" className="link">Нэвтрэх</Link>
        </p>
      </div>
    </div>
  );
}
