// Grants list
import React from 'react';
import { DATA } from '../data.js';
import { fmt, Icon, Status, Utilization } from '../atoms.jsx';
import { utilizationColor } from '../viz-color.js';
import { useStore } from '../store.js';
import { CreateGrantForm } from '../forms.jsx';
import { useToast } from '../toast.jsx';
import { TODAY, fiscalYear, fmtMedium, TODAY_FQ_REVERSED } from '../dates.js';

// Fiscal-year end (calendar FY → Dec 31 of the current FY), derived from today.
const FY_END = new Date(fiscalYear(TODAY), 11, 31);
const FY_END_LABEL = fmtMedium(FY_END); // "Dec 31, 2026"

// Canned "Saved Views" — each applies a known filter/sort combination. `apply`
// receives the grants screen's setters so a view can drive existing state.
const SAVED_VIEWS = [
  {
    id: 'at-risk',
    label: 'At-risk',
    note: 'Utilization ≥ 80%',
    apply: (s) => { s.setStatusFilter('ALL'); s.setAgency('ALL'); s.setRisk(true); s.setClosing(false); s.setSort('utilization'); },
  },
  {
    id: 'closing-fy',
    label: 'Closing this FY',
    note: `Ends before ${FY_END_LABEL}`,
    apply: (s) => { s.setStatusFilter('ALL'); s.setAgency('ALL'); s.setRisk(false); s.setClosing(true); s.setSort('newest'); },
  },
  {
    id: 'drafts',
    label: 'Drafts',
    note: 'Status · Draft',
    apply: (s) => { s.setStatusFilter('DRAFT'); s.setAgency('ALL'); s.setRisk(false); s.setClosing(false); s.setSort('title'); },
  },
];

const SavedViews = ({ apply, activeId }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="btn ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="filter" size={12} /> Saved Views
      </button>
      {open && (
        <div className="tb-pop" role="menu" aria-label="Saved views" style={{ width: 240 }}>
          <div className="tb-pop-head">
            <span className="tb-pop-title">Saved Views</span>
          </div>
          <div className="tb-pop-list">
            {SAVED_VIEWS.map((v) => (
              <button
                key={v.id}
                role="menuitem"
                className="tb-pop-item"
                onClick={() => { v.apply(apply); setOpen(false); }}
              >
                <span className="tb-pop-dot" style={{ background: activeId === v.id ? 'var(--accent)' : 'var(--rule-strong)' }} />
                <span className="tb-pop-item-text">
                  <span className="tb-pop-item-title">{v.label}</span>
                  <span className="tb-pop-item-meta">{v.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const GrantsList = ({ navigate, search, route }) => {
  const grants = useStore((s) => s.grants);
  const D = { ...DATA, grants };
  const toast = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [agency, setAgency] = React.useState(route?.agency || 'ALL');
  React.useEffect(() => { if (route?.agency) setAgency(route.agency); }, [route?.agency]);
  const [sort, setSort] = React.useState('utilization');
  // table | cards — phones open in the card view (a 7-column ledger is not a
  // mobile UI); desktop keeps the ledger. The toggle still works either way.
  const [view, setView] = React.useState(() =>
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 720px)').matches) ? 'cards' : 'table'
  );
  const [risk, setRisk] = React.useState(false);     // Saved view: at-risk
  const [closing, setClosing] = React.useState(false); // Saved view: closing this FY

  // Which saved view (if any) the current state matches — drives the active dot.
  const activeView = closing ? 'closing-fy' : risk ? 'at-risk' : statusFilter === 'DRAFT' ? 'drafts' : null;
  const applyView = { setStatusFilter, setAgency, setSort, setRisk, setClosing };

  const filtered = D.grants
    .filter(g => statusFilter === 'ALL' || g.status === statusFilter)
    .filter(g => agency === 'ALL' || g.agencyShort === agency)
    .filter(g => !risk || g.pct >= 0.8)
    .filter(g => !closing || new Date(g.end) <= FY_END)
    .filter(g => !search || (g.title + g.number + g.agency + g.pi.name).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'utilization') return b.pct - a.pct;
      if (sort === 'budget') return b.budget - a.budget;
      if (sort === 'newest') return new Date(b.start) - new Date(a.start);
      return a.title.localeCompare(b.title);
    });

  const totalBudget = filtered.reduce((s, g) => s + g.budget, 0);
  const totalSpent = filtered.reduce((s, g) => s + g.spent, 0);
  const agencies = ['ALL', ...new Set(D.grants.map(g => g.agencyShort))];

  return (
    <div>
      {showForm && (
        <CreateGrantForm
          onClose={() => setShowForm(false)}
          onCreated={(msg) => toast(msg)}
        />
      )}
      <div className="page-head">
        <div>
          <div className="eyebrow">Portfolio · {filtered.length} of {D.grants.length} grants</div>
          <h1>Grants.</h1>
          <p className="sub">
            All federal awards under the institutional master agreement. Filter by sponsor, status, or fiscal posture.
            Click a grant to enter its lifecycle workspace.
          </p>
        </div>
        <div className="ph-actions">
          <SavedViews apply={applyView} activeId={activeView} />
          <button className="btn accent" onClick={() => setShowForm(true)}><Icon name="plus" size={12} /> New Grant</button>
        </div>
      </div>

      {/* Subtotal strip */}
      <div className="bento" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="metric" style={{ minHeight: 86 }}>
          <div className="lbl">Showing</div>
          <div className="val" style={{ fontSize: 32 }}>{filtered.length}<span className="unit">grants</span></div>
        </div>
        <div className="metric" style={{ minHeight: 86 }}>
          <div className="lbl">Combined Award</div>
          <div className="val" style={{ fontSize: 32 }}>${(totalBudget / 1_000_000).toFixed(2)}<span className="unit">M</span></div>
        </div>
        <div className="metric" style={{ minHeight: 86 }}>
          <div className="lbl">Combined Spent</div>
          <div className="val" style={{ fontSize: 32 }}>${(totalSpent / 1_000_000).toFixed(2)}<span className="unit">M · {fmt.pct(totalSpent/totalBudget,0)}</span></div>
        </div>
        <div className="metric" style={{ minHeight: 86 }}>
          <div className="lbl">Median Utilization</div>
          <div className="val" style={{ fontSize: 32 }}>
            {(filtered.slice().sort((a,b)=>a.pct-b.pct)[Math.floor(filtered.length/2)]?.pct * 100 || 0).toFixed(0)}<span className="unit">%</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="pill-group">
          {['ALL', 'ACTIVE', 'DRAFT', 'CLOSED'].map(s => (
            <button key={s} className={statusFilter === s ? 'on' : ''} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
        <span className="kicker">Sponsor</span>
        <select
          className="mono"
          value={agency}
          onChange={(e) => setAgency(e.target.value)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 2,
            padding: '4px 8px', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-2)', height: 28,
          }}>
          {agencies.map(a => <option key={a}>{a}</option>)}
        </select>
        <span className="kicker">Sort</span>
        <select
          className="mono"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 2,
            padding: '4px 8px', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--ink-2)', height: 28,
          }}>
          <option value="utilization">Utilization</option>
          <option value="budget">Award size</option>
          <option value="newest">Start date</option>
          <option value="title">Title</option>
        </select>
        <div style={{ marginLeft: 'auto' }} className="pill-group">
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Ledger</button>
          <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>Cards</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="kicker">No results</div>
          <p className="serif">{search ? `No grants match “${search}”` : 'No grants match this view'}</p>
          <p className="muted">Try a different sponsor, status, or saved view — or clear the filters to see all grants.</p>
        </div>
      ) : view === 'table' ? (
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th style={{ width: 24 }}>#</th>
                <th>Grant</th>
                <th>Sponsor</th>
                <th>PI</th>
                <th>Period</th>
                <th>Year</th>
                <th>Status</th>
                <th style={{ minWidth: 180 }}>Utilization</th>
                <th className="r">Award</th>
                <th className="r">Spent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr className="row-h" key={g.id} onClick={() => navigate({ name: 'grant', id: g.id, grant: g })}>
                  <td className="mono" style={{ color: 'var(--ink-4)', fontSize: 11 }}>{String(i+1).padStart(2, '0')}</td>
                  <td className="ttl" style={{ minWidth: 280, maxWidth: 360 }}>
                    {g.title}
                    <span className="gn">{g.number}</span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{g.agencyShort}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar-sm">{g.pi.initials}</div>
                      <span style={{ fontSize: 12.5 }}>{g.pi.name.replace(/^Dr\. /, '')}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {new Date(g.start).getFullYear()}–{new Date(g.end).getFullYear()}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>Y{g.year}/{g.totalYears}</td>
                  <td><Status s={g.status} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Utilization spent={g.spent} encumbered={g.spent * 0.04} total={g.budget} />
                      <span className="mono" style={{ fontSize: 11, color: g.pct >= 0.8 ? utilizationColor(g.pct) : 'var(--ink-2)', minWidth: 36 }}>{fmt.pct(g.pct, 0)}</span>
                    </div>
                  </td>
                  <td className="num r">{fmt.money(g.budget, { compact: true })}</td>
                  <td className="num r" style={{ color: 'var(--ink-2)' }}>{fmt.money(g.spent, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 0, border: '1px solid var(--rule)', borderRadius: 2, background: 'var(--surface)' }}>
          {filtered.map((g, i) => (
            <div
              key={g.id}
              onClick={() => navigate({ name: 'grant', id: g.id, grant: g })}
              style={{ padding: 20, borderRight: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', cursor: 'pointer' }}
              onMouseEnter={(e)=>{ e.currentTarget.style.background = 'var(--paper-tint)'; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>{g.agencyShort} · {g.number}</span>
                <Status s={g.status} />
              </div>
              <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.01em' }}>{g.title}</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                {g.pi.name} · Year {g.year} of {g.totalYears}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 8 }}>
                <div className="num-block">
                  <span className="lbl">Award</span>
                  <span className="val">{fmt.money(g.budget, { compact: true })}</span>
                </div>
                <div className="num-block">
                  <span className="lbl">Spent</span>
                  <span className="val">{fmt.money(g.spent, { compact: true })}</span>
                </div>
                <div className="num-block" style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                  <span className="lbl">Utilization</span>
                  <span className="val" style={{ color: g.pct >= 0.8 ? utilizationColor(g.pct) : 'var(--ink)' }}>{fmt.pct(g.pct, 0)}</span>
                </div>
              </div>
              <Utilization spent={g.spent} encumbered={g.spent * 0.04} total={g.budget} />
            </div>
          ))}
        </div>
      )}

      <div className="colophon">
        <span>{filtered.length} grants · sorted by {sort}</span>
        <span>{TODAY_FQ_REVERSED} · Demo dataset</span>
      </div>
    </div>
  );
};
