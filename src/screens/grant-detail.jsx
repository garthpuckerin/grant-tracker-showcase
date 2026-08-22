// Grant detail page — anchored on grant id '1' which has full data
import React from 'react';
import { DATA, buildCompliance } from '../data.js';
import { fmt, Icon, Status, Donut, Utilization } from '../atoms.jsx';
import { useStore, useCurrentUser, computeCategoryDeltas, decideReallocation } from '../store.js';
import {
  canRequestReallocation,
  canDecideReallocation,
  requestDeniedReason,
  decideDeniedReason,
  ROLE_LABEL,
} from '../rbac.js';
import { BudgetLineItemForm, ReallocationRequestForm } from '../forms.jsx';
import { DocumentDrawer, UploadDocumentForm, downloadDocument } from '../document-drawer.jsx';
import { useToast, MockButton } from '../toast.jsx';
import { shiftIso, fmtMedium, daysFromToday } from '../dates.js';

// Stable empty array so the store selector keeps a constant snapshot identity.
const EMPTY_ITEMS = [];

const GRANT_SUMMARIES = {
  '1':  'A five-year cooperative agreement integrating large-language-model assistants into undergraduate STEM curricula at three partner institutions, with embedded compliance, fairness, and learning-outcomes evaluation.',
  '2':  'A three-year Department of Energy initiative advancing grid-scale renewable energy storage chemistries, with university–national-lab partnership and quarterly DOE programmatic reviews.',
  '3':  'A three-year NIH-funded program developing cybersecurity controls and threat-modeling frameworks for clinical informatics systems in academic medical centers.',
  '4':  'A three-year EPA cooperative project modeling climate-driven hazard exposure for two mid-Atlantic municipalities, producing planning toolkits for resilience officers.',
  '5':  'A two-year FDA-funded study applying machine-learning models to early-stage compound screening, with parallel publication and dataset release deliverables.',
  '6':  'A two-year USDA Rural Utilities Service study characterizing rural broadband deployment economics and middle-mile infrastructure gaps across three states.',
  '7':  'A four-year NSF proposal advancing quantum-algorithmic approaches to portfolio optimization and risk modeling — currently in pre-award narrative and biosketch development.',
  '8':  'A two-year DOE initiative on grid-scale battery storage integration with renewable generation, including techno-economic modeling and field demonstration.',
  '9':  'A three-year NOAA project deploying sensor networks and machine-vision species identification across coastal monitoring sites.',
  '10': 'A three-year NASA materials-science cooperative agreement on radiation-tolerant composites for long-duration crewed missions to lunar and Martian environments.',
  '11': 'A two-year Department of Education research project examining algorithmic fairness, transparency, and student privacy in K-12 adaptive learning platforms.',
  '12': 'A two-year HHS-funded digital health platform pilot supporting remote chronic-disease management across three federally qualified health centers.',
  '13': 'A three-year DOT cooperative research effort modeling autonomous-vehicle deployment scenarios and connected-infrastructure investment for two mid-size U.S. cities.',
  '14': 'A two-year NIST research program advancing standards for closed-loop manufacturing automation, with industry-partner test beds and reference implementations.',
  '15': 'A two-year NOAA pollution-monitoring network deploying low-cost sensor arrays across U.S. coastal waters, with open-data publication on a quarterly cadence.',
};

const grantSummary = (g) => GRANT_SUMMARIES[g.id]
  || `A ${g.totalYears}-year award from ${g.agency} under master grant ${g.number}. Principal investigator ${g.pi.name} leads the program, currently in year ${g.year} of ${g.totalYears}.`;


export const GrantDetail = ({ navigate, route }) => {
  const D = DATA;
  const grant = D.grants.find(g => g.id === route.id) || D.grants[0];
  // Deep links (e.g. an insight's "Take action") may name the tab to open.
  const [tab, setTab] = React.useState(route.tab || 'overview');
  React.useEffect(() => { if (route.tab) setTab(route.tab); }, [route.tab, route.id]);
  const [selectedYear, setSelectedYear] = React.useState(grant.year);

  // Line items added through the form (per-grant), merged onto the base set.
  // Select the per-grant map entry directly (stable identity) and fall back to a
  // module-level constant empty array — returning a fresh `[]` from the selector
  // would break useSyncExternalStore's snapshot caching (infinite loop).
  const addedLineItems = useStore((s) => s.lineItems[grant.id]) || EMPTY_ITEMS;
  // Approved-and-applied reallocations shift category budgets live; subscribe so
  // the ledger re-derives the moment Finance approves a transfer.
  const reallocations = useStore((s) => s.reallocations);
  // Tasks and documents from the store so completions/uploads update this
  // grant's tabs immediately.
  const liveTasks = useStore((s) => s.tasks);
  const liveDocs = useStore((s) => s.documents);

  // We'll synthesize budget data if not the rich grant
  const hasFullData = grant.id === '1';
  const baseLineItems = hasFullData ? grant.lineItems : [
    { cat: 'PERSONNEL',  desc: 'Faculty + staff', budgeted: grant.budget * 0.45, spent: grant.spent * 0.45, encumbered: grant.budget * 0.045 },
    { cat: 'EQUIPMENT',  desc: 'Capital equipment',           budgeted: grant.budget * 0.20, spent: grant.spent * 0.20, encumbered: grant.budget * 0.02 },
    { cat: 'SUPPLIES',   desc: 'Materials & consumables',     budgeted: grant.budget * 0.15, spent: grant.spent * 0.15, encumbered: grant.budget * 0.015 },
    { cat: 'TRAVEL',     desc: 'Conferences & site visits',   budgeted: grant.budget * 0.10, spent: grant.spent * 0.10, encumbered: grant.budget * 0.01 },
    { cat: 'INDIRECT',   desc: 'F&A',                          budgeted: grant.budget * 0.10, spent: grant.spent * 0.10, encumbered: grant.budget * 0.01 },
  ];
  const deltas = computeCategoryDeltas(reallocations, grant.id);
  const lineItems = [...baseLineItems, ...addedLineItems].map((l) =>
    deltas[l.cat] ? { ...l, budgeted: l.budgeted + deltas[l.cat] } : l,
  );

  // FY label per year derives from the grant's (shifted) start year + offset,
  // so the synthesized year ledger stays coherent with the period of performance.
  const startFyTwoDigit = String(new Date(grant.start.slice(0, 10) + 'T00:00:00').getFullYear()).slice(-2);
  const years = hasFullData ? grant.years : Array.from({ length: grant.totalYears }, (_, i) => ({
    n: i + 1,
    fy: `FY${String(Number(startFyTwoDigit) + i).padStart(2, '0')}`,
    number: `${grant.number}-Y${i + 1}`,
    award: grant.budget / grant.totalYears,
    spent: i + 1 <= grant.year ? (grant.spent / grant.year) : 0,
  }));

  const grantTasks = liveTasks.filter(t => t.grantId === grant.id);
  const grantDocs = liveDocs.filter(d => d.grantId === grant.id);

  return (
    <div>
      {/* Back nav */}
      <button className="btn-link" style={{ marginBottom: 12 }} onClick={() => navigate({ name: 'grants' })}>
        ← All grants
      </button>

      {/* Editorial masthead */}
      <div style={{ borderBottom: '1px solid var(--ink)', paddingBottom: 24, marginBottom: 28 }}>
        <div className="gd-masthead-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 16 }}>
          <div className="flex items-center gap-12">
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>{grant.agency.toUpperCase()}</span>
            <span style={{ width: 1, height: 12, background: 'var(--rule-strong)' }}></span>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--ink)' }}>{grant.number}</span>
            <span style={{ width: 1, height: 12, background: 'var(--rule-strong)' }}></span>
            <Status s={grant.status} />
          </div>
          <div className="ph-actions">
            <button className="btn ghost" onClick={() => navigate({ name: 'sf425detail', gi: DATA.grants.indexOf(grant), period: 'FY25 ANNUAL', type: 'Annual', status: 'IN_PROGRESS', due: shiftIso('2026-06-15') })}><Icon name="download" size={12} /> SF-425</button>
            <button className="btn ghost" onClick={() => navigate({ name: 'reports' })}><Icon name="file" size={12} /> Reports</button>
            <MockButton className="btn" icon="dots" aria-label="More actions" title="More actions" message="More actions are mocked in this demo." />
          </div>
        </div>

        <h1 className="serif" style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 400, letterSpacing: '-0.018em', margin: '0 0 22px 0', maxWidth: '22ch', minHeight: '2.4em' }}>
          {grant.title}
        </h1>

        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, maxWidth: '64ch', color: 'var(--ink-3)', margin: 0 }}>
          {grantSummary(grant)}
        </p>

        {/* Meta strip */}
        <div className="g-dense" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, marginTop: 28, border: '1px solid var(--rule)', background: 'var(--surface)' }}>
          {[
            { lbl: 'Principal Investigator', val: grant.pi.name, mono: false },
            { lbl: 'Period of Performance',  val: `${fmt.shortDate(grant.start.slice(0,10))} – ${fmt.shortDate(grant.end.slice(0,10))}`, mono: true },
            { lbl: 'Current Year',           val: `${grant.year} of ${grant.totalYears}`, mono: true },
            { lbl: 'Total Award',            val: fmt.money(grant.budget, { compact: true }), mono: true },
            { lbl: 'Expended',               val: `${fmt.money(grant.spent, { compact: true })} · ${fmt.pct(grant.pct, 0)}`, mono: true },
            { lbl: 'Days Remaining',         val: `${fmt.daysUntil(grant.end.slice(0,10))} d`, mono: true },
          ].map((m, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRight: i < 5 ? '1px solid var(--rule)' : 'none' }}>
              <div className="kicker" style={{ marginBottom: 6 }}>{m.lbl}</div>
              <div className={m.mono ? 'mono' : ''} style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'budget', 'documents', 'tasks', 'compliance', 'history'].map(t => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab grant={grant} years={years} lineItems={lineItems} grantTasks={grantTasks} navigate={navigate} setTab={setTab} setSelectedYear={setSelectedYear} />}
      {tab === 'budget'   && <BudgetTab   grant={grant} years={years} lineItems={lineItems} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />}
      {tab === 'documents'&& <DocumentsTab docs={grantDocs} grantId={grant.id} navigate={navigate} />}
      {tab === 'tasks'    && <TasksTab tasks={grantTasks} />}
      {tab === 'compliance' && <ComplianceTab grant={grant} />}
      {tab === 'history'  && <HistoryTab grant={grant} />}
    </div>
  );
};

const OverviewTab = ({ grant, years, lineItems, grantTasks, navigate, setTab, setSelectedYear }) => {
  const budget = lineItems.reduce((s, l) => s + l.budgeted, 0);
  const spent = lineItems.reduce((s, l) => s + l.spent, 0);
  const encumbered = lineItems.reduce((s, l) => s + l.encumbered, 0);
  const yearAward = years.find(y => y.n === grant.year)?.award || 0;
  const yearSpent = years.find(y => y.n === grant.year)?.spent || 0;

  // Burn-rate metrics derived from the current grant-year window (12-month
  // fiscal year). Months elapsed/remaining come from the period of performance,
  // so the figures track whatever grant is open and the grant-1 reconcile —
  // not the old hard-anchored "$17.5K / 7 / 96%" literals.
  const yearStart = new Date(grant.start.slice(0, 10) + 'T00:00:00');
  yearStart.setFullYear(yearStart.getFullYear() + (grant.year - 1));
  const now = new Date();
  const rawElapsed = (now.getFullYear() - yearStart.getFullYear()) * 12 + (now.getMonth() - yearStart.getMonth());
  const monthsElapsed = Math.min(12, Math.max(1, rawElapsed + 1)); // 1..12
  const monthsLeft = Math.max(0, 12 - monthsElapsed);
  const burnPerMo = yearSpent / monthsElapsed;
  const forecastFrac = yearAward > 0 ? Math.min(1.5, (burnPerMo * 12) / yearAward) : 0;

  return (
    <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
      <div className="flex-col gap-24">
        {/* Year timeline */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Multi-Year Timeline</div>
            <span className="kicker">{grant.totalYears}-year award</span>
          </div>
          <div className="card-body">
            <div className="gd-years" style={{ display: 'grid', gridTemplateColumns: `repeat(${grant.totalYears}, 1fr)`, gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)' }}>
              {years.map(y => {
                const isCurrent = y.n === grant.year;
                const isPast = y.n < grant.year;
                const isFuture = y.n > grant.year;
                return (
                  <div
                    key={y.n}
                    onClick={() => { setSelectedYear(y.n); setTab('budget'); }}
                    style={{
                      padding: 16,
                      background: isCurrent ? 'var(--ink)' : 'var(--surface)',
                      color: isCurrent ? 'var(--paper)' : 'var(--ink)',
                      cursor: 'pointer',
                      position: 'relative',
                    }}>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', opacity: 0.7, marginBottom: 6 }}>
                      {isPast ? 'CLOSED' : isCurrent ? 'CURRENT' : 'PLANNED'} · {y.fy}
                    </div>
                    <div className="serif" style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>Y{y.n}</div>
                    <div className="num" style={{ fontSize: 13, marginBottom: 4, opacity: 0.95 }}>{fmt.money(y.award, { compact: true })}</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.6 }}>
                      {y.spent ? `${fmt.pct(y.spent / y.award, 0)} expended` : 'pending'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current year budget */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Year {grant.year} · {years.find(y => y.n === grant.year)?.fy}</div>
              <div className="card-title">Current-Year Budget</div>
            </div>
            <button className="btn-link" onClick={() => setTab('budget')}>Detail →</button>
          </div>
          <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th className="r">Budgeted</th>
                <th className="r">Spent</th>
                <th className="r">Encum.</th>
                <th className="r">Balance</th>
                <th style={{ width: 140 }}>Util.</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((l, li) => {
                const bal = l.budgeted - l.spent - l.encumbered;
                const pct = l.spent / l.budgeted;
                return (
                  <tr key={`${l.cat}-${li}`}>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{l.cat}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>{l.desc}</td>
                    <td className="num r">{fmt.money(l.budgeted)}</td>
                    <td className="num r">{fmt.money(l.spent)}</td>
                    <td className="num r muted">{fmt.money(l.encumbered)}</td>
                    <td className="num r" style={{ color: bal < 0 ? 'var(--alert)' : 'var(--ink)' }}>{fmt.money(bal)}</td>
                    <td>
                      <div className="track"><div className="fill" style={{ width: (pct * 100) + '%', background: pct > 0.9 ? 'var(--alert)' : 'var(--ink)' }}></div></div>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '1px solid var(--ink)' }}>
                <td className="mono" style={{ fontSize: 11, fontWeight: 600 }}>TOTAL</td>
                <td></td>
                <td className="num r" style={{ fontWeight: 600 }}>{fmt.money(budget)}</td>
                <td className="num r" style={{ fontWeight: 600 }}>{fmt.money(spent)}</td>
                <td className="num r muted">{fmt.money(encumbered)}</td>
                <td className="num r" style={{ fontWeight: 600 }}>{fmt.money(budget - spent - encumbered)}</td>
                <td className="mono" style={{ fontSize: 11, textAlign: 'center' }}>{fmt.pct(spent/budget, 1)}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* AI synthesis */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', marginRight: 6, verticalAlign: 'middle' }}></span>
                Compliance + Budget + Document agents
              </div>
              <div className="card-title">Grant Analysis</div>
            </div>
            <span className="kicker">Updated 12m ago</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="list">
              <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 60 }} className="kicker">DEADLINE</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 4, fontWeight: 500 }}>Q1 progress report due in 5 days</div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>Programmatic narrative is 62% drafted. Budget variance section pending PI sign-off. <button className="btn-link" style={{ padding: 0, textDecoration: 'underline', textDecorationColor: 'var(--rule-strong)' }} onClick={() => setTab('tasks')}>Open in workspace →</button></div>
                </div>
              </div>
              <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 60, color: 'var(--indigo)' }} className="kicker">POLICY</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 4, fontWeight: 500 }}>2 CFR 200 §200.430 — time & effort certification overdue</div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>PI and one co-PI certifications for FY25 H1 have not been submitted. Required for federal audit readiness.</div>
                </div>
              </div>
              <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 60, color: 'var(--fund)' }} className="kicker">BUDGET</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 4, fontWeight: 500 }}>Personnel encumbrances pacing on plan</div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>Burn rate suggests Year 2 will close at 96% of award. No reallocation needed at this time.</div>
                </div>
              </div>
              <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
                <div style={{ minWidth: 60 }} className="kicker">DOCUMENT</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 4, fontWeight: 500 }}>Subaward — State A&M signed Feb 19</div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>Quarterly invoicing schedule synced; next subrecipient invoice expected May 30.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="flex-col gap-24">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Burn Rate</div>
            <span className="kicker">YR{grant.year}</span>
          </div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <Donut pct={yearSpent / yearAward} size={170} label={`${fmt.money(yearSpent, { compact: true })} of ${fmt.money(yearAward, { compact: true })}`} />
            <div className="divider" style={{ margin: '20px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
              <div className="num-block" style={{ alignItems: 'center', textAlign: 'center' }}>
                <span className="lbl">Burn / Mo</span>
                <span className="val">{fmt.money(burnPerMo, { compact: true })}</span>
              </div>
              <div className="num-block" style={{ alignItems: 'center', textAlign: 'center' }}>
                <span className="lbl">Months Left</span>
                <span className="val">{monthsLeft}</span>
              </div>
              <div className="num-block" style={{ alignItems: 'center', textAlign: 'center' }}>
                <span className="lbl">Forecast</span>
                <span className="val">{fmt.pct(forecastFrac, 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Team</div>
            <span className="kicker">{4}</span>
          </div>
          <div className="list">
            {[
              { ...grant.pi, role: 'Principal Investigator', effort: '25% effort' },
              { name: 'Dr. Aiden Park',    initials: 'AP', role: 'Co-Investigator',  effort: '15% effort' },
              { name: 'Maya Velasquez',    initials: 'MV', role: 'Project Coordinator', effort: '50% effort' },
              { name: 'Lisa Thompson',     initials: 'LT', role: 'Finance Liaison',  effort: 'Allocated' },
            ].map((m, i) => (
              <div className="row" key={i} style={{ padding: '12px 18px' }}>
                <div className="avatar-sm">{m.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{m.role.toUpperCase()}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.effort}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Upcoming</div>
            <button className="btn-link" onClick={() => setTab('tasks')}>All →</button>
          </div>
          <div className="list">
            {grantTasks.filter(t => t.status !== 'COMPLETE').slice(0, 4).map(t => (
              <div className="row" key={t.id} style={{ padding: '12px 18px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{t.title}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{t.priority} · {fmt.shortDate(t.due)}</div>
                </div>
                <Status s={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Status badge for reallocation records (Approved / Pending / Denied).
const REALLOC_BADGE = {
  APPROVED: { cls: 'active', label: 'Approved' },
  PENDING: { cls: 'draft', label: 'Pending' },
  DENIED: { cls: 'alert', label: 'Denied' },
};
const userName = (id) => DATA.users.find((u) => u.id === id)?.name || '—';

const BudgetTab = ({ grant, years, lineItems, selectedYear, setSelectedYear }) => {
  const toast = useToast();
  const user = useCurrentUser();
  const reallocations = useStore((s) => s.reallocations);
  const [showForm, setShowForm] = React.useState(false);
  const [showRealloc, setShowRealloc] = React.useState(false);

  const canRequest = canRequestReallocation(user, grant);
  const requestBlocked = requestDeniedReason(user, grant);

  const grantReallocs = reallocations
    .filter((r) => r.grantId === grant.id)
    .slice()
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));

  const approve = (r) => {
    decideReallocation(r.id, 'APPROVED', user.id);
    toast(`Reallocation approved — ${fmt.money(r.amount)} moved ${r.fromCat} → ${r.toCat}. Budget updated.`);
  };
  const deny = (r) => {
    decideReallocation(r.id, 'DENIED', user.id);
    toast('Reallocation denied.');
  };

  // Real action on mock data (§4 ladder tier 1): genuinely build and download a
  // CSV of the current year's line-item ledger.
  const exportCsv = () => {
    const header = ['Category', 'Description', 'Budgeted', 'Spent', 'Encumbered', 'Balance'];
    const rows = lineItems.map((l) => [l.cat, l.desc, l.budgeted, l.spent, l.encumbered, l.budgeted - l.spent - l.encumbered]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grant.number}-Y${selectedYear}-budget.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Budget CSV exported.');
  };

  return (
    <div>
      {showForm && (
        <BudgetLineItemForm
          grantId={grant.id}
          onClose={() => setShowForm(false)}
          onCreated={(msg) => toast(msg)}
        />
      )}
      {showRealloc && (
        <ReallocationRequestForm
          grantId={grant.id}
          lineItems={lineItems}
          currentUser={user}
          onClose={() => setShowRealloc(false)}
          onCreated={(msg) => toast(msg)}
        />
      )}
      {/* Year picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span className="kicker">Fiscal Year</span>
        <div className="pill-group">
          {years.map(y => (
            <button key={y.n} className={selectedYear === y.n ? 'on' : ''} onClick={() => setSelectedYear(y.n)}>{y.fy}</button>
          ))}
        </div>
        <button
          className="btn-link"
          style={{ marginLeft: 'auto', opacity: canRequest ? 1 : 0.45, cursor: canRequest ? 'pointer' : 'not-allowed' }}
          onClick={() => canRequest ? setShowRealloc(true) : toast(requestBlocked)}
          disabled={!canRequest}
          title={canRequest ? 'Request a budget reallocation' : requestBlocked}
        >
          {canRequest ? 'Reallocate funds →' : 'Reallocate funds 🔒'}
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Line-item ledger · {years.find(y => y.n === selectedYear)?.fy}</div>
            <div className="card-title">Budget · Year {selectedYear}</div>
          </div>
          <div className="ph-actions">
            <button className="btn ghost" onClick={exportCsv}><Icon name="download" size={12} /> Export CSV</button>
            <button className="btn accent" onClick={() => setShowForm(true)}><Icon name="plus" size={12} /> Add line item</button>
          </div>
        </div>
        <div className="table-scroll">
        <table className="ledger">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th className="r">Budgeted</th>
              <th className="r">Spent YTD</th>
              <th className="r">Encumbered</th>
              <th className="r">Balance</th>
              <th>Utilization</th>
              <th style={{ width: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((l, li) => {
              const bal = l.budgeted - l.spent - l.encumbered;
              const pct = l.spent / l.budgeted;
              return (
                <tr key={`${l.cat}-${li}`} className="row-h">
                  <td>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, letterSpacing: '0.08em' }}>{l.cat}</div>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5, maxWidth: 280 }}>{l.desc}</td>
                  <td className="num r">{fmt.money(l.budgeted)}</td>
                  <td className="num r">{fmt.money(l.spent)}</td>
                  <td className="num r muted">{fmt.money(l.encumbered)}</td>
                  <td className="num r" style={{ color: bal < 0 ? 'var(--alert)' : 'var(--ink)' }}>{fmt.money(bal)}</td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Utilization spent={l.spent} encumbered={l.encumbered} total={l.budgeted} />
                      <span className="mono" style={{ fontSize: 11, color: pct > 0.9 ? 'var(--alert)' : 'var(--ink-2)', minWidth: 32 }}>{fmt.pct(pct, 0)}</span>
                    </div>
                  </td>
                  <td><Icon name="dots" size={14} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--ink)' }}>
              <td colSpan="2" style={{ padding: '14px 14px', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em' }}>TOTAL · YEAR {selectedYear}</td>
              <td className="num r" style={{ fontWeight: 600, padding: '14px 14px' }}>{fmt.money(lineItems.reduce((s, l) => s + l.budgeted, 0))}</td>
              <td className="num r" style={{ fontWeight: 600, padding: '14px 14px' }}>{fmt.money(lineItems.reduce((s, l) => s + l.spent, 0))}</td>
              <td className="num r muted" style={{ padding: '14px 14px' }}>{fmt.money(lineItems.reduce((s, l) => s + l.encumbered, 0))}</td>
              <td className="num r" style={{ fontWeight: 600, padding: '14px 14px' }}>{fmt.money(lineItems.reduce((s, l) => s + (l.budgeted - l.spent - l.encumbered), 0))}</td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      {/* Variance + reallocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Variance Analysis</div>
            <span className="kicker">vs plan</span>
          </div>
          <div className="card-body">
            <div className="lede" style={{ fontSize: 16, marginBottom: 16 }}>
              Year {selectedYear} is pacing within <span style={{ color: 'var(--fund)' }}>2.1% of planned cadence</span> — encumbered + spent represents 38.5% of the annual award against an expected 42% at this midpoint.
            </div>
            <div className="flex-col gap-12">
              {lineItems.map((l, li) => {
                const planPct = 0.42;
                const actualPct = l.spent / l.budgeted;
                const variance = actualPct - planPct;
                return (
                  <div key={`${l.cat}-${li}`} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px', gap: 12, alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em' }}>{l.cat}</span>
                    <div className="track"><div className="fill" style={{ width: (actualPct * 100) + '%' }}></div></div>
                    <span className="num" style={{ fontSize: 11, textAlign: 'right', color: variance > 0 ? 'var(--alert)' : 'var(--fund)' }}>
                      {variance > 0 ? '+' : ''}{(variance * 100).toFixed(1)}pp
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Reallocation Approvals</div>
            <span className="kicker">{grantReallocs.filter((r) => r.status === 'PENDING').length} pending · acting as {ROLE_LABEL[user.role]}</span>
          </div>
          <div className="list">
            {grantReallocs.length === 0 && (
              <div className="row" style={{ padding: '18px' }}>
                <span className="muted" style={{ fontSize: 13 }}>No reallocations for this award yet.</span>
              </div>
            )}
            {grantReallocs.map((r) => {
              const badge = REALLOC_BADGE[r.status] || REALLOC_BADGE.PENDING;
              const canDecide = canDecideReallocation(user, r);
              const decideBlocked = decideDeniedReason(user, r);
              return (
                <div key={r.id} className="row" style={{ padding: '14px 18px', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmt.money(r.amount)}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{r.fromCat} → {r.toCat}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{r.reason}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                      {r.status === 'PENDING'
                        ? `Requested by ${userName(r.requestedBy)} · ${fmt.shortDate(r.requestedAt.slice(0, 10))}`
                        : `${badge.label} by ${userName(r.decidedBy)}${r.decidedAt ? ` · ${fmt.shortDate(r.decidedAt.slice(0, 10))}` : ''}`}
                    </div>

                    {r.status === 'PENDING' && (
                      canDecide ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="btn accent" style={{ height: 28, fontSize: 11 }} onClick={() => approve(r)}>Approve</button>
                          <button className="btn ghost" style={{ height: 28, fontSize: 11 }} onClick={() => deny(r)}>Deny</button>
                        </div>
                      ) : (
                        <div className="flag alert" style={{ marginTop: 10 }}>
                          <div className="lbl">🔒 Permission required</div>
                          <div style={{ fontSize: 12, lineHeight: 1.5 }}>{decideBlocked}</div>
                        </div>
                      )
                    )}
                  </div>
                  <span className={`status ${badge.cls}`}><span className="dot"></span>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentsTab = ({ docs, grantId, navigate }) => {
  const toast = useToast();
  const [selectedId, setSelectedId] = React.useState(null);
  const [showUpload, setShowUpload] = React.useState(false);
  const selected = docs.find((d) => d.id === selectedId) || null;
  return (
  <div className="card">
    <DocumentDrawer doc={selected} onClose={() => setSelectedId(null)} navigate={navigate} />
    {showUpload && <UploadDocumentForm grantId={grantId} onClose={() => setShowUpload(false)} onCreated={(m) => toast(m)} />}
    <div className="card-head">
      <div className="card-title">Documents</div>
      <button className="btn accent" onClick={() => setShowUpload(true)}><Icon name="plus" size={12} /> Upload</button>
    </div>
    {docs.length === 0 ? (
      <div className="empty-state" style={{ border: 0 }}>
        <div className="kicker">Nothing filed yet</div>
        <p className="serif">No documents on this award</p>
        <p className="muted">Award notices, budget justifications, and reports attached here appear in the workspace Documents library too.</p>
        <button className="btn accent" onClick={() => setShowUpload(true)}><Icon name="plus" size={12} /> Upload the first document</button>
      </div>
    ) : (
    <div className="table-scroll">
    <table className="ledger">
      <thead>
        <tr>
          <th>Document</th>
          <th>Type</th>
          <th>Uploaded By</th>
          <th>Date</th>
          <th className="r">Size</th>
          <th style={{ width: 80 }}></th>
        </tr>
      </thead>
      <tbody>
        {docs.map(d => (
          <tr className="row-h" key={d.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(d.id)} title="Open document">
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="file" size={14} />
                <span style={{ fontWeight: 500 }}>{d.name}</span>
              </div>
            </td>
            <td className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>{d.type}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-sm">{d.by.initials}</div>
                <span style={{ fontSize: 12.5 }}>{d.by.name}</span>
              </div>
            </td>
            <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{d.date}</td>
            <td className="num r muted">{d.size}</td>
            <td>
              <button className="btn-link" aria-label="Download document" onClick={(e) => { e.stopPropagation(); downloadDocument(d); toast(`Downloaded “${d.name}”.`); }}><Icon name="download" size={12} /></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
    )}
  </div>
  );
};

const TasksTab = ({ tasks }) => (
  <div className="card">
    <div className="card-head">
      <div className="card-title">Tasks</div>
      <MockButton className="btn accent" icon="plus" label="New task" message="Task creation is mocked on this grant view in the demo." />
    </div>
    <div className="table-scroll">
    <table className="ledger">
      <thead>
        <tr>
          <th>Task</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Assignee</th>
          <th className="r">Due</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map(t => (
          <tr key={t.id} className="row-h">
            <td>
              <div style={{ fontWeight: 500 }}>{t.title}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t.desc}</div>
            </td>
            <td><Status s={t.status} /></td>
            <td className="mono" style={{ fontSize: 11, letterSpacing: '0.1em' }}>{t.priority}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-sm">{t.assigned.initials}</div>
                <span style={{ fontSize: 12.5 }}>{t.assigned.name}</span>
              </div>
            </td>
            <td className="mono r" style={{ fontSize: 12 }}>{fmt.shortDate(t.due)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  </div>
);

const ComplianceTab = ({ grant }) => {
  // This grant's SUBSET of the single compliance dataset (data.js). Two notes
  // are stored as tokens so their live dates resolve here, where the date
  // helpers are available. Score / "X of Y passing" / findings all derive from
  // these rows, so the donut, label, and finding flag agree with the table.
  const NOTE_RESOLVERS = {
    'annual-report': `Annual report submitted ${fmtMedium(new Date(shiftIso('2026-01-18') + 'T00:00:00'))}.`,
    'sam-renewal':   `Renewal due in 28 days — ${fmtMedium(daysFromToday(28))}.`,
  };
  // Rules derive from the LIVE findings register, so resolving a finding on the
  // Compliance screen flips this grant's rule to passing here too.
  const liveFindings = useStore((s) => s.findings);
  const baseRules = React.useMemo(() => buildCompliance(liveFindings).grantRules[grant.id] || [], [liveFindings, grant.id]);
  const rules = baseRules.map(r => ({ ...r, note: NOTE_RESOLVERS[r.note] || r.note }));
  const passing = rules.filter(r => r.pass).length;
  const findings = rules.length - passing;
  const scoreFrac = rules.length ? passing / rules.length : 1;
  const failingNames = rules.filter((r) => !r.pass).map((r) => r.name);
  const strengths = rules.filter((r) => r.pass).slice(0, 3).map((r) => r.name);

  // Designed empty state: awards without a grant-level rule set are monitored
  // under the portfolio frameworks only.
  if (rules.length === 0) {
    return (
      <div className="empty-state">
        <div className="kicker">Portfolio-monitored</div>
        <p className="serif">No award-specific rule findings</p>
        <p className="muted">This award is evaluated under the portfolio frameworks (2 CFR 200, sponsor policy, institutional). Award-level findings will appear here when the rule engine raises one.</p>
      </div>
    );
  }

  return (
    <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Composite Score</div>
          <span className="kicker">Updated 12m ago</span>
        </div>
        <div className="card-body" style={{ textAlign: 'center' }}>
          <Donut pct={scoreFrac} size={180} label={`${passing} of ${rules.length} rules passing`} valueText="2 CFR 200 · NSF PAPPG" />
          <div className="divider" style={{ margin: '24px 0' }}></div>
          <div style={{ textAlign: 'left' }} className="flex-col gap-12">
            {findings > 0 ? (
              <div className="flag alert">
                <div className="lbl">{findings} finding{findings !== 1 ? 's' : ''} · Address before audit window</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{failingNames.join(' and ')} {failingNames.length === 1 ? 'is a blocking issue' : 'are blocking issues'} for federal audit readiness.</div>
              </div>
            ) : (
              <div className="flag fund">
                <div className="lbl">Audit-ready</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>All {rules.length} award-level rules are passing.</div>
              </div>
            )}
            {strengths.length > 0 && (
              <div className="flag fund">
                <div className="lbl">Strengths</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{strengths.join(', ')} all clear.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Rule Coverage</div>
          <span className="kicker">{rules.length} active rules</span>
        </div>
        <div className="table-scroll">
        <table className="ledger">
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th>Rule</th>
              <th>Severity</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: r.pass ? 'var(--fund)' : 'var(--alert)' }}></span>
                </td>
                <td>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{r.id}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{r.name}</div>
                </td>
                <td className="mono" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{r.severity}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

const HistoryTab = ({ grant }) => {
  const events = [
    { date: shiftIso('2026-05-15'), who: 'Dr. James Rodriguez', what: 'Submitted budget reallocation request', detail: '$8,000 · Supplies → Equipment' },
    { date: shiftIso('2026-05-12'), who: 'Dr. James Rodriguez', what: 'Uploaded document', detail: 'Q1 Progress Report — DRAFT.docx' },
    { date: shiftIso('2026-04-30'), who: 'AI · Compliance',    what: 'Flagged finding',                       detail: '2 CFR 200.430 — Time & effort overdue' },
    { date: shiftIso('2026-04-22'), who: 'Lisa Thompson',     what: 'Approved expense',                       detail: '$4,820 · GPU compute credits — Personnel' },
    { date: shiftIso('2026-04-15'), who: 'Demo Administrator', what: 'Created year',                          detail: 'FY26 · Year 3 of 5 · pre-award draft' },
    { date: shiftIso('2026-04-09'), who: 'Dr. James Rodriguez', what: 'Closed task',                          detail: 'Subaward kickoff with State A&M' },
    { date: shiftIso('2026-02-19'), who: 'Demo Administrator', what: 'Executed subaward',                     detail: 'State A&M · $84,000 · cooperative' },
    { date: shiftIso('2026-01-08'), who: 'NSF (external)',    what: 'Award notice received',                  detail: 'NSF-EDU-2025 · $250,000' },
  ];
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Audit Trail</div>
        <span className="kicker">Reverse chronological</span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 24px 1fr', gap: 16, padding: '14px 24px', borderBottom: i < events.length - 1 ? '1px solid var(--rule)' : 'none', alignItems: 'baseline' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{e.date}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{e.what}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>by {e.who}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)' }}></span>
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>{e.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
