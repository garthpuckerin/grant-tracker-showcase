// Minimal toast/flag provider — one transient message at a time.
// Reuses the editorial `.flag` styling; auto-dismisses after a few seconds.
import React from 'react';
import { Icon } from './atoms.jsx';

const ToastContext = React.createContext(() => {});

export const useToast = () => React.useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = React.useState(null);
  const timerRef = React.useRef(null);

  // show(message, tone?, label?) — tone drives the flag color; label is the
  // small heading (default "Success", "Demo" for mocked-action notices).
  const show = React.useCallback((message, tone = 'fund', label = 'Success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, tone, label, id: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className={`flag ${toast.tone} toast-flag`}>
            <div className="lbl">{toast.label}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{toast.message}</div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

// A button whose action is an honest "mocked in this demo" notice — the §4
// floor for controls that would call a backend in production. Encapsulates the
// toast so any screen can drop one in without wiring the hook itself.
export const MockButton = ({ className = 'btn ghost', icon, label, children, message, tone = 'indigo', ...rest }) => {
  const toast = useToast();
  const notice = message || `${label || 'This action'} is mocked in this portfolio demo.`;
  return (
    <button className={className} onClick={() => toast(notice, tone, 'Demo')} {...rest}>
      {icon && <Icon name={icon} size={12} />}{icon && (label || children) ? ' ' : ''}{label}{children}
    </button>
  );
};
