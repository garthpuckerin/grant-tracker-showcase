// App router
import React from 'react';
import { DATA } from './data.js';
import { Sidebar, Topbar } from './chrome.jsx';
import { Dashboard } from './screens/dashboard.jsx';
import { GrantsList } from './screens/grants.jsx';
import { GrantDetail } from './screens/grant-detail.jsx';
import { Tasks } from './screens/tasks.jsx';
import { Insights, Compliance, Reports, Documents, SF425, SF425Detail, Members, Settings } from './screens/secondary.jsx';
import { WorkspaceSkeleton } from './skeleton.jsx';
import { Landing } from './Landing.jsx';

// Persistence key for the marketing-landing gate. Once the visitor clicks
// "Launch demo" we remember it so reloads land back in the app, not the pitch.
const ENTERED_KEY = 'gt2:entered:v1';

const readEntered = () => {
  try { return localStorage.getItem(ENTERED_KEY) === 'true'; }
  catch { return false; }
};

const App = () => {
  const D = DATA;
  const [entered, setEntered] = React.useState(readEntered);
  const [route, setRoute] = React.useState({ name: 'dashboard' });
  const [search, setSearch] = React.useState('');
  const [navOpen, setNavOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const searchRef = React.useRef(null);
  const closeNav = React.useCallback(() => setNavOpen(false), []);

  // Enter the demo from the marketing landing — persist so reloads stay in.
  const enterDemo = React.useCallback(() => {
    try { localStorage.setItem(ENTERED_KEY, 'true'); } catch (e) {}
    setEntered(true);
  }, []);

  // Sign out — clear the gate, close the drawer, and return to the landing.
  const signOut = React.useCallback(() => {
    try { localStorage.removeItem(ENTERED_KEY); } catch (e) {}
    setNavOpen(false);
    setEntered(false);
  }, []);

  // Initial-load skeleton — first mount only (~500ms), simulating the real
  // product's data hydration. Not shown on route changes.
  React.useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Global ⌘K / Ctrl+K focuses the topbar search input (the affordance the
  // ⌘K badge advertises). Cleaned up on unmount.
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Esc closes the mobile drawer while it is open
  React.useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  // Persist route in localStorage so refresh keeps you in place
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gt2-route') || 'null');
      if (saved && saved.name) setRoute(saved);
    } catch (e) {}
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem('gt2-route', JSON.stringify(route)); } catch (e) {}
  }, [route]);

  const counts = {
    grants: D.grants.length,
    openTasks: D.tasks.filter(t => t.status !== 'COMPLETE').length,
    docs: D.documents.length,
    insights: D.insights.length,
  };

  const navigate = (r) => setRoute(r);

  // Marketing-landing gate — shown before the app on first visit. "Launch demo"
  // enters; the gate is bypassed on subsequent visits via the persisted flag.
  if (!entered) return <Landing onEnter={enterDemo} />;

  if (!loaded) return <WorkspaceSkeleton />;

  let screen;
  switch (route.name) {
    case 'dashboard':  screen = <Dashboard   navigate={navigate} />; break;
    case 'grants':     screen = <GrantsList  navigate={navigate} search={search} />; break;
    case 'grant':      screen = <GrantDetail navigate={navigate} route={route} />; break;
    case 'tasks':      screen = <Tasks       navigate={navigate} search={search} />; break;
    case 'documents':  screen = <Documents   />; break;
    case 'insights':   screen = <Insights    navigate={navigate} />; break;
    case 'compliance': screen = <Compliance  />; break;
    case 'reports':    screen = <Reports     />; break;
    case 'sf425':      screen = <SF425       navigate={navigate} />; break;
    case 'sf425detail':screen = <SF425Detail navigate={navigate} route={route} />; break;
    case 'users':      screen = <Members     />; break;
    case 'settings':   screen = <Settings    />; break;
    default:           screen = <Dashboard   navigate={navigate} />;
  }

  return (
    <div className="app">
      <Sidebar route={route} navigate={navigate} counts={counts} open={navOpen} onClose={closeNav} onSignOut={signOut} />
      {navOpen && <div className="nav-backdrop" onClick={closeNav} aria-hidden="true" />}
      <div className="main">
        <Topbar route={route} navigate={navigate} search={search} setSearch={setSearch} onToggleNav={() => setNavOpen(o => !o)} searchRef={searchRef} />
        <div className="main-inner">
          {screen}
        </div>
      </div>
    </div>
  );
};

export default App;
