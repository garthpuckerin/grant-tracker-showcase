// Sidebar + Topbar
import React from 'react';
import { Icon } from './atoms.jsx';
import { getTheme, setTheme, THEMES } from './theme.js';
import { DATA } from './data.js';
import { insightColor } from './viz-color.js';
import { useCurrentUser, setCurrentUser, useStore } from './store.js';
import { ROLE_LABEL } from './rbac.js';

// The acting-identity switcher lives in the sidebar user block. Switching among
// Admin / PI / Finance changes what the reallocation workflow permits (rbac.js)
// — it is the demo's RBAC control, not a cosmetic label. One representative
// fixture user per role.
const SWITCH_IDS = ['u1', 'u2', 'u5'];

const RoleSwitcher = ({ onSignOut }) => {
  const user = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState(null);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options = SWITCH_IDS.map((id) => DATA.users.find((u) => u.id === id)).filter(Boolean);
  const pick = (id) => { setCurrentUser(id); setOpen(false); };

  return (
    <div className="sidebar-user" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => {
          if (!open && ref.current) {
            const r = ref.current.getBoundingClientRect();
            setMenuPos({
              left: Math.max(8, Math.min(r.left, window.innerWidth - 256)),
              bottom: Math.max(8, window.innerHeight - r.top + 8),
              width: Math.max(240, Math.min(Math.round(r.width), 300)),
            });
          }
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch acting role — changes what you can do"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
      >
        <div className="avatar">{user.initials}</div>
        <div className="who">
          <div className="nm">{user.name}</div>
          <div className="rl">{ROLE_LABEL[user.role]}</div>
        </div>
        <Icon name="chevD" size={12} />
      </button>
      {onSignOut && (
        <button
          type="button"
          className="sidebar-signout"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out — return to landing"
        >
          <Icon name="arrowR" size={14} />
        </button>
      )}
      {open && (
        <div
          role="menu"
          style={{ position: 'fixed', left: menuPos?.left ?? 8, bottom: menuPos?.bottom ?? 80, width: menuPos?.width ?? 240, background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 2, boxShadow: '0 10px 34px rgba(0,0,0,0.28)', zIndex: 90, overflow: 'hidden' }}
        >
          <div className="kicker" style={{ padding: '10px 12px 6px' }}>Viewing as</div>
          {options.map((u) => {
            const active = u.id === user.id;
            return (
              <button
                key={u.id}
                role="menuitem"
                onClick={() => pick(u.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderTop: '1px solid var(--rule)', cursor: 'pointer', textAlign: 'left', color: 'inherit' }}
              >
                <div className="avatar-sm">{u.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: active ? 'var(--accent)' : 'var(--ink)' }}>{u.name}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--ink-3)' }}>{ROLE_LABEL[u.role]}</div>
                </div>
                {active && <Icon name="check" size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Topbar notifications are derived from the AI insights feed so the demo stays
// internally consistent (the same items appear on the Insights screen). The dot
// color uses the SHARED insightColor() (agent-first) so the topbar, dashboard
// widget, and Insights screen all tint each finding identically.
// Derived from the LIVE store inside Topbar (below), so dismissing an insight
// drops it from the bell too.
const toNotifications = (insights) => insights.slice(0, 5).map((i) => ({
  id: i.id,
  title: i.title,
  meta: `${i.agent} · ${i.severity}`,
  color: insightColor(i),
}));

const AI_PROMPTS = [
  'Summarize portfolio risk',
  'Which grants are over budget?',
  'Draft an SF-425 narrative',
];

// Cycle button: light → beige → dark → light. Glyph reflects the CURRENT
// theme; aria-label/title describe the action (the next theme).
const THEME_META = {
  light: { icon: 'sun',  label: 'Light' },
  beige: { icon: 'star', label: 'Beige' },
  dark:  { icon: 'moon', label: 'Dark' },
};

const ThemeToggle = () => {
  const [theme, setThemeState] = React.useState(getTheme);
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const meta = THEME_META[theme] || THEME_META.light;
  const cycle = () => setThemeState(setTheme(next));
  return (
    <button
      className="tb-icon"
      onClick={cycle}
      aria-label={`Theme: ${meta.label}. Switch to ${THEME_META[next].label}`}
      title={`Theme: ${meta.label} — click for ${THEME_META[next].label}`}
    >
      <Icon name={meta.icon} size={14} />
    </button>
  );
};

const SidebarItem = ({ id, name, icon, count, active, onClick }) => (
  <button
    type="button"
    className={`sidebar-item ${active ? 'active' : ''}`}
    onClick={() => onClick(id)}
    aria-current={active ? 'page' : undefined}
    data-label={name}
    title={name}
  >
    <span className="si-icon"><Icon name={icon} size={14} /></span>
    <span className="si-label">{name}</span>
    {count != null && <span className="si-count">{count}</span>}
  </button>
);

export const Sidebar = ({ route, navigate, counts, open = false, onClose, onSignOut, collapsed = false, onToggleCollapse }) => {
  // On mobile, selecting a destination should also dismiss the drawer so the
  // user lands directly on the new screen.
  const go = (id) => {
    navigate({ name: id });
    if (onClose) onClose();
  };
  const main = [
    { id: 'dashboard', name: 'Overview',   icon: 'home',    count: null },
    { id: 'grants',    name: 'Grants',     icon: 'grid',    count: counts.grants },
    { id: 'tasks',     name: 'Tasks',      icon: 'check',   count: counts.openTasks },
    { id: 'documents', name: 'Documents',  icon: 'file',    count: counts.docs },
  ];
  const intel = [
    { id: 'insights',   name: 'AI Insights',  icon: 'sparkle', count: counts.insights },
    { id: 'compliance', name: 'Compliance',   icon: 'shield',  count: null },
    { id: 'reports',    name: 'Reports',      icon: 'chart',   count: null },
  ];
  // PIs keep SF-425 (they prepare filings on their awards) but not the
  // workspace-administration surfaces (2 CFR 200.303 least-privilege).
  const sbUser = useCurrentUser();
  const admin = [
    { id: 'sf425', name: 'SF-425 Filings', icon: 'flag',  count: null },
    ...(sbUser.role === 'PI' ? [] : [
      { id: 'users', name: 'Members',        icon: 'user',  count: null },
      { id: 'settings', name: 'Settings',    icon: 'settings', count: null },
    ]),
  ];
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} role="navigation" aria-label="Primary">
      {onToggleCollapse && (
        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleCollapse}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <Icon name={collapsed ? 'arrowR' : 'arrowL'} size={12} />
        </button>
      )}
      <div className="sidebar-brand">
        <span className="mark">G</span>
        <span className="word">Grant Tracker</span>
        <span className="ver">v2.0</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Workspace</div>
        {main.map(it => <SidebarItem key={it.id} {...it} active={route.name === it.id} onClick={go} />)}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Intelligence</div>
        {intel.map(it => <SidebarItem key={it.id} {...it} active={route.name === it.id} onClick={go} />)}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Administration</div>
        {admin.map(it => <SidebarItem key={it.id} {...it} active={route.name === it.id} onClick={go} />)}
      </div>

      <RoleSwitcher onSignOut={onSignOut} />
    </aside>
  );
};

export const Topbar = ({ route, navigate, search, setSearch, onToggleNav, searchRef, onReplayTour }) => {
  // Which header popover is open ('ai' | 'notif' | 'help' | null). Only one at
  // a time; toggling the same icon closes it.
  const NOTIFICATIONS = toNotifications(useStore((s) => s.insights));
  const [menu, setMenu] = React.useState(null);
  const [readAll, setReadAll] = React.useState(false);
  // Narrow widths: the search collapses to an icon and expands to its own row
  // on demand (instead of the bar wrapping into a permanent second row).
  const [searchOpen, setSearchOpen] = React.useState(false);
  const openSearch = () => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 0); };
  const [aiQuery, setAiQuery] = React.useState('');
  const actionsRef = React.useRef(null);
  const unread = readAll ? 0 : NOTIFICATIONS.length;

  // Close the open popover on outside-click (mousedown) or Escape. The listener
  // is only attached while a popover is open, and is cleaned up on unmount/close.
  React.useEffect(() => {
    if (!menu) return;
    const onDown = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setMenu(null);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const toggle = (m) => setMenu((cur) => (cur === m ? null : m));

  const goTo = (name) => {
    setMenu(null);
    navigate({ name });
  };
  const goInsights = () => goTo('insights');

  const submitAi = (e) => {
    e.preventDefault();
    goInsights();
  };

  // Search Enter routes to the Grants screen with the current query applied.
  // The grants screen consumes the shared `search` state directly, so we only
  // need to navigate (and ensure the query is committed first). Existing ⌘K
  // focus behavior is wired in app.jsx and left untouched.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return;
    setMenu(null);
    navigate({ name: 'grants' });
  };

  const crumbs = (() => {
    const map = {
      dashboard:  ['Overview'],
      grants:     ['Portfolio', 'Grants'],
      grant:      ['Portfolio', 'Grants', route.grant?.number],
      year:       ['Portfolio', 'Grants', route.grant?.number, `Year ${route.year}`],
      tasks:      ['Workspace', 'Tasks'],
      documents:  ['Workspace', 'Documents'],
      insights:   ['Intelligence', 'AI Insights'],
      compliance: ['Intelligence', 'Compliance'],
      reports:    ['Intelligence', 'Reports'],
      sf425:      ['Administration', 'SF-425 Filings'],
      sf425detail:['Administration', 'SF-425 Filings', route.period || 'Report'],
      users:      ['Administration', 'Members'],
      settings:   ['Administration', 'Settings'],
    };
    return map[route.name] || [route.name];
  })();
  return (
    <div className="topbar">
      <div className={`topbar-inner ${searchOpen ? 'search-open' : ''}`}>
      <button
        className="tb-icon nav-toggle"
        onClick={onToggleNav}
        aria-label="Open navigation"
        title="Menu"
      >
        <Icon name="menu" size={16} />
      </button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="tb-search">
        <Icon name="search" size={12} />
        <input
          ref={searchRef}
          aria-label="Search grants, PIs, line items, documents"
          placeholder="Search grants, PIs, line items, documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKey}
        />
        <span className="kbd">⌘K</span>
        <button type="button" className="tb-icon tb-search-close" aria-label="Close search" onClick={() => setSearchOpen(false)}><Icon name="close" size={12} /></button>
      </div>
      <div className="tb-actions" ref={actionsRef}>
        <button type="button" className="tb-icon tb-search-toggle" aria-label="Search" title="Search" onClick={openSearch}>
          <Icon name="search" size={14} />
        </button>
        <button
          className={`tb-icon ${menu === 'ai' ? 'is-open' : ''}`}
          aria-label="AI Assistant"
          title="AI Assistant"
          aria-haspopup="dialog"
          aria-expanded={menu === 'ai'}
          onClick={() => toggle('ai')}
        >
          <Icon name="sparkle" size={14} /><span className="dot"></span>
        </button>
        <button
          className={`tb-icon ${menu === 'notif' ? 'is-open' : ''}`}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          title="Notifications"
          aria-haspopup="dialog"
          aria-expanded={menu === 'notif'}
          onClick={() => toggle('notif')}
        >
          <Icon name="bell" size={14} />{unread > 0 && <span className="dot"></span>}
        </button>
        <ThemeToggle />
        <button
          className={`tb-icon ${menu === 'help' ? 'is-open' : ''}`}
          aria-label="Help"
          title="Help"
          aria-haspopup="dialog"
          aria-expanded={menu === 'help'}
          onClick={() => toggle('help')}
        >
          <Icon name="book" size={14} />
        </button>

        {menu === 'notif' && (
          <div className="tb-pop" role="dialog" aria-label="Notifications">
            <div className="tb-pop-head">
              <span className="tb-pop-title">Notifications</span>
              <span className="kicker">{unread} unread</span>
            </div>
            <div className="tb-pop-list">
              {NOTIFICATIONS.map((n) => (
                <button key={n.id} className="tb-pop-item" onClick={goInsights}>
                  <span className="tb-pop-dot" style={{ background: n.color }} />
                  <span className="tb-pop-item-text">
                    <span className="tb-pop-item-title">{n.title}</span>
                    <span className="tb-pop-item-meta">{n.meta}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="tb-pop-foot">
              <button className="btn-link" onClick={() => setReadAll(true)} disabled={unread === 0}>
                Mark all read
              </button>
              <button className="btn-link" onClick={goInsights}>View all →</button>
            </div>
          </div>
        )}

        {menu === 'ai' && (
          <div className="tb-pop" role="dialog" aria-label="AI assistant">
            <div className="tb-pop-head">
              <span className="tb-pop-title">Grant Assistant</span>
              <span className="status active"><span className="dot"></span>Live</span>
            </div>
            <div className="tb-pop-body">
              <p className="tb-pop-hint">Ask about budgets, deadlines, compliance, or drafting.</p>
              <div className="tb-pop-chips">
                {AI_PROMPTS.map((p) => (
                  <button key={p} className="tb-chip" onClick={goInsights}>{p}</button>
                ))}
              </div>
              <form className="tb-pop-ask" onSubmit={submitAi}>
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask the grant assistant…"
                  aria-label="Ask the grant assistant"
                />
                <button type="submit" className="tb-ask-send" aria-label="Send">
                  <Icon name="arrowR" size={14} />
                </button>
              </form>
            </div>
            <div className="tb-pop-foot">
              <button className="btn-link" onClick={goInsights}>Open full assistant →</button>
            </div>
          </div>
        )}

        {menu === 'help' && (
          <div className="tb-pop" role="dialog" aria-label="Help and shortcuts">
            <div className="tb-pop-head">
              <span className="tb-pop-title">Help &amp; shortcuts</span>
            </div>
            <div className="tb-pop-body">
              <div className="tb-pop-section-label">Keyboard</div>
              <div className="tb-shortcut"><span>Search</span><span className="kbd">⌘K</span></div>
              <div className="tb-shortcut"><span>Close panels</span><span className="kbd">Esc</span></div>
              <div className="tb-pop-section-label" style={{ marginTop: 12 }}>Resources</div>
              <button className="tb-help-link" onClick={goInsights}>
                <Icon name="sparkle" size={13} /> Ask the AI assistant
              </button>
              <button className="tb-help-link" onClick={() => goTo('settings')}>
                <Icon name="settings" size={13} /> Workspace settings
              </button>
              {onReplayTour && (
                <button className="tb-help-link" onClick={() => { setMenu(null); onReplayTour(); }}>
                  <Icon name="play" size={13} /> Replay the welcome tour
                </button>
              )}
            </div>
            <div className="tb-pop-foot">
              <span className="tb-pop-note">Editorial demo build · fixtures only</span>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
