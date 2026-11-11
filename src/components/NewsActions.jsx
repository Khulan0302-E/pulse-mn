// Редактор, Админы мэдээн дээрх үйлдлүүд: онцлох болгох, устгах
import { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setFeatured, deleteNews } from '../api/news';
import { Confirm } from './ui';

/** «Онцлох мэдээ» эсэхийг нэг товшилтоор солино */
export function FeaturedToggle({ news, withLabel = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const on = Boolean(news.featured);
  const toggle = async () => {
    setBusy(true);
    try {
      await setFeatured(user, news.id, !on);
      toast.success(on ? 'Онцлох мэдээнээс хаслаа.' : 'Онцлох мэдээ болголоо.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className={`btn btn-sm ${withLabel ? 'btn-secondary' : 'btn-ghost icon-only'} featured-toggle ${on ? 'on' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      title={on ? 'Онцлох мэдээнээс хасах' : 'Онцлох мэдээ болгох'}
    >
      <Star size={15} fill={on ? 'currentColor' : 'none'} />
      {withLabel && (on ? 'Онцлох мэдээ' : 'Онцлох болгох')}
    </button>
  );
}

/** Мэдээг баталгаажуулалттайгаар бүрмөсөн устгана */
export function DeleteNewsButton({ news, onDeleted, withLabel = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const run = async () => {
    try {
      await deleteNews(user, news.id);
      toast.success('Мэдээ устгагдлаа.');
      onDeleted?.();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <>
      <button
        type="button"
        className={`btn btn-sm ${withLabel ? 'btn-secondary danger-text' : 'btn-ghost icon-only danger-text'}`}
        onClick={() => setAsk(true)}
        title="Устгах"
      >
        <Trash2 size={15} />
        {withLabel && 'Устгах'}
      </button>
      {ask && (
        <Confirm
          title="Мэдээ устгах"
          text={`«${news.title}» мэдээг зураг, шийдвэр, хувилбарын түүхтэй нь бүрмөсөн устгана. Буцаах боломжгүй. Үргэлжлүүлэх үү?`}
          confirmLabel="Устгах"
          tone="danger"
          onConfirm={run}
          onClose={() => setAsk(false)}
        />
      )}
    </>
  );
}
