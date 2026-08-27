// Dashboard / Overview
import React from 'react';
import { DATA, buildCompliance } from '../data.js';
import { fmt, Icon, Donut, Utilization, BarGroup, LineArea } from '../atoms.jsx';
import { insightColor, utilizationColor } from '../viz-color.js';
import { ACTION_LABEL, insightRoute } from '../insight-actions.js';
import { visibleGrants, scopeByGrant, scopeInsights, scopeMonthly } from '../scope.js';
import { MockButton } from '../toast.jsx';
import { useStore, useCurrentUser, dismissInsight } from '../store.js';
import { MonthDrawer } from '../month-drawer.jsx';
import { TODAY_MEDIUM, TODAY_FISCAL, TODAY_FQ_REVERSED } from '../dates.js';

export const Dashboard = ({ navigate }) => {
  // Tasks come from the store so completing one re-derives the overdue copy,
  // the open-task KPI, and the deadline rail here.
  const liveTasks = useStore((s) => s.tasks);
  const liveInsights = useStore((s) => s.insights);
  const liveFindings = useStore((s) => s.findings);
  // RBAC read-scope (2 CFR 200.303): ADMIN/FINANCE oversee the portfolio; a
  // PI's dashboard derives EVERY figure from only the awards they lead. The
  // monthly series scopes through the same per-award allocation the month
  // drawer shows, so scoped bars still cross-foot to the dollar.
  const user = useCurrentUser();
  const D = (() => {
    const grants = visibleGrants(user, DATA.grants);
    const agencyBreakdown = (() => {
      const m = new Map();
      for (const g of grants) {
        const e = m.get(g.agencyShort) || { agency: g.agencyShort, count: 0, budget: 0 };
        m.set(g.agencyShort, { ...e, count: e.count + 1, budget: e.budget + g.budget });
      }
      return [...m.values()].sort((a, b) => b.budget - a.budget);
    })();
    return {
      ...DATA,
      grants,
      agencyBreakdown,
      tasks: scopeByGrant(user, liveTasks),
      insights: scopeInsights(user, liveInsights),
      monthly: scopeMonthly(user, DATA.monthly),
      compliance: buildCompliance(scopeByGrant(user, liveFindings)),
    };
  })();
  const totalBudget = D.grants.reduce((s, g) => s + g.budget, 0);
  const totalSpent = D.grants.reduce((s, g) => s + g.spent, 0);
  const activeCount = D.grants.filter(g => g.status === 'ACTIVE').length;
  const draftCount = D.grants.filter(g => g.status === 'DRAFT').length;
  const utilization = totalSpent / totalBudget;
  const openTasks = D.tasks.filter(t => t.status !== 'COMPLETE').length;
  const overdue = D.tasks.filter(t => t.status !== 'COMPLETE' && fmt.daysUntil(t.due) < 0).length;
  const dueSoon = D.tasks.filter(t => t.status !== 'COMPLETE' && fmt.daysUntil(t.due) <= 14 && fmt.daysUntil(t.due) >= 0).length;

  // Compliance posture — PORTFOLIO composite, reduced from the single compliance
  // dataset (data.js). The Compliance screen reads the same source; grant-detail
  // reads that grant's subset. Score / X-of-Y passing / findings all derive here.
  const cp = D.compliance.portfolio;

  // Monthly Expenditure chart controls — view (bars/line) + trailing range.
  const [chartMode, setChartMode] = React.useState('bars'); // bars | line
  const [range, setRange] = React.useState('12M');          // 3M | 6M | 12M | FY | All
  const [monthSel, setMonthSel] = React.useState(null);      // month drill-down drawer
  const monthlyData = (() => {
    const m = D.monthly;
    switch (range) {
      case '3M':  return m.slice(-3);
      case '6M':  return m.slice(-6);
      // "Fiscal year to date" — drop the oldest trailing month so the range
      // approximates the current FY window (labels are derived from today).
      case 'FY':  return m.slice(1);
      case '12M':
      case 'All':
      default:    return m;
    }
  })();
  const windowTotal = monthlyData.reduce((s, x) => s + x.v, 0);
  const avgMonthly = windowTotal / (monthlyData.length || 1);
  const peakMonth = monthlyData.reduce((a, b) => (b.v > a.v ? b : a), monthlyData[0] || { v: 0 });

  // Watchlist — at-risk grants (highest utilization or near end)
  const watchlist = [...D.grants]
    .filter(g => g.status === 'ACTIVE')
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  // Upcoming deadlines
  const deadlines = [...D.tasks]
    .filter(t => t.status !== 'COMPLETE')
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 5);

  return (
    <div>
      {/* Editorial page head */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Portfolio Overview · {TODAY_FISCAL} · {TODAY_MEDIUM}</div>
          <h1>Good morning, {user.name.replace(/^Dr\.\s*/, '').split(' ')[0]}.</h1>
          <p className="sub">
            <span style={{ color: 'var(--ink)' }}>{activeCount} active grants</span> across {D.agencyBreakdown.length} federal agencies. Year-to-date utilization is on track at {fmt.pct(utilization, 1)} with {overdue ? <span style={{ color: 'var(--alert)' }}>{overdue} overdue task{overdue > 1 ? 's' : ''}</span> : 'no overdue items'} requiring attention.
          </p>
        </div>
        <div className="ph-actions">
          <MockButton className="btn ghost" icon="download" label="Export" message="Portfolio export is mocked in this demo." />
          <button className="btn accent" onClick={() => navigate({ name: 'grants' })}><Icon name="plus" size={12} /> New Grant</button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="bento" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="metric clickable" role="button" tabIndex={0} aria-label="Active awards — open the grants list" onClick={() => navigate({ name: 'grants' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ name: 'grants' }); } }}>
          <div className="lbl">Active Awards</div>
          <div className="val">{activeCount}<span className="unit">of {D.grants.length}</span></div>
          <div className="delta up">{draftCount > 0 ? `▲ ${draftCount} in pre-award` : 'all awards active'}</div>
        </div>
        <div className="metric clickable" role="button" tabIndex={0} aria-label="Total awarded — open the grants list" onClick={() => navigate({ name: 'grants' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ name: 'grants' }); } }}>
          <div className="lbl">Total Awarded</div>
          <div className="val">${(totalBudget / 1_000_000).toFixed(2)}<span className="unit">M obligated</span></div>
          <div className="delta">across {D.agencyBreakdown.length} sponsoring agencies</div>
        </div>
        <div className="metric clickable" role="button" tabIndex={0} aria-label="Lifetime expended — open reports" onClick={() => navigate({ name: 'reports' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ name: 'reports' }); } }}>
          <div className="lbl">Lifetime Expended</div>
          <div className="val">${(totalSpent / 1_000_000).toFixed(2)}<span className="unit">M · {fmt.pct(utilization, 0)}</span></div>
          <div className="delta">Remaining ${((totalBudget - totalSpent) / 1_000_000).toFixed(2)}M</div>
        </div>
        <div className="metric clickable" role="button" tabIndex={0} aria-label="Open tasks — open the task board" onClick={() => navigate({ name: 'tasks' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ name: 'tasks' }); } }}>
          <div className="lbl">Open Tasks</div>
          <div className="val">{openTasks}<span className="unit">items</span></div>
          <div className="delta down">{overdue} overdue · {dueSoon} due ≤14d</div>
        </div>
      </div>

      <MonthDrawer month={monthSel} months={monthlyData} onClose={() => setMonthSel(null)} navigate={navigate} />

      {/* Two column row: Spending chart + AI insights */}
      <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 }}>

        {/* Spending */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {range === '3M' ? 'Trailing 3 months' : range === '6M' ? 'Trailing 6 months' : range === 'FY' ? 'Fiscal year to date' : 'Trailing 12 months'}
              </div>
              <div className="card-title">Monthly Expenditure</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div className="pill-group" role="group" aria-label="Chart type">
                <button className={chartMode === 'bars' ? 'on' : ''} aria-pressed={chartMode === 'bars'} onClick={() => setChartMode('bars')}>Bars</button>
                <button className={chartMode === 'line' ? 'on' : ''} aria-pressed={chartMode === 'line'} onClick={() => setChartMode('line')}>Line</button>
              </div>
              <div className="pill-group" role="group" aria-label="Time range">
                {['3M', '6M', '12M', 'FY', 'All'].map((r) => (
                  <button key={r} className={range === r ? 'on' : ''} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 32, marginBottom: 18 }}>
              <div className="num-block">
                <div className="lbl">Total</div>
                <div className="val serif" data-window-total>{fmt.money(windowTotal, { compact: true })}</div>
              </div>
              <div className="num-block">
                <div className="lbl">Avg / month</div>
                <div className="val serif">${(avgMonthly / 1000).toFixed(0)}K</div>
              </div>
              <div className="num-block">
                <div className="lbl">Peak</div>
                <div className="val serif">${(peakMonth.v / 1000).toFixed(1)}K<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>{peakMonth.m} {peakMonth.yy}</span></div>
              </div>
              <div className="num-block">
                <div className="lbl">Showing</div>
                <div className="val serif">{monthlyData.length}<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>month{monthlyData.length !== 1 ? 's' : ''}</span></div>
              </div>
            </div>
            {/* Chart + a click-target per month: every bar is backed by numbers. */}
            <div style={{ position: 'relative' }}>
              {chartMode === 'bars'
                ? <BarGroup data={monthlyData} height={180} />
                : <LineArea data={monthlyData} height={180} />}
              <div className="chart-hits">
                {monthlyData.map((d, i) => (
                  <button
                    key={`${d.m}-${d.yy}-${i}`}
                    type="button"
                    aria-label={`${d.m} ${d.yy} — ${fmt.money(d.v)}. View the breakdown`}
                    title={`${d.m} ${d.yy} · ${fmt.money(d.v)} — click for the breakdown`}
                    onClick={() => setMonthSel(d)}
                  />
                ))}
              </div>
            </div>
            <div className="chart-note mono">Click a month for the numbers behind it</div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                <span className="live-dot"></span>
                Multi-Agent Synthesis · Live
              </div>
              <div className="card-title">AI Insights</div>
            </div>
            <button className="btn-link" onClick={() => navigate({ name: 'insights' })}>View all →</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="list">
              {D.insights.length === 0 && (
                <div className="row" style={{ padding: '24px 18px' }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    All clear — no open agent findings. New signals surface here as the agents raise them.
                  </span>
                </div>
              )}
              {D.insights.slice(0, 4).map(i => {
                const grant = D.grants.find(g => g.id === i.grantId);
                const open = () => navigate(insightRoute(i, grant));
                return (
                  <div
                    className="row row-h"
                    key={i.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${ACTION_LABEL[i.agent] || 'Open'} — ${i.title}`}
                    style={{ padding: '14px 18px', alignItems: 'flex-start', cursor: 'pointer' }}
                    onClick={open}
                    onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
                  >
                    <div style={{ width: 4, alignSelf: 'stretch', background: insightColor(i), flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="kicker" style={{ marginBottom: 4 }}>{i.agent} · {i.severity}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35, marginBottom: 4 }}>{i.title}</div>
                      <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{i.body}</div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                        <button className="btn-link" style={{ padding: 0, fontSize: 11 }} onClick={(e) => { e.stopPropagation(); open(); }}>
                          {ACTION_LABEL[i.agent] || 'Open'} →
                        </button>
                        <button className="btn-link" style={{ padding: 0, fontSize: 11, color: 'var(--ink-3)' }} onClick={(e) => { e.stopPropagation(); dismissInsight(i.id); }}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist + Deadlines */}
      <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 }}>

        {/* Watchlist */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Highest utilization · Active grants</div>
              <div className="card-title">Watchlist</div>
            </div>
            <button className="btn-link" onClick={() => navigate({ name: 'grants' })}>All grants →</button>
          </div>
          <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th>Grant</th>
                <th>Agency</th>
                <th>Year</th>
                <th>Utilization</th>
                <th className="r">Spent</th>
                <th className="r">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(g => (
                <tr className="row-h" key={g.id} onClick={() => navigate({ name: 'grant', id: g.id, grant: g })}>
                  <td className="ttl">
                    {g.title}
                    <span className="gn">{g.number}</span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{g.agencyShort}</td>
                  <td className="mono" style={{ fontSize: 12 }}>Y{g.year}/{g.totalYears}</td>
                  <td style={{ width: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Utilization spent={g.spent} encumbered={g.spent * 0.04} total={g.budget} />
                      <span className="mono" style={{ fontSize: 11, color: g.pct >= 0.8 ? utilizationColor(g.pct) : 'var(--ink-2)', minWidth: 36 }}>{fmt.pct(g.pct, 0)}</span>
                    </div>
                  </td>
                  <td className="num r">{fmt.money(g.spent, { compact: true })}</td>
                  <td className="num r" style={{ color: 'var(--ink-2)' }}>{fmt.money(g.budget - g.spent, { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Deadlines */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Soonest deadlines</div>
              <div className="card-title">Deadlines</div>
            </div>
            <button className="btn-link" onClick={() => navigate({ name: 'tasks' })}>All →</button>
          </div>
          <div className="list">
            {deadlines.map(t => {
              const days = fmt.daysUntil(t.due);
              const overdue = days < 0;
              const grant = D.grants.find(g => g.id === t.grantId);
              return (
                <div className="row row-h" key={t.id} style={{ padding: '12px 18px', cursor: 'pointer' }} role="button" tabIndex={0} aria-label={`Open tasks — ${t.title}`} onClick={() => navigate({ name: 'tasks' })} onKeyDown={(e) => { if (e.key === 'Enter') navigate({ name: 'tasks' }); }}>
                  <div style={{ minWidth: 52, textAlign: 'center' }}>
                    <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: overdue ? 'var(--alert)' : 'var(--ink)' }}>{Math.abs(days)}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                      {overdue ? 'days late' : 'days'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.title}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                      {grant?.agencyShort} · {fmt.shortDate(t.due)} · {t.priority}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agency breakdown + Category breakdown */}
      <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Portfolio by Sponsor</div>
            <span className="kicker">{D.agencyBreakdown.length} agencies</span>
          </div>
          <div className="card-body">
            <div className="flex-col gap-12">
              {D.agencyBreakdown.map((a, i) => {
                const pct = a.budget / totalBudget;
                return (
                  <div key={i} className="sponsor-row" role="button" tabIndex={0} aria-label={`View ${a.agency} grants`} onClick={() => navigate({ name: 'grants', agency: a.agency })} onKeyDown={(e) => { if (e.key === 'Enter') navigate({ name: 'grants', agency: a.agency }); }} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="mono" style={{ fontSize: 12, letterSpacing: '0.06em' }}>{a.agency}</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.count} grant{a.count > 1 ? 's' : ''}</span>
                        <span className="num" style={{ fontSize: 13 }}>${(a.budget / 1_000_000).toFixed(2)}M</span>
                      </span>
                    </div>
                    <div className="track"><div className="fill" style={{ width: (pct * 100) + '%' }}></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Compliance Posture</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="status active"><span className="dot"></span>{cp.score} / 100</span>
              <button className="btn-link" onClick={() => navigate({ name: 'compliance' })}>Open →</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 24, alignItems: 'center' }}>
              {/* No valueText in this 140px column — the framework enumeration
                  lives on the Compliance screen this card links to. */}
              <Donut pct={cp.scoreFrac} size={140} centerLabel="passing" label="Composite score" />
              <div className="flex-col gap-12">
                <div className="flag fund">
                  <div className="lbl">{cp.totalPassing} of {cp.totalRules} rules passing</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>All cost-allowability, indirect-cost, and procurement rules clear across active portfolio.</div>
                </div>
                <div className="flag alert">
                  <div className="lbl">{cp.totalFindings} finding{cp.totalFindings !== 1 ? 's' : ''} · attention</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>Time & effort certification overdue (NSF-EDU-2024); SAM.gov registration renewal in 28 days.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Colophon */}
      <div className="colophon">
        <span>Grant Tracker · Editorial Build</span>
        <span>Last sync · {TODAY_MEDIUM} · 08:42 ET</span>
        <span>{TODAY_FQ_REVERSED}</span>
      </div>
    </div>
  );
};
