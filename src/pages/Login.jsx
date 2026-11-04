import { useState } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogoMark } from '../components/Logo';
import { Field, Alert, Spinner } from '../components/ui';
import { WORKSPACE_HOME } from '../components/Layout';

const DEMO = [
  { email: 'journalist@pulse.mn', password: 'journal123', label: 'Сэтгүүлч (баталгаажсан)' },
  { email: 'editor@pulse.mn', password: 'editor123', label: 'Редактор' },
  { email: 'admin@pulse.mn', password: 'admin123', label: 'Админ' },
  { email: 'temuulen@pulse.mn', password: 'journal123', label: 'Сэтгүүлч (хүлээгдэж буй)' },
];

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={WORKSPACE_HOME[user.role] || '/'} replace />;

  const submit = async (e, creds) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(creds?.email ?? email, creds?.password ?? password);
      toast.success(`Тавтай морил, ${u.fullName}!`);
      const next = params.get('next');
      nav(next && next.startsWith('/') ? next : WORKSPACE_HOME[u.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="auth-head">
          <LogoMark size={52} className="lg" />
          <h1>Нэвтрэх</h1>
          <p className="muted">Pulse.mn платформд тавтай морил</p>
        </div>
        <form className="form-grid" onSubmit={submit} noValidate>
          {error && <Alert tone="error" title={error} />}
          <Field label="И-мэйл" required>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.mn" />
          </Field>
          <Field label="Нууц үг" required>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Spinner /> : <LogIn size={16} />} Нэвтрэх
          </button>
        </form>
        <p className="center muted small mt-16">
          Бүртгэлгүй юу? <Link to="/register" className="link">Бүртгүүлэх</Link>
        </p>
        <div className="demo">
          <div className="demo-title">Туршилтын бүртгэлүүд</div>
          <div className="demo-list">
            {DEMO.map((d) => (
              <button key={d.email} type="button" className="demo-item" disabled={busy} onClick={() => submit(null, d)}>
                <span>{d.label}</span>
                <span className="muted small">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
