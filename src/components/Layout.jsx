import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, LayoutDashboard, ChevronDown, WifiOff, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../lib/useDb';
import { CATEGORIES, ROLE_LABELS } from '../lib/constants';
import { fmtLongDate, initials } from '../lib/format';
import { useOnline } from '../hooks/useOnline';
import { WeatherIcon } from './InfoWidgets';
import Logo from './Logo';

export const WORKSPACE_HOME = { journalist: '/j', editor: '/e', admin: '/a' };

function TopBar() {
  const db = useDb();
  const weather = db.external.find((r) => r.type === 'weather');
  const usd = db.external.find((r) => r.type === 'fx' && r.key === 'USD');
  const eur = db.external.find((r) => r.type === 'fx' && r.key === 'EUR');
  return (
    <div className="topbar">
      <div className="container topbar-inner">
        <span>{fmtLongDate()}</span>
        <div className="topbar-right">
          {weather && (
            <span className="tb-item">
              <WeatherIcon code={weather.code} size={14} /> {weather.key} {Math.round(weather.temp)}°C
            </span>
          )}
          {usd && <span className="tb-item">USD ₮{Number(usd.value).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>}
          {eur && <span className="tb-item hide-sm">EUR ₮{Number(eur.value).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>}
        </div>
      </div>
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const ws = WORKSPACE_HOME[user.role];
  return (
    <div className="dropdown" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="avatar sm">{initials(user.fullName)}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="menu">
          <div className="menu-head">
            <strong>{user.fullName}</strong>
            <span>{ROLE_LABELS[user.role]} · {user.email}</span>
          </div>
          {ws && (
            <Link className="menu-item" to={ws} onClick={() => setOpen(false)}>
              <LayoutDashboard size={16} /> Ажлын орчин
            </Link>
          )}
          <Link className="menu-item" to="/notifications" onClick={() => setOpen(false)}>
            <Bell size={16} /> Мэдэгдэл
          </Link>
          <button className="menu-item" onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={16} /> Гарах
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const db = useDb();
  const nav = useNavigate();
  const unread = user ? db.notifications.filter((n) => n.userId === user.id && !n.read).length : 0;
  const ws = user && WORKSPACE_HOME[user.role];
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo-link" aria-label="Pulse.mn нүүр">
          <Logo />
        </Link>
        <nav className="catnav" aria-label="Мэдээний ангилал">
          <NavLink to="/" end>Нүүр</NavLink>
          {CATEGORIES.map((c) => (
            <NavLink key={c.id} to={`/category/${c.slug}`}>{c.name}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <Link to="/notifications" className="icon-btn" aria-label="Мэдэгдэл">
                <Bell size={18} />
                {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              {ws && (
                <Link to={ws} className="btn btn-dark btn-sm hide-sm">
                  <LayoutDashboard size={15} /> Ажлын орчин
                </Link>
              )}
              <UserMenu user={user} onLogout={() => { logout(); nav('/'); }} />
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm"><User size={15} /> Нэвтрэх</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Бүртгүүлэх</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Logo small />
          <p className="muted small">Аймаг, сумын сэтгүүлчдийн мэдээллийн платформ. Нийтлэл бүр зохиогч, эх сурвалжтай.</p>
        </div>
        <div className="footer-links">
          {CATEGORIES.map((c) => <Link key={c.id} to={`/category/${c.slug}`}>{c.name}</Link>)}
        </div>
        <p className="muted small footer-note">© {new Date().getFullYear()} Pulse.mn · Хувийн мэдээллийг Хүний хувийн мэдээлэл хамгаалах тухай хуулийн дагуу боловсруулна.</p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const online = useOnline();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app">
      <TopBar />
      <Header />
      {!online && (
        <div className="offline">
          <WifiOff size={15} /> Интернэт холболт тасарсан байна. Оруулсан мэдээлэл түр хадгалагдаж, холболт сэргэхэд автоматаар илгээгдэнэ.
        </div>
      )}
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
