# Issues — grant-tracker-showcase

> Routing rule (Work Item Routing Standard): this file is the home for anything
> **broken, wrong, missing, or knowingly deferred**. Ideas go to
> `FEATURES-BACKLOG.md`, sequenced commitments to `ROADMAP.md`, decisions with
> rationale to `DECISIONS.md`. Every entry carries evidence (or says it is
> undiagnosed) and says whether it is user-visible.

## Open

Filed 2026-10-20 from the mobile companion benchmark
(`portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md`, measured 2026-09-21; raw
probes in the untracked `media/benchmark/`), with the source-level claims
re-checked against `main` @ `711a17e` on 2026-10-20. Not re-measured against
the live deployment. The benchmark ranks this repo's mobile gap the largest of
the five (cleanup order: second, after Ops). The `grant-tracker-mobile-cleanup`
task scheduled for 2026-10-02 left no commits on `main` or `origin/develop`
(none since 2026-09-17); open PRs not checked.

### ISSUE-001 · There is no phone surface: the desktop Sidebar and Topbar mount at every width
- **Severity:** medium · **Status:** open · **Visible:** yes
- **Evidence:** `src/app.jsx:205-215` mounts `Sidebar`, `Topbar` and `MobileTabBar` together at every width; CSS hides what does not fit. Benchmark first-screen captures show the serif page title filling the phone's first screen on detail and the budget workflow, with the data below the fold.
- **Next action:** a separate companion shell below the workstation breakpoint with the desktop chrome not mounted, a triage home, and a story-style detail (template items 1, 6, 8).

### ISSUE-002 · Tablets get the desktop; ledgers overflow sideways
- **Severity:** medium · **Status:** open · **Visible:** yes, 768–1023px
- **Evidence:** benchmark: 50-74 elements overflow on tablet portrait and `cardify` (`src/cardify.js`) only fires at ≤767px; 43 of 44 targets under 44px on tablet landscape.
- **Next action:** a designed tablet tier; extend card-ification to the tablet range or fold the columns.

### ISSUE-003 · 30-51 touch targets under 44px on every phone screen
- **Severity:** medium · **Status:** open · **Visible:** yes
- **Evidence:** `media/benchmark/results.json`, authoring screen phone portrait: 6 of 37 small (skip-link 154×35, sidebar sign-out 28×28, 312×36 inputs); other screens worse. The phone home runs 7.3 viewports.
- **Next action:** raise the floor to 44×44, width and height, in the phone tier.

### ISSUE-004 · The landscape icon rail is an inner vertical scroller
- **Severity:** low · **Status:** open · **Visible:** yes
- **Evidence:** `results.json` phone-landscape lists `aside.sidebar` under `innerVerticalScrollers` (also in portrait). Template item 17: the document is the only vertical scroller.
- **Next action:** replaced by the side-rail tab bar once ISSUE-001 lands.

### ISSUE-005 · Routes are not linkable and there is no full desktop view
- **Severity:** low-medium · **Status:** open · **Visible:** yes
- **Evidence:** the route persists only in `localStorage['gt2-route']` (`src/app.jsx:130,135`); no URL addresses a record. No "open the desktop layout" exists on a phone.
- **Next action:** URL-addressable routes; a real scaled desktop view with a visible way back (Janus `viewportContentFor`).

### ISSUE-006 · The mobile sweep cannot fail a squeezed desktop
- **Severity:** medium · **Status:** open (latent) · **Visible:** no
- **Evidence:** `scripts/mobile-sweep.mjs` checks nested scrollers, grid columns, tab-bar collisions and sideways scroll. It has no "desktop chrome absent", content-position, 44px floor or desk-only check and no `--self-test` (none found in the file 2026-10-20), so a collapsed desktop passes it.
- **Next action:** add those checks plus `--self-test` from `janus-showcase/scripts/mobile-sweep.mjs`; record the failing baseline before ISSUE-001 work.

### ISSUE-007 · `src/index.css` is a 2,402-line monolith
- **Severity:** low · **Status:** open (deferred, do after the mobile work) · **Visible:** no
- **Evidence:** `wc -l` 2026-10-20. A spliced comment banner once swallowed a whole phone tier here (08-27).
- **Next action:** split per the Janus layout as a pure move, with an orphan-class gate and a parsed-CSS before/after diff first.

## Closed
