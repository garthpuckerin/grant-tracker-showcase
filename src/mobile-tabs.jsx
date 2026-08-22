// Mobile bottom tab bar — the primary navigation on phones (≤720px).
//
// Four destinations a grants person reaches for most, plus "More", which opens
// the full navigation sheet (every screen, the role switcher, sign out). Hidden
// on desktop by CSS; the sidebar remains the desktop nav. Active tab carries
// aria-current. 44px+ touch targets.
import React from 'react';
import { Icon } from './atoms.jsx';

const TABS = [
  { id: 'dashboard',  label: 'Overview',   icon: 'home' },
  { id: 'grants',     label: 'Grants',     icon: 'grid' },
  { id: 'tasks',      label: 'Tasks',      icon: 'check' },
  { id: 'compliance', label: 'Compliance', icon: 'shield' },
];

// Screens that belong to a tab for highlighting purposes (detail pages etc.).
const TAB_OF = { grant: 'grants', year: 'grants', sf425detail: 'more', sf425: 'more', documents: 'more', insights: 'more', reports: 'more', users: 'more', settings: 'more' };

export const MobileTabBar = ({ route, navigate, onMore, moreOpen, counts }) => {
  const active = TAB_OF[route.name] || route.name;
  return (
    <nav className="mtab" aria-label="Primary (mobile)">
      {TABS.map((t) => {
        const on = active === t.id;
        const count = t.id === 'tasks' ? counts?.openTasks : null;
        return (
          <button
            key={t.id}
            type="button"
            className={`mtab-item ${on ? 'on' : ''}`}
            aria-current={on ? 'page' : undefined}
            onClick={() => navigate({ name: t.id })}
          >
            <span className="mtab-icon"><Icon name={t.icon} size={18} />{count ? <span className="mtab-badge">{count}</span> : null}</span>
            <span className="mtab-label">{t.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`mtab-item ${active === 'more' || moreOpen ? 'on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={!!moreOpen}
        onClick={onMore}
      >
        <span className="mtab-icon"><Icon name="menu" size={18} /></span>
        <span className="mtab-label">More</span>
      </button>
    </nav>
  );
};
