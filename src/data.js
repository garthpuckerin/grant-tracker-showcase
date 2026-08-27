// Demo data lifted from the codebase, adapted for the prototype.
import { shiftIso, daysFromToday, isoFromToday } from './dates.js';

// ── Compliance model (module scope so the store can re-derive it) ───────────
// Findings are the SOURCE; every score is DERIVED from them. Resolving a finding
// therefore re-derives the framework table, the portfolio composite, the
// dashboard posture, and the grant's rule slice — from one place.
const FRAMEWORKS_BASE = [
  { fw: '2 CFR 200',    src: 'OMB Uniform Guidance',                     rules: 8 },
  { fw: 'NIH GPS',      src: 'NIH Grants Policy Statement',              rules: 5 },
  { fw: 'NSF PAPPG',    src: 'NSF Proposal Award Policies & Procedures', rules: 4 },
  { fw: 'NSF GC-1',     src: 'NSF General Conditions',                   rules: 3 },
  { fw: 'Institutional',src: 'State Univ. Research Office',              rules: 2 },
];

// Per-grant rule sets keyed by grantId. `pass` is derived: a rule fails only
// while an OPEN finding cites it for that grant. `note` may be a token the
// grant-detail tab resolves against the live clock.
const GRANT_RULES_BASE = {
  '1': [
    { id: '2 CFR 200.430', name: 'Time and effort certification',  severity: 'HIGH', note: '2 PI certifications for FY25 H1 not yet submitted.', passNote: 'All FY25 certifications on file.' },
    { id: '2 CFR 200.414', name: 'Indirect cost rate compliance',  severity: 'LOW',  note: 'F&A applied at 47.5% MTDC matches negotiated rate.' },
    { id: '2 CFR 200.331', name: 'Subrecipient monitoring',        severity: 'MED',  note: 'State A&M subaward in good standing.' },
    { id: '2 CFR 200.317', name: 'Procurement standards',          severity: 'LOW',  note: 'Equipment >$5k via competitive solicitation.' },
    { id: 'NSF PAPPG II',  name: 'Project reporting cadence',      severity: 'MED',  note: 'annual-report' },
    { id: 'NSF PAPPG XI',  name: 'Conflict of interest disclosure',severity: 'LOW',  note: 'All key personnel current.' },
    { id: 'SAM.gov',       name: 'Active registration',            severity: 'MED',  note: 'sam-renewal', passNote: 'SAM.gov registration active and current.' },
    { id: '2 CFR 200.413', name: 'Direct cost allocation',         severity: 'LOW',  note: 'No anomalies detected in current period.' },
  ],
};

// The open-findings register. `rule` ties a finding to a grant rule id (so the
// grant tab flips), `fw` ties it to a framework row (so the table/score move).
const INITIAL_FINDINGS = [
  { id: 'f1', rule: '2 CFR 200.430', fw: '2 CFR 200',    grantId: '1', grant: 'NSF-EDU-2024-001',    title: 'Time & effort certification overdue', sev: 'HIGH',   note: '2 PI certifications for FY25 H1 not submitted. Due before audit window opens.', status: 'OPEN' },
  { id: 'f2', rule: 'SAM.gov',       fw: 'NSF PAPPG',    grantId: '1', grant: 'NSF-EDU-2024-001',    title: 'SAM.gov renewal due in 28 days',      sev: 'MEDIUM', note: 'Required for award draw-down continuity. Renewal portal access: pi@university.edu.', status: 'OPEN' },
  { id: 'f3', rule: 'Institutional', fw: 'Institutional',grantId: '2', grant: 'DOE-ENERGY-2023-042', title: 'Cost-share quarterly report missing', sev: 'MEDIUM', note: 'University contribution documentation overdue Q4 FY25.', status: 'OPEN' },
];

export function buildCompliance(findings = INITIAL_FINDINGS) {
  const open = findings.filter((f) => f.status === 'OPEN');
  const frameworks = FRAMEWORKS_BASE.map((f) => {
    const fail = open.filter((x) => x.fw === f.fw).length;
    return { ...f, fail, pass: f.rules - fail, find: fail, score: Math.round(((f.rules - fail) / f.rules) * 100) };
  });
  const totalRules = frameworks.reduce((s, f) => s + f.rules, 0);
  const totalPassing = frameworks.reduce((s, f) => s + f.pass, 0);
  const totalFindings = frameworks.reduce((s, f) => s + f.find, 0);
  const score = Math.round((totalPassing / totalRules) * 100);
  const grantRules = Object.fromEntries(
    Object.entries(GRANT_RULES_BASE).map(([gid, rules]) => [
      gid,
      rules.map((r) => {
        const failing = open.some((x) => x.grantId === gid && x.rule === r.id);
        return { ...r, pass: !failing, note: failing || !r.passNote ? r.note : r.passNote };
      }),
    ]),
  );
  return {
    frameworks,
    grantRules,
    findings,
    portfolio: { totalRules, totalPassing, totalFindings, score, scoreFrac: score / 100 },
  };
}

const DATA = (() => {
  const users = [
    { id: 'u1', name: 'Demo Administrator', email: 'demo@university.edu', role: 'ADMIN', initials: 'DA' },
    { id: 'u2', name: 'Dr. James Rodriguez', email: 'j.rodriguez@university.edu', role: 'PI', initials: 'JR' },
    { id: 'u3', name: 'Dr. Emily Watson', email: 'e.watson@university.edu', role: 'PI', initials: 'EW' },
    { id: 'u4', name: 'Dr. Michael Kim', email: 'm.kim@university.edu', role: 'PI', initials: 'MK' },
    { id: 'u5', name: 'Lisa Thompson', email: 'finance@university.edu', role: 'FINANCE', initials: 'LT' },
  ];

  // AUTHORING INVARIANT (enforced by data-coherence.test.mjs): every fixture
  // date is anchor-relative — shiftIso() re-anchors it onto the real "today",
  // preserving each date's distance from the 2026-05-17 anchor forever. An
  // ACTIVE grant's period must therefore STRADDLE the anchor, its labeled
  // `year` must match the years elapsed at the anchor, and end − start must
  // equal `totalYears`. Violations render as impossible UI on some viewing
  // date (an ACTIVE award showing "-259 d" remaining — the shipped defect
  // that motivated the invariant).
  const grants = [
    {
      id: '1',
      title: 'Advanced STEM Education Through AI Integration',
      number: 'NSF-EDU-2024-001',
      agency: 'National Science Foundation',
      agencyShort: 'NSF',
      status: 'ACTIVE',
      year: 2, totalYears: 5,
      start: shiftIso('2024-12-04'), end: shiftIso('2029-12-03'),
      pi: users[1],
      // Grant-level `spent` is reconciled to equal Σ years[].spent (262,500 =
      // 175,000 Y1 + 87,500 Y2). The Year-2 line items below independently sum
      // to the Year-2 award (250k budgeted) and Year-2 spent (87.5k), so the
      // masthead "Expended", the per-year timeline, and the burn donut all agree.
      budget: 1250000, spent: 262500,
      years: [
        { n: 1, fy: 'FY24', number: 'NSF-EDU-2024', award: 250000, spent: 175000 },
        { n: 2, fy: 'FY25', number: 'NSF-EDU-2025', award: 250000, spent: 87500 },
        { n: 3, fy: 'FY26', number: 'NSF-EDU-2026', award: 250000, spent: 0 },
        { n: 4, fy: 'FY27', number: 'NSF-EDU-2027', award: 250000, spent: 0 },
        { n: 5, fy: 'FY28', number: 'NSF-EDU-2028', award: 250000, spent: 0 },
      ],
      lineItems: [
        { cat: 'PERSONNEL',  desc: 'Faculty PI, 2 grad students, postdoc',     budgeted: 112500, spent: 39375, encumbered: 11250 },
        { cat: 'EQUIPMENT',  desc: 'Compute cluster GPU expansion',            budgeted: 50000,  spent: 17500, encumbered: 5000 },
        { cat: 'SUPPLIES',   desc: 'Materials, consumables, software',         budgeted: 37500,  spent: 13125, encumbered: 3750 },
        { cat: 'TRAVEL',     desc: 'NSF PI Mtg + 2 conferences',               budgeted: 25000,  spent: 8750,  encumbered: 2500 },
        { cat: 'INDIRECT',   desc: 'F&A indirect (47.5% on MTDC)',             budgeted: 25000,  spent: 8750,  encumbered: 2500 },
      ],
    },
    { id: '2',  title: 'Sustainable Energy Research Initiative', number: 'DOE-ENERGY-2023-042', agency: 'Department of Energy', agencyShort: 'DOE', status: 'ACTIVE',  year: 3, totalYears: 3, start:shiftIso('2023-11-15'), end:shiftIso('2026-11-14'), pi: users[2], budget: 890000, spent: 694200 },
    { id: '3',  title: 'Cybersecurity in Healthcare Systems',    number: 'NIH-CYBER-2024-018',  agency: 'National Institutes of Health', agencyShort: 'NIH', status: 'ACTIVE',  year: 1, totalYears: 3, start:shiftIso('2025-07-01'), end:shiftIso('2028-06-30'), pi: users[3], budget: 750000, spent: 90000 },
    { id: '4',  title: 'Climate Change Impact on Urban Planning',number: 'EPA-CLIMATE-2022-089',agency: 'Environmental Protection Agency', agencyShort: 'EPA', status: 'ACTIVE', year: 3, totalYears: 3, start:shiftIso('2023-08-01'), end:shiftIso('2026-07-31'), pi: users[1], budget: 525000, spent: 498750 },
    { id: '5',  title: 'Machine Learning for Drug Discovery',    number: 'FDA-ML-2024-007',     agency: 'Food and Drug Administration', agencyShort: 'FDA', status: 'ACTIVE', year: 1, totalYears: 2, start:shiftIso('2025-08-01'), end:shiftIso('2027-07-31'), pi: users[2], budget: 680000, spent: 190400 },
    { id: '6',  title: 'Rural Broadband Infrastructure Study',   number: 'USDA-BROADBAND-2023-156', agency: 'Department of Agriculture', agencyShort: 'USDA', status: 'ACTIVE', year: 2, totalYears: 2, start:shiftIso('2024-10-01'), end:shiftIso('2026-09-30'), pi: users[3], budget: 420000, spent: 281400 },
    { id: '7',  title: 'Quantum Computing Applications in Finance', number: 'NSF-QUANTUM-2025-203', agency: 'National Science Foundation', agencyShort: 'NSF', status: 'DRAFT', year: 1, totalYears: 4, start:shiftIso('2026-10-01'), end:shiftIso('2030-09-30'), pi: users[1], budget: 1100000, spent: 0 },
    { id: '8',  title: 'Renewable Energy Storage Solutions',     number: 'DOE-STORAGE-2024-091', agency: 'Department of Energy', agencyShort: 'DOE', status: 'ACTIVE', year: 1, totalYears: 2, start:shiftIso('2025-09-01'), end:shiftIso('2027-08-31'), pi: users[2], budget: 380000, spent: 68400 },
    { id: '9',  title: 'Biodiversity Conservation Through Technology', number: 'NOAA-BIO-2023-127', agency: 'NOAA', agencyShort: 'NOAA', status: 'ACTIVE', year: 2, totalYears: 3, start:shiftIso('2024-11-10'), end:shiftIso('2027-11-09'), pi: users[3], budget: 620000, spent: 359600 },
    { id: '10', title: 'Advanced Materials for Space Exploration', number: 'NASA-MATERIALS-2024-034', agency: 'NASA', agencyShort: 'NASA', status: 'ACTIVE', year: 1, totalYears: 3, start:shiftIso('2025-08-15'), end:shiftIso('2028-08-14'), pi: users[1], budget: 940000, spent: 75200 },
    { id: '11', title: 'AI Ethics in Educational Technology',     number: 'ED-AI-ETHICS-2024-012', agency: 'Department of Education', agencyShort: 'ED', status: 'ACTIVE', year: 2, totalYears: 2, start:shiftIso('2024-09-15'), end:shiftIso('2026-09-14'), pi: users[2], budget: 290000, spent: 208800 },
    { id: '12', title: 'Digital Health Innovation Platform',      number: 'HHS-DIGITAL-2023-098', agency: 'Health & Human Services', agencyShort: 'HHS', status: 'ACTIVE', year: 2, totalYears: 2, start:shiftIso('2024-08-01'), end:shiftIso('2026-07-31'), pi: users[3], budget: 510000, spent: 428400 },
    { id: '13', title: 'Smart Cities Infrastructure Research',    number: 'DOT-SMART-2024-067', agency: 'Department of Transportation', agencyShort: 'DOT', status: 'ACTIVE', year: 1, totalYears: 3, start:shiftIso('2025-10-15'), end:shiftIso('2028-10-14'), pi: users[1], budget: 775000, spent: 170500 },
    { id: '14', title: 'Advanced Manufacturing Automation',       number: 'NIST-AUTO-2023-145', agency: 'NIST', agencyShort: 'NIST', status: 'ACTIVE', year: 2, totalYears: 2, start:shiftIso('2024-07-01'), end:shiftIso('2026-06-30'), pi: users[2], budget: 350000, spent: 311500 },
    { id: '15', title: 'Ocean Pollution Monitoring Network',      number: 'NOAA-OCEAN-2024-078', agency: 'NOAA', agencyShort: 'NOAA', status: 'ACTIVE', year: 1, totalYears: 2, start:shiftIso('2025-11-01'), end:shiftIso('2027-10-31'), pi: users[3], budget: 465000, spent: 69750 },
  ];

  // Compute spent% for cards
  grants.forEach(g => g.pct = g.budget > 0 ? g.spent / g.budget : 0);

  // FY labels and per-year award numbers on the flagship grant are DERIVED
  // from the (re-anchored) start date, so the multi-year timeline always
  // agrees with the period of performance as the calendar advances.
  {
    const y0 = new Date(grants[0].start + 'T00:00:00').getFullYear();
    grants[0].years = grants[0].years.map((y) => ({
      ...y,
      fy: `FY${String(y0 + y.n - 1).slice(-2)}`,
      number: `NSF-EDU-${y0 + y.n - 1}`,
    }));
  }

  const tasks = [
    // PINNED OVERDUE: two non-complete tasks are anchored a few days in the PAST
    // (relative to TODAY) so "overdue" is reliably non-empty and stable on any
    // viewing date. The rest use the offset-preserving shiftIso() migration.
    // t1 → 3 days late, t6 → 1 day late. The overdue stat + OVERDUE task group
    // and the dashboard red "N overdue task(s)" copy render live from these.
    { id: 't1', title: 'Submit Quarterly Progress Report', desc: 'Q1 NSF progress narrative + budget variance', due: isoFromToday(-3), status: 'OPEN', priority: 'HIGH', grantId: '1', assigned: users[1] },
    { id: 't2', title: 'Equipment Purchase Approval',      desc: 'Pre-award purchase request, OXPS-9000 spectrometer', due: shiftIso('2026-05-25'), status: 'IN_PROGRESS', priority: 'MEDIUM', grantId: '2', assigned: users[2] },
    { id: 't3', title: 'Hire Postdoctoral Researcher',     desc: 'Cybersecurity / clinical informatics, posting #4421', due: shiftIso('2026-06-01'), status: 'OPEN', priority: 'HIGH', grantId: '3', assigned: users[3] },
    { id: 't4', title: 'Q1 Finance Variance Review',       desc: '4-grant review with finance team', due: shiftIso('2026-05-19'), status: 'COMPLETE', priority: 'MEDIUM', grantId: '1', assigned: users[4] },
    { id: 't5', title: 'IRB Re-certification',             desc: 'Annual continuing review packet', due: shiftIso('2026-04-14'), status: 'COMPLETE', priority: 'LOW', grantId: '5', assigned: users[2] },
    { id: 't6', title: 'EPA Final Annual Report',          desc: 'Programmatic + SF-425 fed financial', due: isoFromToday(-1), status: 'IN_PROGRESS', priority: 'HIGH', grantId: '4', assigned: users[1] },
    { id: 't7', title: 'Subaward Compliance Audit',        desc: 'USDA pass-through to State A&M', due: shiftIso('2026-06-22'), status: 'OPEN', priority: 'MEDIUM', grantId: '6', assigned: users[3] },
    { id: 't8', title: 'Draft Quantum NSF Proposal',       desc: 'Specific aims + biosketch refresh', due: shiftIso('2026-07-04'), status: 'IN_PROGRESS', priority: 'HIGH', grantId: '7', assigned: users[1] },
    { id: 't9', title: 'Travel Pre-Approval — MRS Fall Meeting', desc: '3 conference attendees, OK 4710', due: shiftIso('2026-05-30'), status: 'OPEN', priority: 'LOW', grantId: '2', assigned: users[2] },
  ];

  const documents = [
    { id: 'd1', name: 'NSF Award Notice — FY25.pdf',         type: 'AWARD',     size: '412 KB', date: shiftIso('2025-01-08'), by: users[0], grantId: '1' },
    { id: 'd2', name: 'Budget Justification — Year 2.docx',  type: 'BUDGET',    size: '88 KB',  date: shiftIso('2025-11-20'), by: users[1], grantId: '1' },
    { id: 'd3', name: 'Project Narrative.pdf',               type: 'NARRATIVE', size: '1.2 MB', date: shiftIso('2024-10-22'), by: users[1], grantId: '1' },
    { id: 'd4', name: 'Subaward Agreement — State A&M.pdf',  type: 'AGREEMENT', size: '624 KB', date: shiftIso('2025-02-19'), by: users[0], grantId: '1' },
    { id: 'd5', name: 'IRB Approval Letter.pdf',             type: 'COMPLIANCE',size: '128 KB', date: shiftIso('2024-12-04'), by: users[4], grantId: '1' },
    { id: 'd6', name: 'Q1 Progress Report — DRAFT.docx',     type: 'REPORT',    size: '264 KB', date: shiftIso('2026-05-12'), by: users[1], grantId: '1' },
  ];

  // ── Reallocations — the RBAC-gated approval workflow's records ─────────────
  // Federal budget transfers between categories. Under 2 CFR 200.308 these need
  // prior approval; a PI originates the request, Finance/Sponsored Programs
  // approves (separation of duties, rbac.js). The two APPROVED rows are HISTORY
  // — the current line-item `budgeted` figures in grant '1' already reflect them
  // (applied:false), so the demo does not double-count on load. The PENDING row
  // is live: approving it in-session moves $8,000 SUPPLIES → EQUIPMENT and the
  // Budget ledger re-derives. Requester u2 = Dr. Rodriguez (PI of grant 1),
  // approver u5 = Lisa Thompson (Finance).
  const reallocations = [
    { id: 'r1', grantId: '1', fromCat: 'EQUIPMENT', toCat: 'PERSONNEL', amount: 12500,
      reason: 'Reclassify postdoc supplement to align with NSF personnel policy.',
      status: 'APPROVED', requestedBy: 'u2', requestedAt: shiftIso('2026-02-12'),
      decidedBy: 'u5', decidedAt: shiftIso('2026-02-14'), applied: false },
    { id: 'r2', grantId: '1', fromCat: 'TRAVEL', toCat: 'SUPPLIES', amount: 4200,
      reason: 'APS March Meeting cancelled; redirect to wet-lab consumables.',
      status: 'APPROVED', requestedBy: 'u2', requestedAt: shiftIso('2026-01-03'),
      decidedBy: 'u5', decidedAt: shiftIso('2026-01-05'), applied: false },
    { id: 'r3', grantId: '1', fromCat: 'SUPPLIES', toCat: 'EQUIPMENT', amount: 8000,
      reason: 'Postdoc bridge instrumentation; travel savings redirected to lab equipment.',
      status: 'PENDING', requestedBy: 'u2', requestedAt: shiftIso('2026-05-15'),
      decidedBy: null, decidedAt: null, applied: false },
  ];

  // ── SF-425 filings register ──────────────────────────────────────────────
  // `gi` indexes `grants`. Status moves OPEN → IN_PROGRESS → COMPLETE when an
  // authorized official certifies the report (store.certifyFiling, RBAC-gated).
  // Period labels are DERIVED from the due date (calendar-fiscal convention,
  // dates.js): an Annual report covers the prior FY, a Quarterly the prior
  // quarter, and a Final the FY it is due in (due ≈ 120 days after period end).
  const filingPeriod = (type, dueIso) => {
    const dd = new Date(dueIso.slice(0, 10) + 'T00:00:00');
    const fy = (y) => `FY${String(y).slice(-2)}`;
    if (type === 'Quarterly') {
      const q = Math.floor(dd.getMonth() / 3) + 1;
      return q === 1 ? `${fy(dd.getFullYear() - 1)} Q4` : `${fy(dd.getFullYear())} Q${q - 1}`;
    }
    if (type === 'Annual') return `${fy(dd.getFullYear() - 1)} ANNUAL`;
    return `${fy(dd.getFullYear())} FINAL`;
  };
  const filings = [
    { id: 'sf1', gi: 0, type: 'Annual',    status: 'IN_PROGRESS', due: shiftIso('2026-06-15') },
    { id: 'sf2', gi: 1, type: 'Quarterly', status: 'OPEN',        due: shiftIso('2026-07-30') },
    { id: 'sf3', gi: 3, type: 'Final',     status: 'OPEN',        due: shiftIso('2026-11-28') },
    { id: 'sf4', gi: 8, type: 'Annual',    status: 'COMPLETE',    due: shiftIso('2026-03-01'), certifiedBy: 'u5', certifiedAt: shiftIso('2026-02-24') },
    { id: 'sf5', gi: 5, type: 'Final',     status: 'OPEN',        due: shiftIso('2027-01-28') },
  ].map((f) => ({ ...f, period: filingPeriod(f.type, f.due) }));

  // Spending data by month — a trailing-12 series. The VALUES preserve their
  // original oldest→newest order; the month LABELS are re-derived so the series
  // always ends at the current month (and the dashboard "FY" range, which drops
  // the leading entry, still trims the oldest month). Each label is the
  // 3-letter month name N months back from today, computed from TODAY.
  const monthlyValues = [26700, 29800, 33400, 27800, 29800, 24700, 31200, 38200, 36400, 41200, 39800, 27100];
  const monthDate = (offsetBack) => {
    const d = daysFromToday(0);
    d.setDate(1); // avoid month-length overflow when stepping back
    d.setMonth(d.getMonth() - offsetBack);
    return d;
  };
  const monthly = monthlyValues.map((v, i) => {
    const d = monthDate(monthlyValues.length - 1 - i);
    return {
      m: d.toLocaleDateString('en-US', { month: 'short' }),
      yy: String(d.getFullYear()).slice(-2), // 2-digit year for "May 26" labels
      v,
    };
  });

  const insights = [
    { id: 'i1', kind: 'alert',  agent: 'BUDGET',     title: 'EPA Climate grant projected to overspend Year 3 by 4.8%', body: 'Personnel encumbrances exceed remaining award by $25,250. Reallocation from Equipment recommended within the next two weeks.', grantId: '4', severity: 'HIGH' },
    { id: 'i2', kind: 'accent', agent: 'DEADLINE',   title: 'NSF Q1 Progress Report is 3 days past due', body: 'Programmatic narrative draft is 62% complete. Budget variance section still requires PI sign-off.', grantId: '1', severity: 'MEDIUM' },
    { id: 'i3', kind: 'indigo', agent: 'COMPLIANCE', title: '2 CFR 200 §200.430 — time & effort certification overdue', body: '2 PI certifications for FY25 H1 have not been submitted. Required for federal audit readiness.', grantId: '1', severity: 'MEDIUM' },
    { id: 'i4', kind: 'fund',   agent: 'OPTIMIZE',   title: 'NIH Cyber grant trending 12% under plan', body: 'Underspend driven by delayed equipment delivery. Consider pre-purchasing FY26 supplies under §1903 carry-forward.', grantId: '3', severity: 'LOW' },
    { id: 'i5', kind: 'alert',  agent: 'BUDGET',     title: 'DOE Energy grant Year 3 burn rate exceeds plan by 8%', body: 'Equipment line at $35K above budget pace. Recommend mid-year amendment to the DOE financial officer.', grantId: '2', severity: 'HIGH' },
    { id: 'i6', kind: 'indigo', agent: 'WRITER',     title: 'Quantum Computing proposal — specific aims draft ready', body: 'Auto-generated draft of Specific Aims 1–3 synthesized from related literature and prior aims. Pending PI revision.', grantId: '7', severity: 'LOW' },
    { id: 'i7', kind: 'accent', agent: 'DEADLINE',   title: 'NIST Manufacturing — annual report due in 18 days', body: 'Programmatic and budget sections from prior year flagged for reuse. Estimated 4 hours to complete.', grantId: '14', severity: 'MEDIUM' },
    { id: 'i8', kind: 'fund',   agent: 'OPTIMIZE',   title: 'Subaward consolidation opportunity', body: 'Three active grants share State A&M subrecipient. Consolidating invoicing would reduce admin overhead 14 hrs/quarter.', grantId: null, severity: 'LOW' },
    { id: 'i9', kind: 'indigo', agent: 'COMPLIANCE', title: 'NIH Public Access Policy — 1 publication non-compliant', body: 'Manuscript published in Cybersecurity Research Letters not deposited to PMC. The 90-day deposit window closes in 19 days.', grantId: '3', severity: 'MEDIUM' },
  ];

  // ── Compliance — single source of truth ──────────────────────────────────
  // ONE dataset feeds three views so the numbers can never diverge:
  //   • Compliance screen   → the framework table + portfolio Donut + findings
  //   • Dashboard posture    → the SAME portfolio composite (score / X-of-Y / findings)
  //   • Grant-detail tab     → that grant's SUBSET of rules (scoped, derived here)
  // The dashboard and Compliance screen show the PORTFOLIO composite; the
  // grant-detail tab shows a single grant's slice of the same rule universe.
  // Initial derivation from the seed findings; the store re-derives live via
  // buildCompliance(state.findings) as findings are resolved.
  const compliance = buildCompliance(INITIAL_FINDINGS);

  const agencyBreakdown = (() => {
    const m = new Map();
    grants.forEach(g => {
      if (!m.has(g.agencyShort)) m.set(g.agencyShort, { agency: g.agencyShort, count: 0, budget: 0 });
      const e = m.get(g.agencyShort);
      e.count++; e.budget += g.budget;
    });
    return Array.from(m.values()).sort((a,b) => b.budget - a.budget);
  })();

  return { users, grants, tasks, documents, reallocations, filings, monthly, insights, agencyBreakdown, compliance };
})();

export { DATA };
