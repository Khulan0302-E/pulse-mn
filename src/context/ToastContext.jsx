import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((x) => x.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (type, msg) => {
      const id = Math.random().toString(36).slice(2);
      setItems((x) => [...x.slice(-3), { id, type, msg }]);
      setTimeout(() => remove(id), type === 'error' ? 6500 : 4500);
    },
    [remove],
  );
  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={18} />
              <span>{t.msg}</span>
              <button className="toast-close" onClick={() => remove(t.id)} aria-label="Хаах">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
