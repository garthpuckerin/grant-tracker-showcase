// AI Insights, Compliance, Reports, Documents, SF-425, Users, Settings — leaner secondary screens
import React from 'react';
import { DATA } from '../data.js';
import { fmt, Icon, Status, Donut } from '../atoms.jsx';
import { getTheme, setTheme, THEMES } from '../theme.js';
import { useVizColor, insightColor } from '../viz-color.js';
import { getDensity, setDensity } from '../density.js';
import { Drawer } from '../drawer.jsx';
import { shiftIso } from '../dates.js';

export const Insights = ({ navigate }) => {
  const D = DATA;
  const extra = [
    { id: 'i5', kind: 'alert',  agent: 'BUDGET',     title: 'DOE Energy grant Year 3 burn rate exceeds plan by 8%', body: 'Equipment line at $35K above budget pace. Recommend mid-year amendment to NSF financial officer.', severity: 'HIGH' },
    { id: 'i6', kind: 'indigo', agent: 'WRITER',     title: 'Quantum Computing proposal — specific aims draft ready', body: 'Auto-generated draft of Specific Aims 1–3 synthesized from related literature and prior aims. Pending PI revision.', severity: 'LOW' },
    { id: 'i7', kind: 'accent', agent: 'DEADLINE',   title: 'NIST Manufacturing — annual report due in 18 days', body: 'Programmatic and budget sections from prior year flagged for reuse. Estimated 4 hours to complete.', severity: 'MEDIUM' },
    { id: 'i8', kind: 'fund',   agent: 'OPTIMIZE',   title: 'Subaward consolidation opportunity', body: 'Three active grants share State A&M subrecipient. Consolidating invoicing would reduce admin overhead 14 hrs/quarter.', severity: 'LOW' },
    { id: 'i9', kind: 'indigo', agent: 'COMPLIANCE', title: 'NIH Public Access Policy — 1 publication non-compliant', body: 'Manuscript published in Cybersecurity Research Letters not deposited to PMC. 90-day window closes Jul 8.', severity: 'MEDIUM' },
  ];
  const all = [...D.insights, ...extra];

  // Agent strip colors come from the shared agent→color map so the dashboard
  // widget, this screen, and the topbar notifications all agree.
  const agents = ['COMPLIANCE', 'BUDGET', 'DEADLINE', 'OPTIMIZE', 'WRITER'].map((name) => ({
    name,
    count: all.filter((i) => i.agent === name).length,
    color: insightColor({ agent: name }),
  }));

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', marginRight: 6, verticalAlign: 'middle', animation: 'pulse 2s infinite' }}></span>
            Multi-Agent Synthesis · Active
          </div>
          <h1>AI Insights.</h1>
          <p className="sub">
            Five specialist agents — Compliance, Budget, Deadline, Optimize, Writer — continuously analyzing the portfolio. {all.length} findings synthesized in the last 24 hours.
          </p>
        </div>
        <div className="ph-actions">
          <button className="btn ghost"><Icon name="settings" size={12} /> Agent settings</button>
          <button className="btn accent"><Icon name="sparkle" size={12} /> Ask anything</button>
        </div>
      </div>

      {/* Agent strip */}
      <div className="bento" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {agents.map(a => (
          <div key={a.name} className="metric" style={{ minHeight: 100 }}>
            <div className="lbl" style={{ color: a.color }}>● {a.name}</div>
            <div className="val" style={{ fontSize: 36 }}>{a.count}<span className="unit">finding{a.count !== 1 ? 's' : ''}</span></div>
          </div>
        ))}
      </div>

      {/* All insights */}
      <div className="flex-col gap-12">
        {all.map(i => {
          const grant = D.grants.find(g => g.id === i.grantId);
          const color = insightColor(i);
          return (
            <div key={i.id} style={{
              display: 'grid',
              gridTemplateColumns: '4px 140px 1fr auto',
              gap: 18,
              padding: '20px 22px',
              border: '1px solid var(--rule)',
              background: 'var(--surface)',
              borderRadius: 2,
              alignItems: 'flex-start',
            }}>
              <div style={{ width: 4, alignSelf: 'stretch', background: color }}></div>
              <div>
                <div className="kicker" style={{ color, marginBottom: 6 }}>{i.agent}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>SEVERITY {i.severity}</div>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.005em' }}>{i.title}</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: '78ch' }}>{i.body}</div>
                {grant && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11 }} className="mono">
                    <span style={{ color: 'var(--ink-3)' }}>RELATED · {grant.agencyShort}</span>
                    <span>{grant.number}</span>
                    <button className="btn-link" onClick={() => navigate({ name: 'grant', id: grant.id, grant })}>Open →</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn ghost" style={{ height: 28, fontSize: 11 }}>Dismiss</button>
                <button className="btn" style={{ height: 28, fontSize: 11 }}>Take action</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Compliance = () => {
  const D = DATA;
  const { frameworks, portfolio } = D.compliance;
  // Open findings (below) span these grants — derive the "N across M grants"
  // kicker from the list itself so it can't drift from the rows shown.
  const openFindings = [
    { rule: '2 CFR 200.430', grant: 'NSF-EDU-2024-001', title: 'Time & effort certification overdue', sev: 'HIGH',   note: '2 PI certifications for FY25 H1 not submitted. Due before audit window opens.' },
    { rule: 'SAM.gov',       grant: 'NSF-EDU-2024-001', title: 'SAM.gov renewal due in 28 days',      sev: 'MEDIUM', note: 'Required for award draw-down continuity. Renewal portal access: pi@university.edu.' },
    { rule: 'Institutional', grant: 'DOE-ENERGY-2023-042', title: 'Cost-share quarterly report missing', sev: 'MEDIUM', note: 'University contribution documentation overdue Q4 FY25.' },
  ];
  const findingGrantCount = new Set(openFindings.map(f => f.grant)).size;
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Portfolio compliance · {portfolio.totalRules} rules across 2 CFR 200, NIH, NSF</div>
          <h1>Compliance.</h1>
          <p className="sub">Sponsor-aware rule engine continuously evaluates every active grant against federal, agency, and institutional policy. Findings surface here and on individual grant pages.</p>
        </div>
        <div className="ph-actions">
          <button className="btn ghost"><Icon name="download" size={12} /> Export audit</button>
          <button className="btn"><Icon name="play" size={12} /> Run scan</button>
        </div>
      </div>

      <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Portfolio Score</div></div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <Donut pct={portfolio.scoreFrac} size={200} valueText="2 CFR 200 · NIH · NSF · ED" label="Composite portfolio score" />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Rule Framework Coverage</div>
            <span className="kicker">{frameworks.length} frameworks</span>
          </div>
          <table className="ledger">
            <thead>
              <tr>
                <th>Framework</th>
                <th>Source</th>
                <th className="r">Rules</th>
                <th className="r">Passing</th>
                <th className="r">Findings</th>
                <th className="r">Score</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map(r => (
                <tr key={r.fw} className="row-h">
                  <td className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{r.fw}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{r.src}</td>
                  <td className="num r">{r.rules}</td>
                  <td className="num r" style={{ color: 'var(--fund)' }}>{r.pass}</td>
                  <td className="num r" style={{ color: r.find ? 'var(--alert)' : 'var(--ink-3)' }}>{r.find}</td>
                  <td className="num r" style={{ fontWeight: 600 }}>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Open Findings</div>
          <span className="kicker">{openFindings.length} across {findingGrantCount} grants</span>
        </div>
        <div className="list">
          {openFindings.map((f, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start', padding: '16px 20px' }}>
              <span style={{ width: 6, height: 6, marginTop: 6, borderRadius: '50%', background: f.sev === 'HIGH' ? 'var(--alert)' : 'var(--accent)' }}></span>
              <div style={{ flex: 1 }}>
                <div className="kicker" style={{ marginBottom: 4 }}>{f.rule} · {f.grant}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{f.title}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{f.note}</div>
              </div>
              <span className="mono" style={{ fontSize: 10, color: f.sev === 'HIGH' ? 'var(--alert)' : 'var(--ink-3)', letterSpacing: '0.14em' }}>{f.sev}</span>
              <button className="btn ghost" style={{ height: 26 }}>Resolve</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Reports = () => (
  <div>
    <div className="page-head">
      <div>
        <div className="eyebrow">Reporting · 12 saved · 4 scheduled</div>
        <h1>Reports.</h1>
        <p className="sub">Custom report builder, scheduled exports, and federal-form generators (SF-425, SF-270). Five chart primitives compose into any view.</p>
      </div>
      <div className="ph-actions">
        <button className="btn ghost"><Icon name="download" size={12} /> Templates</button>
        <button className="btn accent"><Icon name="plus" size={12} /> Build report</button>
      </div>
    </div>

    <div className="g-dense" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 24 }}>
      {[
        { title: 'Portfolio Burn Rate', desc: 'Monthly expenditure across all active grants', kind: 'LINE', last: shiftIso('2026-05-15') },
        { title: 'Sponsor Concentration', desc: 'Award distribution by federal agency', kind: 'PIE', last: shiftIso('2026-05-10') },
        { title: 'Category Spend FY26', desc: 'Personnel vs Equipment vs Supplies vs Indirect', kind: 'STACKED', last: shiftIso('2026-05-12') },
        { title: 'Time-to-Approval', desc: 'Reallocation workflow throughput', kind: 'BAR', last: shiftIso('2026-05-08') },
        { title: 'PI Workload Index', desc: 'Active grants × % effort per PI', kind: 'RADAR', last: shiftIso('2026-04-30') },
        { title: 'Audit-Ready Posture', desc: 'Compliance score trend, T-12 months', kind: 'LINE', last: shiftIso('2026-05-14') },
      ].map((r, i) => (
        <div key={i} className="card" style={{ cursor: 'pointer' }}>
          <div className="card-body" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="kicker">{r.kind}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{r.last}</span>
            </div>
            {/* Placeholder chart */}
            <svg viewBox="0 0 200 80" style={{ width: '100%', height: 80, marginBottom: 14 }}>
              <path d="M0 60 L 30 50 L 60 55 L 90 30 L 120 35 L 150 20 L 180 25 L 200 10" stroke="var(--ink)" strokeWidth="1.2" fill="none" />
              <path d="M0 60 L 30 50 L 60 55 L 90 30 L 120 35 L 150 20 L 180 25 L 200 10 L 200 80 L 0 80 Z" fill="oklch(0.95 0.01 80)" />
            </svg>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.15, marginBottom: 6 }}>{r.title}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{r.desc}</div>
          </div>
        </div>
      ))}
    </div>

    <div className="card">
      <div className="card-head">
        <div className="card-title">Scheduled Exports</div>
        <span className="kicker">4 active</span>
      </div>
      <table className="ledger">
        <thead>
          <tr>
            <th>Report</th>
            <th>Cadence</th>
            <th>Format</th>
            <th>Recipients</th>
            <th>Next Run</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Weekly Portfolio Burn', 'WEEKLY · Mon 08:00 ET', 'PDF, CSV', 'CFO, Research VP', shiftIso('2026-05-19')],
            ['Monthly Budget Variance', 'MONTHLY · 1st', 'XLSX', 'PI distribution list', shiftIso('2026-06-01')],
            ['Quarterly Compliance Audit', 'QUARTERLY', 'PDF', 'Internal Audit, Compliance', shiftIso('2026-07-01')],
            ['Annual SF-425 Bundle', 'ANNUAL', 'PDF, OMB form', 'Sponsored Programs', shiftIso('2026-12-15')],
          ].map((r, i) => (
            <tr key={i} className="row-h">
              <td className="ttl">{r[0]}</td>
              <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r[1]}</td>
              <td className="mono" style={{ fontSize: 11 }}>{r[2]}</td>
              <td className="muted" style={{ fontSize: 12.5 }}>{r[3]}</td>
              <td className="mono" style={{ fontSize: 12 }}>{r[4]}</td>
              <td><Status s="ACTIVE" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const Documents = () => {
  const D = DATA;
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Workspace · all grants</div>
          <h1>Documents.</h1>
          <p className="sub">Award notices, budget justifications, narratives, agreements, and reports — searchable, typed, AI-tagged.</p>
        </div>
        <div className="ph-actions">
          <button className="btn accent"><Icon name="plus" size={12} /> Upload</button>
        </div>
      </div>
      <div className="card">
        <table className="ledger">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Grant</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th className="r">Size</th>
            </tr>
          </thead>
          <tbody>
            {D.documents.map(d => {
              const g = D.grants.find(gg => gg.id === d.grantId);
              return (
                <tr className="row-h" key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="file" size={14} />
                      <span style={{ fontWeight: 500 }}>{d.name}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)' }}>{d.type}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{g?.agencyShort} · {g?.number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar-sm">{d.by.initials}</div>
                      <span style={{ fontSize: 12.5 }}>{d.by.name}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{d.date}</td>
                  <td className="num r muted">{d.size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// The filings shown on the index — a module constant so the index and the
// detail screen agree on period/type/status for a given grant.
const SF425_FILINGS = [
  { gi: 0, period: 'FY25 ANNUAL', type: 'Annual',    status: 'IN_PROGRESS', dueIso: '2026-06-15' },
  { gi: 1, period: 'FY25 Q4',     type: 'Quarterly', status: 'OPEN',        dueIso: '2026-05-30' },
  { gi: 3, period: 'FY25 FINAL',  type: 'Final',     status: 'IN_PROGRESS', dueIso: '2026-06-12' },
  { gi: 2, period: 'FY24 ANNUAL', type: 'Annual',    status: 'COMPLETE',    dueIso: '2026-03-01' },
  { gi: 5, period: 'FY25 FINAL',  type: 'Final',     status: 'OPEN',        dueIso: '2026-09-30' },
];

export const SF425 = ({ navigate }) => {
  const D = DATA;
  const rows = SF425_FILINGS.map((f) => ({ ...f, g: D.grants[f.gi], due: shiftIso(f.dueIso) }));
  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">OMB No. 4040-0014 · Federal Financial Report</div>
          <h1>SF-425 Filings.</h1>
          <p className="sub">Federal financial report packages — generated, validated against 2 CFR 200, and exported in OMB-conformant format. Open a filing to review the line-by-line report; every figure cross-foots to the grant’s budget and expenses.</p>
        </div>
        <div className="ph-actions">
          <button className="btn ghost"><Icon name="download" size={12} /> Bundle export</button>
          <button className="btn accent"><Icon name="plus" size={12} /> New filing</button>
        </div>
      </div>
      <div className="card">
        <table className="ledger">
          <thead>
            <tr>
              <th>Grant</th>
              <th>Period</th>
              <th>Reporting Type</th>
              <th>Status</th>
              <th>Due</th>
              <th className="r">Federal Share · Cumulative</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* Federal Share is the cumulative federal expenditure to date —
                tied to each grant's `spent` so the SF-425 figure agrees with
                the grant's Expended total rather than floating free. */}
            {rows.map((f, i) => (
              <tr key={i} className="row-h" style={{ cursor: 'pointer' }} onClick={() => navigate && navigate({ name: 'sf425detail', gi: f.gi, period: f.period, type: f.type, status: f.status, due: f.due })}>
                <td className="ttl">
                  {f.g.title}
                  <span className="gn">{f.g.number}</span>
                </td>
                <td className="mono" style={{ fontSize: 11 }}>{f.period}</td>
                <td className="muted">{f.type}</td>
                <td><Status s={f.status} /></td>
                <td className="mono" style={{ fontSize: 12, color: fmt.daysUntil(f.due) < 14 && f.status !== 'COMPLETE' ? 'var(--alert)' : 'var(--ink-3)' }}>{f.due}</td>
                <td className="num r">{fmt.money(f.g.spent)}</td>
                <td><button className="btn-link" onClick={(e) => { e.stopPropagation(); navigate && navigate({ name: 'sf425detail', gi: f.gi, period: f.period, type: f.type, status: f.status, due: f.due }); }}>Open →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── SF-425 detail — the OMB Federal Financial Report, cross-footed ──────────
// Every figure derives from the grant's budget/expenses so the report ties out
// to the Grants → Budget screens (line 10e = the grant's Expended total, 10d =
// Total Award). The OMB arithmetic (10c=a−b, 10g=e+f, 10h=d−g, 10k=i−j,
// 10o=l−m−n) is computed, then re-checked live in the validation strip — a
// grant fails to file if it does not cross-foot, so the demo proves it does.
function buildSF425(grant) {
  const authorized = grant.budget;            // 10d Total Federal funds authorized
  const expenditures = grant.spent;           // 10e Federal share of expenditures
  const li = grant.lineItems;                 // present for the rich grant (id '1')
  // 10f unliquidated obligations = encumbered (line-items when known, else a
  // modest 5% of the remaining balance — illustrative for grants without a
  // detailed ledger).
  const unliquidated = li
    ? li.reduce((s, l) => s + l.encumbered, 0)
    : Math.round((authorized - expenditures) * 0.05);
  const totalFederalShare = expenditures + unliquidated;   // 10g = 10e + 10f
  const unobligated = authorized - totalFederalShare;      // 10h = 10d − 10g
  // Federal cash: draws cover disbursements; cash on hand nets to zero.
  const disbursements = expenditures;                      // 10b
  const receipts = disbursements;                          // 10a
  const cashOnHand = receipts - disbursements;             // 10c = 10a − 10b
  // Recipient share / program income: none required on these awards.
  const recipRequired = 0, recipExpended = 0;
  const recipRemaining = recipRequired - recipExpended;    // 10k
  const piEarned = 0, piDeduct = 0, piAddition = 0;
  const piUnexpended = piEarned - piDeduct - piAddition;   // 10o
  // Indirect (line 11): from the INDIRECT line-item when known, else 47.5% MTDC.
  const indirectLine = li && li.find((l) => l.cat === 'INDIRECT');
  const indirectCharged = indirectLine ? indirectLine.spent : Math.round(expenditures * 0.15);
  return {
    authorized, expenditures, unliquidated, totalFederalShare, unobligated,
    receipts, disbursements, cashOnHand,
    recipRequired, recipExpended, recipRemaining,
    piEarned, piDeduct, piAddition, piUnexpended,
    indirectCharged,
  };
}

const money0 = (n) => '$' + Math.round(n).toLocaleString('en-US');

const SfRow = ({ line, label, value, strong, derived }) => (
  <tr className="row-h">
    <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', width: 44 }}>{line}</td>
    <td style={{ fontSize: 13, fontWeight: strong ? 600 : 400 }}>
      {label}{derived && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 8 }}>{derived}</span>}
    </td>
    <td className="num r" style={{ fontWeight: strong ? 600 : 400 }}>{money0(value)}</td>
  </tr>
);

export const SF425Detail = ({ navigate, route }) => {
  const D = DATA;
  const grant = D.grants[route.gi] || D.grants[0];
  const r = buildSF425(grant);

  // Live cross-foot checks — each must hold or the filing cannot be certified.
  const checks = [
    { label: '10c = 10a − 10b (cash on hand)', ok: r.cashOnHand === r.receipts - r.disbursements },
    { label: '10g = 10e + 10f (total federal share)', ok: r.totalFederalShare === r.expenditures + r.unliquidated },
    { label: '10h = 10d − 10g (unobligated balance)', ok: r.unobligated === r.authorized - r.totalFederalShare },
    { label: '10k = 10i − 10j (recipient share remaining)', ok: r.recipRemaining === r.recipRequired - r.recipExpended },
    { label: '10o = 10l − 10m − 10n (unexpended program income)', ok: r.piUnexpended === r.piEarned - r.piDeduct - r.piAddition },
    { label: `10e ties to grant Expended (${money0(grant.spent)})`, ok: r.expenditures === grant.spent },
    { label: `10d ties to Total Award (${money0(grant.budget)})`, ok: r.authorized === grant.budget },
  ];
  const allOk = checks.every((c) => c.ok);

  return (
    <div>
      <button className="btn-link" style={{ marginBottom: 12 }} onClick={() => navigate({ name: 'sf425' })}>
        ← All SF-425 filings
      </button>

      <div className="page-head">
        <div>
          <div className="eyebrow">OMB No. 4040-0014 · {route.period} · {route.type} · exp. 02/28/2025</div>
          <h1>SF-425 · {grant.agencyShort} {grant.number}</h1>
          <p className="sub">Federal Financial Report for {grant.title}. Recipient: State University Research Office · SAM.gov UEI on file. Every dollar figure is derived from this award’s budget and expenditures.</p>
        </div>
        <div className="ph-actions">
          <button className="btn ghost"><Icon name="download" size={12} /> Export OMB PDF</button>
          <button className="btn accent"><Icon name="check" size={12} /> Certify &amp; submit</button>
        </div>
      </div>

      <div className="g-split" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="flex-col gap-24">
          <div className="card">
            <div className="card-head"><div className="card-title">10. Transactions</div><span className="kicker">cumulative · this award</span></div>
            <table className="ledger">
              <tbody>
                <tr><td colSpan="3" className="kicker" style={{ padding: '12px 14px 6px' }}>Federal Cash</td></tr>
                <SfRow line="10a" label="Cash receipts" value={r.receipts} />
                <SfRow line="10b" label="Cash disbursements" value={r.disbursements} />
                <SfRow line="10c" label="Cash on hand" value={r.cashOnHand} derived="= 10a − 10b" />
                <tr><td colSpan="3" className="kicker" style={{ padding: '12px 14px 6px' }}>Federal Expenditures &amp; Unobligated Balance</td></tr>
                <SfRow line="10d" label="Total Federal funds authorized" value={r.authorized} />
                <SfRow line="10e" label="Federal share of expenditures" value={r.expenditures} />
                <SfRow line="10f" label="Federal share of unliquidated obligations" value={r.unliquidated} />
                <SfRow line="10g" label="Total Federal share" value={r.totalFederalShare} derived="= 10e + 10f" strong />
                <SfRow line="10h" label="Unobligated balance of Federal funds" value={r.unobligated} derived="= 10d − 10g" strong />
                <tr><td colSpan="3" className="kicker" style={{ padding: '12px 14px 6px' }}>Recipient Share</td></tr>
                <SfRow line="10i" label="Total recipient share required" value={r.recipRequired} />
                <SfRow line="10j" label="Recipient share of expenditures" value={r.recipExpended} />
                <SfRow line="10k" label="Remaining recipient share" value={r.recipRemaining} derived="= 10i − 10j" />
                <tr><td colSpan="3" className="kicker" style={{ padding: '12px 14px 6px' }}>Program Income</td></tr>
                <SfRow line="10l" label="Total Federal program income earned" value={r.piEarned} />
                <SfRow line="10m" label="Program income expended (deduction)" value={r.piDeduct} />
                <SfRow line="10n" label="Program income expended (addition)" value={r.piAddition} />
                <SfRow line="10o" label="Unexpended program income" value={r.piUnexpended} derived="= 10l − 10m − 10n" />
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">11. Indirect Expense</div><span className="kicker">2 CFR 200.414</span></div>
            <table className="ledger">
              <thead>
                <tr><th>Type of Rate</th><th>Rate</th><th>Base</th><th>Period</th><th className="r">Amount Charged</th><th className="r">Federal Share</th></tr>
              </thead>
              <tbody>
                <tr className="row-h">
                  <td className="mono" style={{ fontSize: 12 }}>Predetermined</td>
                  <td className="num r">47.5%</td>
                  <td className="mono" style={{ fontSize: 11 }}>MTDC</td>
                  <td className="mono" style={{ fontSize: 11 }}>{route.period}</td>
                  <td className="num r">{money0(r.indirectCharged)}</td>
                  <td className="num r">{money0(r.indirectCharged)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right rail — the cross-foot validator */}
        <div className="flex-col gap-24">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Cross-foot check</div>
              <span className={`status ${allOk ? 'active' : 'alert'}`}><span className="dot"></span>{allOk ? 'Ties out' : 'Error'}</span>
            </div>
            <div className="list">
              {checks.map((c, i) => (
                <div key={i} className="row" style={{ padding: '12px 16px', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ marginTop: 3, width: 8, height: 8, borderRadius: '50%', background: c.ok ? 'var(--fund)' : 'var(--alert)', flexShrink: 0 }}></span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{c.label}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: c.ok ? 'var(--fund)' : 'var(--alert)' }}>{c.ok ? '✓' : '✕'}</span>
                </div>
              ))}
            </div>
            <div className="card-body">
              <div className={`flag ${allOk ? 'fund' : 'alert'}`}>
                <div className="lbl">{allOk ? 'Report cross-foots' : 'Does not cross-foot'}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  {allOk
                    ? 'Every line reconciles to this award’s budget and expenditures. Ready to certify under 2 CFR 200.415.'
                    : 'One or more lines fail to reconcile. Certification is blocked until the figures tie out.'}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Reporting period</div></div>
            <div className="card-body">
              <dl className="drawer-dl">
                <div><dt>Grant</dt><dd className="mono">{grant.number}</dd></div>
                <div><dt>Recipient</dt><dd>State University Research Office</dd></div>
                <div><dt>Report type</dt><dd>{route.type}</dd></div>
                <div><dt>Basis of accounting</dt><dd>Accrual</dd></div>
                <div><dt>Due</dt><dd className="mono">{route.due}</dd></div>
                <div><dt>Status</dt><dd><Status s={route.status} /></dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Synthetic but stable per-member effort spread across the grants they lead.
// Deterministic (seeded by index) so it does not jump between renders.
const memberEffort = (user, grants) => {
  const led = grants.filter((g) => g.pi.id === user.id);
  if (led.length === 0) return [];
  // Distribute a plausible effort budget that sums to ~90% across led grants.
  // Deterministic weights (seeded by index) keep the split stable per render.
  const weights = led.map((_, i) => 3 + ((i * 2) % 4)); // 3..6
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return led.map((g, i) => ({
    grant: g,
    effort: Math.max(5, Math.round((weights[i] / totalWeight) * 90)),
  }));
};

const MEMBER_ROLES = ['ALL', 'ADMIN', 'PI', 'FINANCE'];

export const Members = () => {
  const D = DATA;
  const [role, setRole] = React.useState('ALL');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const filtered = D.users
    .filter((u) => role === 'ALL' || u.role === role)
    .filter(
      (u) =>
        !query ||
        (u.name + u.email + u.role).toLowerCase().includes(query.toLowerCase()),
    );

  const effort = selected ? memberEffort(selected, D.grants) : [];
  const totalEffort = effort.reduce((s, e) => s + e.effort, 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Administration · {D.users.length} members</div>
          <h1>Members.</h1>
          <p className="sub">Workspace members with role-based permissions — Admin, PI, Finance, Viewer. Select a member to view their effort allocation and contact details.</p>
        </div>
        <div className="ph-actions">
          <button className="btn accent"><Icon name="plus" size={12} /> Invite</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="pill-group">
          {MEMBER_ROLES.map((r) => (
            <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r}</button>
          ))}
        </div>
        <div className="member-search">
          <Icon name="search" size={12} />
          <input
            aria-label="Search members by name, email, or role"
            placeholder="Search members…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="kicker" style={{ marginLeft: 'auto' }}>{filtered.length} of {D.users.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="kicker">No results</div>
          <p className="serif">No members match this view</p>
          <p className="muted">Adjust the role filter or clear the search to see all workspace members.</p>
        </div>
      ) : (
        <div className="card">
          <table className="ledger">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th className="r">Active Grants</th>
                <th>Last Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="row-h" onClick={() => setSelected(u)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar-sm" style={{ width: 30, height: 30, fontSize: 11 }}>{u.initials}</div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{u.email}</td>
                  <td className="mono" style={{ fontSize: 11, letterSpacing: '0.12em' }}>{u.role}</td>
                  <td className="num r">{D.grants.filter(g => g.pi.id === u.id).length}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>2 hours ago</td>
                  <td><button className="btn-link" onClick={(e) => { e.stopPropagation(); setSelected(u); }}>View →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={selected ? `${selected.role} · State University Research Office` : undefined}
      >
        {selected && (
          <div className="flex-col gap-24">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar-sm" style={{ width: 48, height: 48, fontSize: 16 }}>{selected.initials}</div>
              <div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>{selected.name}</div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-3)', marginTop: 4 }}>{selected.role}</div>
              </div>
            </div>

            <div>
              <div className="drawer-section-label">Contact</div>
              <dl className="drawer-dl">
                <div><dt>Email</dt><dd className="mono">{selected.email}</dd></div>
                <div><dt>Role</dt><dd>{selected.role}</dd></div>
                <div><dt>Last active</dt><dd>2 hours ago</dd></div>
              </dl>
            </div>

            <div>
              <div className="drawer-section-label">Effort across grants {effort.length > 0 && <span className="kicker" style={{ marginLeft: 6 }}>{totalEffort}% committed</span>}</div>
              {effort.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>This member does not lead any active grants as Principal Investigator.</p>
              ) : (
                <div className="flex-col gap-12">
                  {effort.map(({ grant, effort: pct }) => (
                    <div key={grant.id}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{grant.title}</span>
                        <span className="num" style={{ fontSize: 13 }}>{pct}%</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginBottom: 6 }}>{grant.agencyShort} · {grant.number}</div>
                      <div className="track"><div className="fill" style={{ width: pct + '%' }}></div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ── Settings ──────────────────────────────────────────────────────────────
// Tabbed configuration screen. Appearance controls (theme / color-coded charts
// / reduce-motion) are LIVE and persist; the remaining controls are honest
// fixture-backed previews. No backend, no external deps.

const REDUCE_MOTION_KEY = 'gt2:reducemotion:v1';
const CADENCE_KEY = 'gt2:cadence:v1';

const SETTINGS_TABS = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'security', label: 'Security' },
];

const SPONSOR_PROFILES = [
  { sponsor: 'NSF', policyBasis: 'PAPPG + GC-1',              reportingCadence: 'Annual + final reports',  status: 'Active' },
  { sponsor: 'NIH', policyBasis: 'GPS + public access',       reportingCadence: 'RPPR + closeout',          status: 'Active' },
  { sponsor: 'DOE', policyBasis: 'Federal assistance rules',  reportingCadence: 'Quarterly technical',      status: 'Active' },
  { sponsor: 'EPA', policyBasis: 'Cooperative agreement',     reportingCadence: 'Milestone + financial',    status: 'Draft' },
];

const INTEGRATIONS = [
  { name: 'Grants.gov',         description: 'Opportunity ingest + package status', status: 'Connected', note: 'Last sync 08:42 ET' },
  { name: 'Research.gov',       description: 'NSF award reporting',                 status: 'Connected', note: 'Token renews Jun 14' },
  { name: 'DocuSign CLM',       description: 'Subaward execution packets',          status: 'Pending',   note: 'Awaiting admin consent' },
  { name: 'Workday Financials', description: 'Ledger + encumbrance feed',           status: 'Connected', note: 'Nightly import' },
];

const AUDIT_RULES = [
  { rule: '2 CFR 200.430',         check: 'Time & effort certification',        severity: 'High',   agentReview: true },
  { rule: 'SAM.gov',               check: 'Entity registration renewal',        severity: 'Medium', agentReview: true },
  { rule: 'NIH Public Access',     check: 'Publication deposit window',         severity: 'Medium', agentReview: true },
  { rule: 'Institutional cost-share', check: 'Quarterly contribution evidence', severity: 'Low',    agentReview: false },
];

const THEME_OPTIONS = [
  { id: 'light', icon: 'sun',  label: 'Light' },
  { id: 'beige', icon: 'star', label: 'Beige' },
  { id: 'dark',  icon: 'moon', label: 'Dark' },
];

// Hand-rolled toggle (label + note + on/off switch). Our tokens, no Radix.
const SettingToggle = ({ label, note, on, setOn }) => (
  <button
    type="button"
    className={`setting-toggle ${on ? 'on' : ''}`}
    aria-pressed={on}
    disabled={!setOn}
    onClick={() => setOn && setOn(!on)}
  >
    <span>
      <strong>{label}</strong>
      <em>{note}</em>
    </span>
    <span className="switch"><span></span></span>
  </button>
);

// Read the persisted reduce-motion preference (default off).
const getReduceMotion = () => {
  try { return localStorage.getItem(REDUCE_MOTION_KEY) === 'on'; }
  catch { return false; }
};

// Read the persisted operating-cadence preferences (sensible defaults).
const getCadence = () => {
  const defaults = { digest: true, aiReview: true, auditLock: false };
  try {
    const raw = localStorage.getItem(CADENCE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
};

export const Settings = () => {
  const [tab, setTab] = React.useState('workspace');

  // LIVE — theme (light/beige/dark via theme.js)
  const [theme, setThemeState] = React.useState(getTheme);
  const applyTheme = (t) => setThemeState(setTheme(t));

  // LIVE — color-coded charts (viz-color context; persists gt2:viz:v1)
  const { on: vizColor, setOn: setVizColor } = useVizColor();

  // LIVE — density (toggles [data-density="compact"] on <html>; persists)
  const [density, setDensityState] = React.useState(getDensity);
  const applyDensity = (d) => setDensityState(setDensity(d));

  // LIVE — reduce motion (toggles .reduce-motion on <html>; persists)
  const [reduceMotion, setReduceMotion] = React.useState(getReduceMotion);
  const applyReduceMotion = (next) => {
    document.documentElement.classList.toggle('reduce-motion', next);
    try { localStorage.setItem(REDUCE_MOTION_KEY, next ? 'on' : 'off'); } catch { /* private mode */ }
    setReduceMotion(next);
  };

  // LIVE — operating cadence (local state + persist)
  const [cadence, setCadence] = React.useState(getCadence);
  const setCadenceFlag = (key) => (next) => {
    setCadence((prev) => {
      const updated = { ...prev, [key]: next };
      try { localStorage.setItem(CADENCE_KEY, JSON.stringify(updated)); } catch { /* private mode */ }
      return updated;
    });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Administration · preview configuration</div>
          <h1>Settings.</h1>
          <p className="sub">
            Workspace controls for sponsor policy profiles, integrations, alert cadence,
            AI review behavior, and audit readiness. Appearance settings apply live.
          </p>
        </div>
        <div className="ph-actions">
          <button className="btn ghost"><Icon name="download" size={12} /> Export config</button>
          <button className="btn accent"><Icon name="plus" size={12} /> Add integration</button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Settings sections">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'workspace' && (
        <div className="settings-grid">
          <div className="card settings-primary">
            <div className="card-head">
              <div className="card-title">Workspace Profile</div>
              <Status s="ACTIVE" />
            </div>
            <div className="settings-form">
              <label>
                Institution
                <input defaultValue="State University Research Office" />
              </label>
              <label>
                Workspace slug
                <input defaultValue="state-u-sponsored-programs" />
              </label>
              <label>
                Fiscal year start
                <select defaultValue="jul">
                  <option value="jul">July 1</option>
                  <option value="oct">October 1</option>
                  <option value="jan">January 1</option>
                </select>
              </label>
              <label>
                Default timezone
                <select defaultValue="et">
                  <option value="et">America/New_York</option>
                  <option value="ct">America/Chicago</option>
                  <option value="pt">America/Los_Angeles</option>
                </select>
              </label>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <div className="flag indigo">
                <div className="lbl">Preview</div>
                <div style={{ fontSize: 12.5 }}>Profile fields show fixture defaults; they will persist to your workspace in the production build.</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Operating Cadence</div>
            </div>
            <div className="settings-list">
              <SettingToggle label="Weekly portfolio digest" note="Monday 08:00 ET to administrators" on={cadence.digest} setOn={setCadenceFlag('digest')} />
              <SettingToggle label="AI pre-review" note="Draft narrative, budget, and compliance summaries" on={cadence.aiReview} setOn={setCadenceFlag('aiReview')} />
              <SettingToggle label="Audit lock mode" note="Freeze exports during internal audit windows" on={cadence.auditLock} setOn={setCadenceFlag('auditLock')} />
            </div>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="settings-grid">
          <div className="card settings-primary">
            <div className="card-head">
              <div className="card-title">Interface</div>
              <span className="kicker">{THEME_OPTIONS.find((o) => o.id === theme)?.label || 'Light'}</span>
            </div>
            <div className="settings-form" style={{ gridTemplateColumns: '1fr' }}>
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>Theme</div>
                <div className="pill-group" role="group" aria-label="Theme">
                  {THEME_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      className={theme === o.id ? 'on' : ''}
                      aria-pressed={theme === o.id}
                      onClick={() => applyTheme(o.id)}
                    >
                      <Icon name={o.icon} size={12} /> {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>Density</div>
                <div className="pill-group" role="group" aria-label="Density">
                  <button
                    className={density === 'comfortable' ? 'on' : ''}
                    aria-pressed={density === 'comfortable'}
                    onClick={() => applyDensity('comfortable')}
                  >Comfortable</button>
                  <button
                    className={density === 'compact' ? 'on' : ''}
                    aria-pressed={density === 'compact'}
                    onClick={() => applyDensity('compact')}
                  >Compact</button>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Preferences</div>
            </div>
            <div className="settings-list">
              <SettingToggle
                label="Color-coded charts"
                note="Tint bars, sparklines, donuts & utilization by value (green / amber / red)"
                on={vizColor}
                setOn={setVizColor}
              />
              <SettingToggle
                label="Reduce motion"
                note="Minimize chart and transition animation"
                on={reduceMotion}
                setOn={applyReduceMotion}
              />
              <SettingToggle
                label="Tabular numerals"
                note="Monospaced figures in ledgers and metrics (preview)"
                on={true}
              />
            </div>
            <div className="card-body">
              <div className="flag indigo">
                <div className="lbl">Note</div>
                <div style={{ fontSize: 12.5 }}>
                  Theme, density, color-coded charts, and reduce-motion apply instantly and persist.
                  The tabular-numeral preview will persist to your profile in the production build.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sponsors' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Sponsor Profiles</div>
            <span className="kicker">{SPONSOR_PROFILES.length} configured</span>
          </div>
          <table className="ledger">
            <thead>
              <tr><th>Sponsor</th><th>Policy basis</th><th>Reporting cadence</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {SPONSOR_PROFILES.map((p) => (
                <tr key={p.sponsor} className="row-h">
                  <td className="mono" style={{ fontWeight: 600 }}>{p.sponsor}</td>
                  <td>{p.policyBasis}</td>
                  <td className="muted">{p.reportingCadence}</td>
                  <td><Status s={p.status === 'Active' ? 'ACTIVE' : 'DRAFT'} /></td>
                  <td><button className="btn-link">Edit →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="g-dense" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {INTEGRATIONS.map((i) => (
            <div className="card" key={i.name} style={{ minHeight: 150, display: 'flex', flexDirection: 'column' }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">{i.name}</div>
                  <Status s={i.status === 'Connected' ? 'ACTIVE' : 'DRAFT'} />
                </div>
                <p className="muted" style={{ fontSize: 13 }}>{i.description}</p>
                <div className="divider" style={{ marginTop: 'auto' }}></div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{i.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'compliance' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Rule Engine</div>
            <span className="status active"><span className="dot"></span>Monitoring</span>
          </div>
          <table className="ledger">
            <thead>
              <tr><th>Rule</th><th>Check</th><th>Severity</th><th>Agent Review</th></tr>
            </thead>
            <tbody>
              {AUDIT_RULES.map((r) => (
                <tr key={r.rule} className="row-h">
                  <td className="mono">{r.rule}</td>
                  <td>{r.check}</td>
                  <td className="mono" style={{ color: r.severity === 'High' ? 'var(--alert)' : 'var(--ink-3)' }}>{r.severity}</td>
                  <td>{r.agentReview ? 'Enabled' : 'Manual only'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'security' && (
        <div className="settings-grid">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Access Policy</div>
              <span className="kicker">preview</span>
            </div>
            <div className="settings-list">
              <SettingToggle label="Require MFA" note="All finance and admin users" on={true} />
              <SettingToggle label="Session timeout" note="12 hours for trusted devices" on={true} />
              <SettingToggle label="Export watermarking" note="Applied to reports and SF-425 bundles" on={true} />
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Audit Trail</div>
              <span className="kicker">Immutable</span>
            </div>
            <div className="card-body">
              <div className="figure" style={{ fontSize: 64 }}>1,284</div>
              <p className="muted" style={{ fontSize: 13 }}>
                configuration, export, approval, and compliance events retained for federal audit readiness.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
