// Жижиг дахин ашиглагдах UI бүрэлдэхүүнүүд
import { useEffect, useState } from 'react';
import { X, Inbox, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_LABELS, STATUS_TONE } from '../lib/constants';
import { resolveFileUrl } from '../lib/files';

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="req"> *</span>}
        </label>
      )}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

const ALERT_ICONS = { info: Info, warn: AlertTriangle, error: XCircle, success: CheckCircle2 };
export function Alert({ tone = 'info', title, children, action }) {
  const Icon = ALERT_ICONS[tone];
  return (
    <div className={`alert alert-${tone}`}>
      <Icon size={18} className="alert-icon" />
      <div className="alert-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="alert-action">{action}</div>}
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <Icon size={40} strokeWidth={1.5} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Хаах">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = 'Тийм', tone = 'primary', onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Болих</button>
          <button className={`btn btn-${tone}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p className="muted">{text}</p>
    </Modal>
  );
}

/** pulsefile:// хаягийг үзүүлэх боломжтой URL болгоно */
export function useFileUrl(fileUrl) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (fileUrl) resolveFileUrl(fileUrl).then((u) => alive && setUrl(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [fileUrl]);
  return url;
}

export function MediaView({ media, className = '' }) {
  const resolved = useFileUrl(media.preview ? null : media.fileUrl);
  const src = media.preview || resolved;
  if (!src) return <div className={`media-ph ${className}`} />;
  return media.type === 'video' ? (
    <video className={className} src={src} controls preload="metadata" />
  ) : (
    <img className={className} src={src} alt={media.name || ''} loading="lazy" />
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
