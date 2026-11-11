// Редактор, Админ: нэр дэвшигч, нам нэмэх / засах / устгах, онцлох нэр дэвшигч сонгох
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PenLine, Trash2, Star, Users, Landmark, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDb } from '../../lib/useDb';
import {
  listCandidates, listParties, partyById, partyMembers, ageOf, saveCandidate, saveParty,
  deleteCandidate, deleteParty, setCandidateFeatured, ELECTION_RESULTS,
} from '../../api/election';
import { Modal, Confirm, Field, Empty, Spinner, Alert } from '../../components/ui';
import { Portrait } from '../election/Election';

function RowsEditor({ rows, setRows, cols, addLabel }) {
  const set = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="rows-editor">
      {rows.map((r, i) => (
        <div key={i} className="rows-editor-row" style={{ gridTemplateColumns: `${cols.map((c) => c.w || '1fr').join(' ')} 34px` }}>
          {cols.map((c) =>
            c.options ? (
              <select key={c.k} className="select" value={r[c.k] || ''} onChange={(e) => set(i, c.k, e.target.value)} aria-label={c.label}>
                <option value="">{c.label}</option>
                {c.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input key={c.k} className="input" placeholder={c.label} aria-label={c.label} value={r[c.k] || ''} onChange={(e) => set(i, c.k, e.target.value)} />
            ),
          )}
          <button type="button" className="icon-btn sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Мөр хасах"><X size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows([...rows, {}])}><Plus size={14} /> {addLabel}</button>
    </div>
  );
}

function CandidateForm({ initial, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const db = useDb();
  const [f, setF] = useState({
    fullName: '', birthYear: '', partyId: '', district: '', position: '', bio: '', featured: false,
    ...initial,
    education: initial?.education?.length ? initial.education : [{}],
    electionHistory: initial?.electionHistory || [],
  });
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true); setError(''); setErrors({});
    try {
      await saveCandidate(user, f, photo);
      toast.success('Хадгаллаа.');
      onClose();
    } catch (e) {
      setError(e.message); setErrors(e.fields || {});
    } finally { setBusy(false); }
  };
  return (
    <Modal wide title={initial?.id ? 'Нэр дэвшигч засах' : 'Нэр дэвшигч нэмэх'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Болих</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />} Хадгалах</button></>}>
      <div className="form-grid">
        {error && <Alert tone="error" title={error} />}
        <div className="form-row-2">
          <Field label="Овог нэр" required error={errors.fullName}><input className="input" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} /></Field>
          <Field label="Төрсөн он" error={errors.birthYear} hint={f.birthYear ? `${ageOf(f.birthYear)} настай` : 'Нас автоматаар бодогдоно'}>
            <input className="input" inputMode="numeric" maxLength={4} value={f.birthYear || ''} onChange={(e) => set('birthYear', e.target.value.replace(/\D/g, ''))} placeholder="1975" />
          </Field>
        </div>
        <div className="form-row-3">
          <Field label="Нам">
            <select className="select" value={f.partyId || ''} onChange={(e) => set('partyId', e.target.value)}>
              <option value="">Бие даагч</option>
              {listParties(db).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Тойрог"><input className="input" value={f.district || ''} onChange={(e) => set('district', e.target.value)} placeholder="Жишээ: Увс аймаг, 4-р тойрог" /></Field>
          <Field label="Одоогийн албан тушаал"><input className="input" value={f.position || ''} onChange={(e) => set('position', e.target.value)} /></Field>
        </div>
        <Field label="Зураг" hint="JPG, PNG, WEBP. Хувийн мэдээлэл (хаяг, утас, гэр бүл) оруулахгүй.">
          <div className="row">
            <Portrait c={{ ...f, photoUrl: photo ? URL.createObjectURL(photo) : f.photoUrl }} size="sm" />
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>
        </Field>
        <Field label="Боловсрол">
          <RowsEditor rows={f.education} setRows={(r) => set('education', r)} addLabel="Боловсрол нэмэх"
            cols={[{ k: 'school', label: 'Сургууль', w: '2fr' }, { k: 'degree', label: 'Зэрэг / мэргэжил', w: '2fr' }, { k: 'year', label: 'Он', w: '90px' }]} />
        </Field>
        <Field label="Өмнөх сонгуулийн оролцоо">
          <RowsEditor rows={f.electionHistory} setRows={(r) => set('electionHistory', r)} addLabel="Сонгууль нэмэх"
            cols={[{ k: 'year', label: 'Он', w: '70px' }, { k: 'election', label: 'Сонгууль (УИХ, ИТХ…)' }, { k: 'district', label: 'Тойрог' },
              { k: 'party', label: 'Нам' }, { k: 'votes', label: 'Санал / %', w: '100px' }, { k: 'result', label: 'Үр дүн', options: ELECTION_RESULTS, w: '140px' }]} />
        </Field>
        <Field label="Танилцуулга"><textarea className="textarea" rows={4} value={f.bio || ''} onChange={(e) => set('bio', e.target.value)} /></Field>
        <label className="check featured-check">
          <input type="checkbox" checked={Boolean(f.featured)} onChange={(e) => set('featured', e.target.checked)} />
          <span><strong>Онцлох нэр дэвшигч</strong> — «Сонгууль» хуудасны дээд хэсэгт гаргана</span>
        </label>
      </div>
    </Modal>
  );
}

function PartyForm({ initial, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: '', shortName: '', color: '#1d4ed8', foundedOn: '', chairman: '', description: '', website: '', ...initial });
  const [logo, setLogo] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true); setError(''); setErrors({});
    try {
      await saveParty(user, f, logo);
      toast.success('Хадгаллаа.');
      onClose();
    } catch (e) {
      setError(e.message); setErrors(e.fields || {});
    } finally { setBusy(false); }
  };
  return (
    <Modal title={initial?.id ? 'Нам засах' : 'Нам нэмэх'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Болих</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />} Хадгалах</button></>}>
      <div className="form-grid">
        {error && <Alert tone="error" title={error} />}
        <Field label="Намын нэр" required error={errors.name}><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="form-row-3">
          <Field label="Товчлол"><input className="input" value={f.shortName || ''} onChange={(e) => set('shortName', e.target.value)} placeholder="МАН, АН…" /></Field>
          <Field label="Байгуулагдсан" error={errors.foundedOn}><input className="input" type="date" value={f.foundedOn || ''} onChange={(e) => set('foundedOn', e.target.value)} /></Field>
          <Field label="Өнгө"><input className="input color-input" type="color" value={f.color || '#1d4ed8'} onChange={(e) => set('color', e.target.value)} /></Field>
        </div>
        <Field label="Дарга"><input className="input" value={f.chairman || ''} onChange={(e) => set('chairman', e.target.value)} /></Field>
        <Field label="Вэб сайт" error={errors.website}><input className="input" value={f.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
        <Field label="Лого"><input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></Field>
        <Field label="Танилцуулга"><textarea className="textarea" rows={4} value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function ElectionManage() {
  const { user } = useAuth();
  const toast = useToast();
  const db = useDb();
  const [tab, setTab] = useState('candidates');
  const [editC, setEditC] = useState(null);
  const [editP, setEditP] = useState(null);
  const [del, setDel] = useState(null);
  const candidates = listCandidates(db);
  const parties = listParties(db);
  const run = async (fn, ok) => {
    try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(e.message); }
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Сонгууль</h1>
          <p>Нэр дэвшигч, намын мэдээлэл. ☆ дарж «Онцлох нэр дэвшигч» болгоно. <Link className="link" to="/songuuli">Нийтийн хуудас <ExternalLink size={12} /></Link></p>
        </div>
        <button className="btn btn-primary" onClick={() => (tab === 'parties' ? setEditP({}) : setEditC({}))}>
          <Plus size={16} /> {tab === 'parties' ? 'Нам нэмэх' : 'Нэр дэвшигч нэмэх'}
        </button>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'candidates'} className={tab === 'candidates' ? 'active' : ''} onClick={() => setTab('candidates')}><Users size={15} /> Нэр дэвшигчид <span className="tab-count">{candidates.length}</span></button>
        <button role="tab" aria-selected={tab === 'parties'} className={tab === 'parties' ? 'active' : ''} onClick={() => setTab('parties')}><Landmark size={15} /> Намууд <span className="tab-count">{parties.length}</span></button>
      </div>
      <div className="card">
        {tab === 'candidates' ? (
          !candidates.length ? <Empty icon={Users} title="Нэр дэвшигч алга" text="«Нэр дэвшигч нэмэх» дарж эхлээрэй." /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Онцлох</th><th>Нэр</th><th>Нас</th><th>Нам</th><th>Тойрог</th><th /></tr></thead>
              <tbody>{candidates.map((c) => (
                <tr key={c.id}>
                  <td><button className={`btn btn-ghost btn-sm icon-only featured-toggle ${c.featured ? 'on' : ''}`} aria-pressed={c.featured}
                    title={c.featured ? 'Онцлохоос хасах' : 'Онцлох болгох'} onClick={() => run(() => setCandidateFeatured(user, c.id, !c.featured))}>
                    <Star size={15} fill={c.featured ? 'currentColor' : 'none'} /></button></td>
                  <td><div className="row nowrap"><Portrait c={c} size="xs" /><span className="cell-title">{c.fullName}</span></div></td>
                  <td>{ageOf(c.birthYear) ?? '—'}</td>
                  <td>{partyById(db, c.partyId)?.name || <span className="muted">Бие даагч</span>}</td>
                  <td>{c.district || '—'}</td>
                  <td><div className="row nowrap">
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditC(c)}><PenLine size={14} /> Засах</button>
                    <button className="btn btn-ghost btn-sm icon-only danger-text" title="Устгах" onClick={() => setDel({ kind: 'c', item: c })}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )
        ) : !parties.length ? <Empty icon={Landmark} title="Нам алга" text="«Нам нэмэх» дарж эхлээрэй." /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Нам</th><th>Байгуулагдсан</th><th>Дарга</th><th>Нэр дэвшигч</th><th /></tr></thead>
            <tbody>{parties.map((p) => (
              <tr key={p.id}>
                <td><span className="party-line" style={{ '--party': p.color || 'var(--muted)' }}><span className="party-dot" /><span className="cell-title">{p.name}</span></span></td>
                <td>{p.foundedOn?.slice(0, 10) || '—'}</td>
                <td>{p.chairman || '—'}</td>
                <td>{partyMembers(db, p.id).length}</td>
                <td><div className="row nowrap">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditP(p)}><PenLine size={14} /> Засах</button>
                  <button className="btn btn-ghost btn-sm icon-only danger-text" title="Устгах" onClick={() => setDel({ kind: 'p', item: p })}><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      {editC && <CandidateForm initial={editC.id ? editC : null} onClose={() => setEditC(null)} />}
      {editP && <PartyForm initial={editP.id ? editP : null} onClose={() => setEditP(null)} />}
      {del && (
        <Confirm tone="danger" confirmLabel="Устгах"
          title={del.kind === 'c' ? 'Нэр дэвшигч устгах' : 'Нам устгах'}
          text={del.kind === 'c' ? `«${del.item.fullName}»-ийг устгах уу?` : `«${del.item.name}» намыг устгах уу? Энэ намын нэр дэвшигчид «Бие даагч» болно.`}
          onConfirm={() => run(() => (del.kind === 'c' ? deleteCandidate(user, del.item.id) : deleteParty(user, del.item.id)), 'Устгалаа.')}
          onClose={() => setDel(null)} />
      )}
    </>
  );
}
