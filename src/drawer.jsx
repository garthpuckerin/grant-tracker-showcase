// Right-edge slide-out drawer + a hand-rolled focus-trap hook.
//
// Plain-JS, no deps. Mirrors the reference `use-drawer.ts` behavior:
//   - Escape closes
//   - body scroll is locked while open
//   - focus moves into the drawer on open and returns to the trigger on close
//   - Tab is trapped within the drawer
// Backdrop click also closes. The panel carries role="dialog" aria-modal.
import React from 'react';
import { Icon } from './atoms.jsx';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility behavior for a slide-in drawer/dialog. The panel referenced by
 * `ref` must be focusable (tabIndex={-1}) and carry role="dialog".
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {React.RefObject<HTMLElement>} ref
 */
export function useDrawer(open, onClose, ref) {
  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the panel on open. The effect runs after commit, so the panel is in
    // the DOM; focus synchronously (matches the reference behavior).
    ref.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, ref]);
}

/**
 * Generic right-edge drawer shell. Renders nothing when `open` is false.
 * @param {{ open: boolean, onClose: () => void, title?: string, subtitle?: string, children: React.ReactNode }} props
 */
export const Drawer = ({ open, onClose, title, subtitle, children }) => {
  const panelRef = React.useRef(null);
  useDrawer(open, onClose, panelRef);
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            {title && <div className="drawer-title">{title}</div>}
            {subtitle && <div className="drawer-sub">{subtitle}</div>}
          </div>
          <button className="tb-icon" onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
};
