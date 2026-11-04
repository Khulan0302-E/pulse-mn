// Редактор: ирсэн ноорогийн жагсаалт, товлосон нийтлэлүүд
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Inbox, CalendarClock, Send } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STATUS } from '../../lib/constants';
import { fmtDate, timeAgo } from '../../lib/format';
import { editorList, publishNow, categoryName, locationLabel, userById } from '../../api/news';
import { Empty, Confirm } from '../../components/ui';

export function ReviewQueue() {
  const db = useDb();
  const { user } = useAuth();
  const nav = useNavigate();
  const list = editorList(user, STATUS.REVIEW);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Хянах жагсаалт</h1>
          <p>Сэтгүүлчдээс ирсэн, шийдвэр хүлээж буй ноорог ({list.length})</p>
        </div>
      </div>
      <div className="card">
        {!list.length ? (
          <Empty icon={Inbox} title="Хянах ноорог алга" text="Шинэ ноорог ирэхэд энд харагдаж, танд мэдэгдэл очно." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Гарчиг</th><th>Сэтгүүлч</th><th>Төрөл</th><th>Байршил</th><th>Илгээсэн</th><th /></tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n.id} className="clickable" onClick={() => nav(`/e/review/${n.id}`)}>
                    <td>
                      <span className="cell-title">{n.title}</span>
                      {n.version > 1 && <span className="muted small"> · дахин ирсэн (v{n.version})</span>}
                    </td>
                    <td className="nowrap">{userById(db, n.journalistId)?.fullName}</td>
                    <td>{categoryName(db, n.categoryId)}</td>
                    <td className="nowrap">{locationLabel(db, n.locationId)}</td>
                    <td className="nowrap" title={fmtDate(n.submittedAt)}>{timeAgo(n.submittedAt)}</td>
                    <td><Link to={`/e/review/${n.id}`} className="btn btn-primary btn-sm" onClick={(e) => e.stopPropagation()}>Хянах</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function ScheduledList() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const list = editorList(user, STATUS.SCHEDULED);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Товлосон нийтлэл</h1>
          <p>Товлосон цагт автоматаар нийтлэгдэнэ.</p>
        </div>
      </div>
      <div className="card">
        {!list.length ? (
          <Empty icon={CalendarClock} title="Товлосон нийтлэл алга" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Гарчиг</th><th>Сэтгүүлч</th><th>Төрөл</th><th>Нийтлэх цаг</th><th /></tr></thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n.id}>
                    <td><span className="cell-title">{n.title}</span></td>
                    <td className="nowrap">{userById(db, n.journalistId)?.fullName}</td>
                    <td>{categoryName(db, n.categoryId)}</td>
                    <td className="nowrap"><strong>{fmtDate(n.scheduledAt)}</strong></td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => setConfirm(n)}><Send size={14} /> Одоо нийтлэх</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {confirm && (
        <Confirm
          title="Одоо нийтлэх үү?"
          text={`«${confirm.title}» нийтлэлийг товлосон цагаас өмнө шууд нийтэлнэ.`}
          confirmLabel="Нийтлэх"
          onConfirm={async () => {
            try {
              await publishNow(user, confirm.id);
              toast.success('Нийтлэгдлээ.');
            } catch (e) {
              toast.error(e.message);
            }
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
