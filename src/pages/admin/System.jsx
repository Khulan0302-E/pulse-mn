// Лог хянах (NFR-SEC, Эрхийн матриц), нөөцлөлт (NFR-REL-001)
import { useRef, useState } from 'react';
import { Search, Download, Upload, RotateCcw, Database, Newspaper } from 'lucide-react';
import { useDb } from '../../lib/useDb';
import { useToast } from '../../context/ToastContext';
import { fmtDate } from '../../lib/format';
import { exportDb, restoreDb, restoreFromAutoBackup, getBackupInfo, resetDb, isRemote } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { seedSampleNews } from '../../api/admin';
import { userById } from '../../api/news';
import { Confirm } from '../../components/ui';

export default function System() {
  const db = useDb();
  const { user } = useAuth();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      const n = await seedSampleNews(user);
      toast.success(n ? `${n} жишээ мэдээ нэмэгдлээ.` : 'Жишээ мэдээ аль хэдийн нэмэгдсэн байна.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSeeding(false);
    }
  };
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(50);
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const backup = getBackupInfo();

  const logs = db.logs.filter((l) => {
    if (!q.trim()) return true;
    const who = l.userId ? userById(db, l.userId)?.fullName || '' : 'Систем';
    return `${who} ${l.action} ${l.object}`.toLowerCase().includes(q.trim().toLowerCase());
  });

  const download = () => {
    const blob = new Blob([exportDb()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file) => {
    try {
      restoreDb(await file.text());
      toast.success('Нөөцөөс амжилттай сэргээлээ.');
    } catch (e) {
      toast.error(e.message || 'Файл уншиж чадсангүй.');
    }
  };

  const actions = {
    auto: { title: 'Автомат нөөцөөс сэргээх', text: `${fmtDate(backup?.createdAt)}-ны нөөцөөр одоогийн өгөгдлийг солино.`, run: () => { try { restoreFromAutoBackup(); toast.success('Сэргээлээ.'); } catch (e) { toast.error(e.message); } } },
    reset: { title: 'Жишээ өгөгдөл рүү буцаах', text: 'Бүх өгөгдлийг устгаж анхны жишээ өгөгдлийг дахин үүсгэнэ.', run: resetDb },
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Лог ба нөөц</h1>
          <p>Шийдвэр, засвар, баталгаажуулалт зэрэг үйлдэл бүр бүртгэгдэнэ.</p>
        </div>
      </div>

      <div className="card card-body backup">
        <div className="row">
          <Database size={20} />
          <div>
            <strong>Өгөгдлийн нөөц</strong>
            <div className="muted small">
              {isRemote
                ? 'Өгөгдөл Supabase дээр хадгалагдана. Нөөцийг Supabase → Database → Backups хэсгээс удирдана.'
                : `24 цаг тутамд автоматаар нөөцөлнө. Сүүлийн автомат нөөц: ${fmtDate(backup?.createdAt)}`}
            </div>
          </div>
        </div>
        <div className="row">
          <button className="btn btn-secondary btn-sm" onClick={download}><Download size={15} /> Нөөц татах</button>
          {isRemote ? (
            <button className="btn btn-secondary btn-sm" onClick={seed} disabled={seeding}><Newspaper size={15} /> Жишээ мэдээ нэмэх</button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Upload size={15} /> Файлаас сэргээх</button>
              {backup && <button className="btn btn-secondary btn-sm" onClick={() => setConfirm('auto')}><RotateCcw size={15} /> Автомат нөөцөөс</button>}
              <button className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirm('reset')}>Жишээ өгөгдөл рүү буцаах</button>
            </>
          )}
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>

      <div className="card mt-16">
        <div className="filters">
          <div className="search grow">
            <Search size={16} />
            <input className="input" placeholder="Хэрэглэгч, үйлдлээр хайх…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="muted small">{logs.length} бичлэг</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Огноо</th><th>Хэрэглэгч</th><th>Үйлдэл</th><th>Холбогдох объект</th></tr></thead>
            <tbody>
              {logs.slice(0, limit).map((l) => (
                <tr key={l.id}>
                  <td className="nowrap">{fmtDate(l.createdAt)}</td>
                  <td className="nowrap">{l.userId ? userById(db, l.userId)?.fullName || `#${l.userId}` : <span className="muted">Систем</span>}</td>
                  <td>{l.action}</td>
                  <td className="muted">{l.object}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length > limit && (
          <div className="center card-body"><button className="btn btn-secondary btn-sm" onClick={() => setLimit((x) => x + 50)}>Цааш үзэх</button></div>
        )}
      </div>
      {confirm && (
        <Confirm title={actions[confirm].title} text={actions[confirm].text} confirmLabel="Үргэлжлүүлэх" tone="danger"
          onConfirm={actions[confirm].run} onClose={() => setConfirm(null)} />
      )}
    </>
  );
}
