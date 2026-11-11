import { Navigate, NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { FileText, PenLine, BadgeCheck, Inbox, CalendarClock, Newspaper, Users, Plug, ScrollText, Bell, Lock, BarChart3, Vote } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../lib/useDb';
import { ROLE_LABELS, STATUS, VERIFY } from '../lib/constants';
import { initials } from '../lib/format';
import { Empty } from './ui';

/** NFR-SEC-007: зөвхөн зөвшөөрөгдсөн ролиуд нэвтэрнэ */
export function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container page">
        <Empty icon={Lock} title="Хандах эрхгүй" text="Танд энэ хуудсыг үзэх эрх байхгүй байна." action={<Link to="/" className="btn btn-secondary">Нүүр хуудас руу</Link>} />
      </div>
    );
  }
  return children || <Outlet />;
}

const NAV = {
  journalist: [
    { to: '/j', label: 'Миний ноорог', icon: FileText, end: true },
    { to: '/j/new', label: 'Шинэ ноорог', icon: PenLine },
    { to: '/j/stats', label: 'Статистик', icon: BarChart3 },
    { to: '/j/verification', label: 'Баталгаажуулалт', icon: BadgeCheck, badge: 'verify' },
  ],
  editor: [
    { to: '/e', label: 'Хянах жагсаалт', icon: Inbox, end: true, badge: 'review' },
    { to: '/e/scheduled', label: 'Товлосон', icon: CalendarClock, badge: 'scheduled' },
    { to: '/e/published', label: 'Нийтлэгдсэн', icon: Newspaper },
    { to: '/e/election', label: 'Сонгууль', icon: Vote },
  ],
  admin: [
    { to: '/a', label: 'Хэрэглэгчид', icon: Users, end: true },
    { to: '/a/verifications', label: 'Сэтгүүлч баталгаажуулах', icon: BadgeCheck, badge: 'pendingVerify' },
    { to: '/a/news', label: 'Мэдээ', icon: Newspaper },
    { to: '/a/stats', label: 'Статистик', icon: BarChart3 },
    { to: '/a/election', label: 'Сонгууль', icon: Vote },
    { to: '/a/integrations', label: 'API интеграц', icon: Plug },
    { to: '/a/system', label: 'Лог ба нөөц', icon: ScrollText },
  ],
};

export function WorkspaceLayout() {
  const { user } = useAuth();
  const db = useDb();
  const counts = {
    review: db.news.filter((n) => n.status === STATUS.REVIEW).length,
    scheduled: db.news.filter((n) => n.status === STATUS.SCHEDULED).length,
    pendingVerify: db.verifications.filter((v) => v.status === VERIFY.PENDING).length,
    unread: db.notifications.filter((n) => n.userId === user.id && !n.read).length,
  };
  const base = { journalist: '/j', editor: '/e', admin: '/a' }[user.role];
  return (
    <div className="container ws">
      <aside className="card ws-nav">
        <div className="ws-user">
          <span className="avatar">{initials(user.fullName)}</span>
          <div>
            <strong>{user.fullName}</strong>
            <span className="muted small">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>
        {NAV[user.role].map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className="ws-link">
            <Icon size={17} />
            <span>{label}</span>
            {badge && counts[badge] > 0 && <span className="ws-count">{counts[badge]}</span>}
          </NavLink>
        ))}
        <NavLink to={`${base}/notifications`} className="ws-link">
          <Bell size={17} /> <span>Мэдэгдэл</span>
          {counts.unread > 0 && <span className="ws-count">{counts.unread}</span>}
        </NavLink>
      </aside>
      <section className="ws-main">
        <Outlet />
      </section>
    </div>
  );
}
