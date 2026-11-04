import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS } from '../lib/constants';
import { timeAgo, fmtDate } from '../lib/format';
import { markRead, markAllRead } from '../api/news';
import { Empty } from '../components/ui';

export default function Notifications() {
  const db = useDb();
  const { user } = useAuth();
  const nav = useNavigate();
  const list = db.notifications.filter((n) => n.userId === user.id);
  const unread = list.filter((n) => !n.read).length;

  const target = (n) => {
    if (user.role === ROLES.EDITOR && !n.newsId) return '/e/verifications';
    if (user.role === ROLES.ADMIN && !n.newsId) return '/a/integrations';
    if (!n.newsId) return null;
    if (user.role === ROLES.JOURNALIST) return `/j/news/${n.newsId}`;
    if (user.role === ROLES.EDITOR) {
      const news = db.news.find((x) => x.id === n.newsId);
      if (news?.status === STATUS.REVIEW) return `/e/review/${n.newsId}`;
      if (news?.status === STATUS.PUBLISHED) return `/news/${n.newsId}`;
      return '/e';
    }
    return `/news/${n.newsId}`;
  };

  const open = (n) => {
    if (!n.read) markRead(user, n.id).catch(() => {});
    const to = target(n);
    if (to) nav(to);
  };

  return (
    <div className="container page narrow">
      <div className="page-head">
        <div>
          <h1>Мэдэгдэл</h1>
          <p>{unread ? `${unread} уншаагүй мэдэгдэл` : 'Бүх мэдэгдлийг уншсан'}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => markAllRead(user).catch(() => {})}>
            <CheckCheck size={15} /> Бүгдийг уншсан болгох
          </button>
        )}
      </div>
      <div className="card">
        {!list.length ? (
          <Empty icon={Bell} title="Мэдэгдэл алга" text="Шинэ мэдэгдэл ирэхэд энд харагдана." />
        ) : (
          <ul className="notif-list">
            {list.map((n) => (
              <li key={n.id}>
                <button className={`notif ${n.read ? '' : 'unread'}`} onClick={() => open(n)}>
                  <span className="notif-dot" />
                  <span className="notif-body">
                    <span>{n.content}</span>
                    <span className="muted small" title={fmtDate(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
