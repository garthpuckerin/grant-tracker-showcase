// First-run onboarding — DOMAIN ORIENTATION, not a settings wizard.
//
// Most visitors have never administered a federal award. Four short steps:
//   1. Who you are  — pick a role (the signature first-run choice; it sets the
//                     acting identity that drives the RBAC story).
//   2. What an award is — period of performance, award vs expended vs
//                     unobligated, budget categories incl. F&A, on the REAL
//                     grant #1 figures, with a glossary.
//   3. The two things you'll do — reallocation approval + the SF-425, each with
//                     a "Show me" that finishes the tour and deep-links.
//   4. Done.
// Escape or Skip = done. Replayable from sign-out and from Help → Replay tour.
import React from 'react';
import { DATA } from './data.js';
import { fmt, Icon } from './atoms.jsx';
import { setCurrentUser, useCurrentUser } from './store.js';
import { ROLE_LABEL } from './rbac.js';

const ROLE_CARDS = [
  { id: 'u2', role: 'PI', title: 'Principal Investigator', icon: 'user',
    what: 'You lead the award. Watch your budget burn, request reallocations between categories, keep reporting on schedule.',
    cant: 'You can’t approve your own transfers or certify federal reports — separation of duties.' },
  { id: 'u1', role: 'ADMIN', title: 'Grants Administrator', icon: 'settings',
    what: 'You run the portfolio. Create awards, manage members, see every grant, and step in anywhere.',
    cant: 'Even admins can’t approve a request they submitted themselves.' },
  { id: 'u5', role: 'FINANCE', title: 'Finance / Sponsored Programs', icon: 'shield',
    what: 'You are the authorized official. Approve reallocations, certify and submit SF-425 reports, own compliance.',
    cant: 'You review transfers — you don’t originate them on a PI’s award.' },
];

const GLOSSARY = [
  ['PI', 'Principal Investigator — the researcher responsible for the award.'],
  ['Period of performance', 'The dates during which costs may be charged to the award.'],
  ['Award · Expended · Unobligated', 'What was authorized, what has been spent, and what remains uncommitted.'],
  ['Encumbrance', 'Money committed (a purchase order, a hire) but not yet spent.'],
  ['F&A / indirect', 'Facilities & administrative overhead, charged at a negotiated rate (here 47.5% of MTDC).'],
  ['Cost-share', 'The institution’s own contribution the sponsor requires alongside federal funds.'],
  ['2 CFR 200', 'The federal Uniform Guidance — the rulebook for spending and reporting grant money.'],
  ['SF-425', 'The Federal Financial Report — the form that tells the sponsor where the money went.'],
  ['SAM.gov', 'The federal registration every recipient must keep active to draw funds.'],
];

const STEPS = ['Your role', 'What an award is', 'What you’ll do', 'Ready'];

export const Onboarding = ({ onFinish }) => {
  const user = useCurrentUser();
  const [step, setStep] = React.useState(0);
  const g = DATA.grants[0];
  const unobligated = g.budget - g.spent;

  // Escape skips the tour (counts as done).
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onFinish(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="landing onboarding" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <header className="landing-top">
        <div className="landing-brand">
          <span className="mark">G</span>
          <span className="word">Grant Tracker</span>
          <span className="ver">v2.0</span>
        </div>
        <div className="landing-top-actions">
          <button className="btn-link" onClick={() => onFinish()} aria-label="Skip the tour">Skip tour · Esc</button>
        </div>
      </header>

      <main className="landing-main onb-main">
        <div className="onb-card">
          {/* Progress */}
          <ol className="onb-steps" aria-label="Tour progress">
            {STEPS.map((label, i) => (
              <li key={label} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
                <span className="onb-dot">{i < step ? '✓' : i + 1}</span>
                <span className="onb-step-label">{label}</span>
              </li>
            ))}
          </ol>

          {step === 0 && (
            <section>
              <p className="eyebrow">Step 1 of 4 · Who you are</p>
              <h1 className="serif onb-title">Pick how you’ll use the cockpit.</h1>
              <p className="lede onb-lede">Grant management is a team sport with strict separation of duties. Your role decides what you can see and what you can approve. You can switch roles any time from the sidebar.</p>
              <div className="onb-roles" role="radiogroup" aria-label="Choose a role">
                {ROLE_CARDS.map((r) => {
                  const on = user.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`onb-role ${on ? 'on' : ''}`}
                      onClick={() => setCurrentUser(r.id)}
                    >
                      <span className="onb-role-icon"><Icon name={r.icon} size={16} /></span>
                      <span className="onb-role-title">{r.title}</span>
                      <span className="onb-role-what">{r.what}</span>
                      <span className="onb-role-cant mono">{r.cant}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mono onb-note">Viewing as <strong>{user.name}</strong> · {ROLE_LABEL[user.role]}</p>
            </section>
          )}

          {step === 1 && (
            <section>
              <p className="eyebrow">Step 2 of 4 · What an award is</p>
              <h1 className="serif onb-title">One award, read the way a grants office reads it.</h1>
              <p className="lede onb-lede">This is a real award in the demo — <em>{g.title}</em>, a {g.totalYears}-year {g.agencyShort} award now in year {g.year}.</p>
              <div className="onb-figures">
                <div><span className="kicker">Total award</span><span className="serif onb-fig">{fmt.money(g.budget, { compact: true })}</span><span className="muted">authorized over {g.totalYears} years</span></div>
                <div><span className="kicker">Expended</span><span className="serif onb-fig">{fmt.money(g.spent, { compact: true })}</span><span className="muted">{fmt.pct(g.pct, 0)} of the award, to date</span></div>
                <div><span className="kicker">Unobligated</span><span className="serif onb-fig">{fmt.money(unobligated, { compact: true })}</span><span className="muted">not yet committed</span></div>
              </div>
              <p className="onb-body">Money is authorized <strong>by category</strong> — personnel, equipment, supplies, travel, and F&amp;A (indirect). It can’t move between categories without <strong>prior approval</strong>, and every dollar must reconcile to the federal report. That is the whole job.</p>
              <dl className="onb-glossary">
                {GLOSSARY.map(([term, def]) => (
                  <div key={term}><dt className="mono">{term}</dt><dd>{def}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {step === 2 && (
            <section>
              <p className="eyebrow">Step 3 of 4 · What you’ll do</p>
              <h1 className="serif onb-title">Two workflows carry the whole demo.</h1>
              <div className="onb-flows">
                <article className="onb-flow" style={{ borderLeftColor: 'var(--accent)' }}>
                  <h2 className="onb-flow-title">Reallocation approval</h2>
                  <p>A PI asks to move funds between budget categories. Finance approves under <span className="mono">2 CFR 200.308</span>. The budget re-derives the moment it’s approved — and the wrong role sees a real permission-denied state.</p>
                  <button className="btn accent" onClick={() => onFinish({ name: 'grant', id: g.id, grant: g, tab: 'budget' })}>Show me <Icon name="arrowR" size={12} /></button>
                </article>
                <article className="onb-flow" style={{ borderLeftColor: 'var(--indigo)' }}>
                  <h2 className="onb-flow-title">The SF-425 federal report</h2>
                  <p>The Federal Financial Report, line by line (10a–10o). Every figure derives from the award’s ledger, and a validator proves it <strong>cross-foots</strong> before an authorized official can certify it.</p>
                  <button className="btn" onClick={() => onFinish({ name: 'sf425detail', filingId: 'sf1', gi: 0, period: 'FY25 ANNUAL', type: 'Annual', status: 'IN_PROGRESS', due: DATA.filings[0].due })}>Show me <Icon name="arrowR" size={12} /></button>
                </article>
              </div>
              <p className="muted onb-body">Everything else — compliance findings, tasks, documents, reports, members — works end to end on mock data too. Nothing here touches a real award.</p>
            </section>
          )}

          {step === 3 && (
            <section>
              <p className="eyebrow">Step 4 of 4 · Ready</p>
              <h1 className="serif onb-title">You’re set, {user.name.split(' ').slice(-1)[0]}.</h1>
              <p className="lede onb-lede">You’ll land on the portfolio overview as <strong>{ROLE_LABEL[user.role]}</strong>. Switch roles from the sidebar to see how the cockpit changes, and replay this tour any time from Help.</p>
              <div className="onb-cta-row">
                <button className="btn accent landing-cta" onClick={() => onFinish({ name: 'dashboard' })}>Open the cockpit <span className="ic"><Icon name="arrowR" size={12} /></span></button>
              </div>
            </section>
          )}

          <footer className="onb-nav">
            <button className="btn ghost" onClick={back} disabled={step === 0}><Icon name="arrowL" size={12} /> Back</button>
            <span className="mono onb-count">{step + 1} / {STEPS.length}</span>
            {step < STEPS.length - 1
              ? <button className="btn accent" onClick={next}>Next <Icon name="arrowR" size={12} /></button>
              : <span />}
          </footer>
        </div>
      </main>

      <footer className="landing-foot">
        <span>Grant Tracker — welcome tour</span>
        <span>Portfolio demo · mock data</span>
      </footer>
    </div>
  );
};

export default Onboarding;
