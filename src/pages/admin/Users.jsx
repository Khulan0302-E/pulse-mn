// Хэрэглэгчийн эрх удирдах (Эрхийн матриц: Админ)
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABELS, USER_STATUS, USER_STATUS_LABELS } from '../../lib/constants';
import { fmtDate, initials } from '../../lib/format';
import { updateUser } from '../../api/admin';
import { Badge, Confirm } from '../../components/ui';

export default function Users() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [confirm, setConfirm] = useState(null);
  const list = db.users
    .filter((u) => !role || u.role === role)
    .filter((u) => !q.trim() || `${u.fullName} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()));

  const apply = async (id, patch) => {
    try {
      await updateUser(user, id, patch);
      toast.success('Хадгалагдлаа.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Хэрэглэгчид</h1>
          <p>Роль болон бүртгэлийн төлвийг удирдана. Нийт {db.users.length}.</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <div className="search grow">
            <Search size={16} />
            <input className="input" placeholder="Нэр, и-мэйлээр хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select auto" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Бүх роль</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Хэрэглэгч</th><th>Утас</th><th>Байгууллага</th><th>Роль</th><th>Төлөв</th><th>Бүртгэсэн</th><th /></tr></thead>
            <tbody>
              {list.map((u) => {
                const self = u.id === user.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row nowrap">
                        <span className="avatar sm">{initials(u.fullName)}</span>
                        <div>
                          <div className="cell-title">{u.fullName}{self && <span className="muted"> (та)</span>}</div>
                          <div className="muted small">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.org || '—'}</td>
                    <td>
                      <select className="select sm" value={u.role} disabled={self} onChange={(e) => apply(u.id, { role: e.target.value })}>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td><Badge tone={u.status === USER_STATUS.ACTIVE ? 'green' : 'red'}>{USER_STATUS_LABELS[u.status]}</Badge></td>
                    <td className="nowrap">{fmtDate(u.createdAt, { time: false })}</td>
                    <td>
                      {!self && (
                        u.status === USER_STATUS.ACTIVE ? (
                          <button className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirm(u)}>Түдгэлзүүлэх</button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => apply(u.id, { status: USER_STATUS.ACTIVE })}>Идэвхжүүлэх</button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {confirm && (
        <Confirm
          title="Хэрэглэгч түдгэлзүүлэх"
          text={`${confirm.fullName} системд нэвтрэх боломжгүй болно. Үргэлжлүүлэх үү?`}
          confirmLabel="Түдгэлзүүлэх"
          tone="danger"
          onConfirm={() => apply(confirm.id, { status: USER_STATUS.SUSPENDED })}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
