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
import { Onboarding } from './Onboarding.jsx';
import { useStore } from './store.js';

// Marketing-landing gate key. SESSION-scoped (sessionStorage), so in-session
// reloads skip the pitch but a fresh visit — including a reveal-day teaser
// peeker who returns — always sees the landing again. (Once-ever onboarding, if
// added later, belongs in localStorage; the entered flag deliberately does not.)
const ENTERED_KEY = 'gt2:entered:v1';
// Once-ever onboarding flag (localStorage): the tour runs on a visitor's first
// entry and never re-nags on reload; sign-out clears it so the whole
// landing → tour → app sequence can be replayed.
const ONBOARDED_KEY = 'gt2:onboarded:v1';

const readEntered = () => {
  try { return sessionStorage.getItem(ENTERED_KEY) === 'true'; }
  catch { return false; }
};
const readOnboarded = () => {
  try { return localStorage.getItem(ONBOARDED_KEY) === 'true'; }
  catch { return false; }
};

const App = () => {
  const D = DATA;
  const [entered, setEntered] = React.useState(readEntered);
  const [onboarded, setOnboarded] = React.useState(readOnboarded);
  const [route, setRoute] = React.useState({ name: 'dashboard' });
  const [search, setSearch] = React.useState('');
  const [navOpen, setNavOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const searchRef = React.useRef(null);
  const mainRef = React.useRef(null);
  const firstRoute = React.useRef(true);
  const closeNav = React.useCallback(() => setNavOpen(false), []);

  // Enter the demo from the marketing landing — persist so reloads stay in.
  const enterDemo = React.useCallback(() => {
    try { sessionStorage.setItem(ENTERED_KEY, 'true'); } catch (e) {}
    setEntered(true);
  }, []);

  // Sign out — clear the gate, close the drawer, and return to the landing.
  const signOut = React.useCallback(() => {
    try { sessionStorage.removeItem(ENTERED_KEY); localStorage.removeItem(ONBOARDED_KEY); } catch (e) {}
    setNavOpen(false);
    setEntered(false);
    setOnboarded(false);
  }, []);

  // Finish (or skip) the tour — optionally landing on a deep link ("Show me").
  const finishTour = React.useCallback((landing) => {
    try { localStorage.setItem(ONBOARDED_KEY, 'true'); } catch (e) {}
    if (landing && landing.name) setRoute(landing);
    setOnboarded(true);
  }, []);

  // Help → Replay tour: clear the once-ever flag and show the tour again.
  const replayTour = React.useCallback(() => {
    try { localStorage.removeItem(ONBOARDED_KEY); } catch (e) {}
    setNavOpen(false);
    setOnboarded(false);
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

  // A11y: move focus to the main region on route change so keyboard and screen-
  // reader users land on the new screen's content, not on the nav control they
  // activated. Skips the initial mount (nothing to move focus from yet).
  React.useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    mainRef.current?.focus();
  }, [route]);

  // Live collections — the sidebar badges must re-derive when a task is
  // completed or a grant is created, so read the store, not the static data.
  const liveTasks = useStore((s) => s.tasks);
  const liveGrants = useStore((s) => s.grants);
  const liveDocs = useStore((s) => s.documents);
  const liveInsights = useStore((s) => s.insights);
  const counts = {
    grants: liveGrants.length,
    openTasks: liveTasks.filter(t => t.status !== 'COMPLETE').length,
    docs: liveDocs.length,
    insights: liveInsights.length,
  };

  const navigate = (r) => setRoute(r);

  // Marketing-landing gate — shown before the app on first visit. "Launch demo"
  // enters; the gate is bypassed on subsequent visits via the persisted flag.
  if (!entered) return <Landing onEnter={enterDemo} />;

  // First-run tour (domain orientation + the role choice) — once-ever.
  if (!onboarded) return <Onboarding onFinish={finishTour} />;

  if (!loaded) return <WorkspaceSkeleton />;

  let screen;
  switch (route.name) {
    case 'dashboard':  screen = <Dashboard   navigate={navigate} />; break;
    case 'grants':     screen = <GrantsList  navigate={navigate} search={search} />; break;
    case 'grant':      screen = <GrantDetail navigate={navigate} route={route} />; break;
    case 'tasks':      screen = <Tasks       navigate={navigate} search={search} />; break;
    case 'documents':  screen = <Documents   navigate={navigate} />; break;
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
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar route={route} navigate={navigate} counts={counts} open={navOpen} onClose={closeNav} onSignOut={signOut} />
      {navOpen && <div className="nav-backdrop" onClick={closeNav} aria-hidden="true" />}
      <div className="main">
        <Topbar route={route} navigate={navigate} search={search} setSearch={setSearch} onToggleNav={() => setNavOpen(o => !o)} searchRef={searchRef} onReplayTour={replayTour} />
        <main className="main-inner" id="main-content" tabIndex={-1} ref={mainRef}>
          {screen}
        </main>
      </div>
    </div>
  );
};

export default App;
