// Minimal toast/flag provider — one transient success message at a time.
// Reuses the editorial `.flag` styling; auto-dismisses after a few seconds.
import React from 'react';

const ToastContext = React.createContext(() => {});

export const useToast = () => React.useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = React.useState(null);
  const timerRef = React.useRef(null);

  const show = React.useCallback((message, tone = 'fund') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, tone, id: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className={`flag ${toast.tone} toast-flag`}>
            <div className="lbl">Success</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{toast.message}</div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
