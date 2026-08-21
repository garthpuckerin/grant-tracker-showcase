// Marketing hero landing — shown before the app (not a sign-in gate).
// Built in Grant Tracker's editorial fiscal idiom: serif display headline,
// mono kickers/eyebrows, hairline rules, oklch tokens, value-color accents.
// "Launch demo" enters the app; respects the theme system (theme.js).
import React from 'react';
import { Icon } from './atoms.jsx';
import { getTheme, setTheme, THEMES } from './theme.js';

// Cycle button mirrors the in-app ThemeToggle so the landing themes too.
const THEME_META = {
  light: { icon: 'sun',  label: 'Light' },
  beige: { icon: 'star', label: 'Beige' },
  dark:  { icon: 'moon', label: 'Dark' },
};

const LandingThemeToggle = () => {
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

// Feature highlights — drawn from the case-study body, sanitized and
// vendor-agnostic. Each maps to a value-color token for the rule + icon.
const FEATURES = [
  {
    icon: 'chart',
    tone: 'fund',
    title: 'Value-driven portfolio analytics',
    body: 'Expenditure bars, utilization meters, and burn-rate donuts color themselves by value — green when healthy, amber on the watch line, red over threshold.',
  },
  {
    icon: 'shield',
    tone: 'accent',
    title: 'RBAC-scoped command center',
    body: 'Admin, principal investigator, and finance each see a scoped view of the same multi-year award — grants, category budgets, and compliance in one place.',
  },
  {
    icon: 'flag',
    tone: 'indigo',
    title: 'SF-425 federal reporting',
    body: 'Prepare and review SF-425 federal financial reports, with an open-findings compliance view tied to 2 CFR 200, SAM.gov, and cost-share rules.',
  },
  {
    icon: 'check',
    tone: 'alert',
    title: 'Validated workflows',
    body: 'Create grants, tasks, and budget line items through forms that mirror the production rules — required fields, format and range checks, cross-field constraints.',
  },
];

const toneVar = (tone) => `var(--${tone})`;

export const Landing = ({ onEnter }) => (
  <div className="landing">
    <header className="landing-top">
      <div className="landing-brand">
        <span className="mark">G</span>
        <span className="word">Grant Tracker</span>
        <span className="ver">v2.0</span>
      </div>
      <div className="landing-top-actions">
        <span className="kicker landing-mock-note">Mock data · no real awards</span>
        <LandingThemeToggle />
      </div>
    </header>

    <main className="landing-main">
      <section className="landing-hero">
        <p className="eyebrow landing-eyebrow">Portfolio demo · mock data</p>
        <h1 className="serif landing-headline">
          The cockpit for multi-year federal grants.
        </h1>
        <p className="lede landing-lede">
          A role-based command center for managing federally funded awards through
          their full lifecycle — bringing multi-year grants, category budgets,
          spend, compliance, and federal reporting into one coordinated view for the
          people who live inside a grant.
        </p>
        <div className="landing-cta-row">
          <button className="btn accent landing-cta" onClick={onEnter}>
            Launch demo
            <span className="ic"><Icon name="arrowR" size={12} /></span>
          </button>
          <span className="landing-cta-note mono">Cockpit, not the engine.</span>
        </div>
      </section>

      <section className="landing-features" aria-label="Product highlights">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="landing-feature"
            style={{ borderLeftColor: toneVar(f.tone) }}
          >
            <span className="landing-feature-icon" style={{ color: toneVar(f.tone) }}>
              <Icon name={f.icon} size={16} />
            </span>
            <h2 className="landing-feature-title">{f.title}</h2>
            <p className="landing-feature-body">{f.body}</p>
          </article>
        ))}
      </section>
    </main>

    <footer className="landing-foot">
      <span>Grant Tracker — Editorial fiscal demo</span>
      <span>Sanitized · fixtures only</span>
    </footer>
  </div>
);

export default Landing;
