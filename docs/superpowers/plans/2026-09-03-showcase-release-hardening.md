# Grant Tracker Showcase Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the Grant Tracker demo exactly while making its existing checks, sweeps, naming, metadata, accessibility, and CI one enforceable release contract.

**Architecture:** Keep all product code and current sweep implementations intact. Add static release-contract tests, a Vite-API runner that serves the local candidate build and supplies its explicit URL to each sweep, and a single package command used identically by local developers and GitHub Actions.

**Tech Stack:** React 18, Vite 5, Node test runner, Playwright, axe-core, GitHub Actions

---

### Task 1: Lock the Grant Tracker identity and release contract

**Files:**
- Create: `tests/release-contract.test.mjs`
- Modify: `package.json`

- [ ] Add a Node test requiring `Grant Tracker` in package metadata and HTML title/Open Graph metadata, the intentional `noindex`, the absolute Open Graph image and dimensions, and Twitter large-card metadata.
- [ ] Run `node --test tests/release-contract.test.mjs`; expect green because it characterizes the existing identity and metadata.
- [ ] Add explicit `test:sweep:mobile`, `test:sweep:viewport`, and `test:sweep:whiteglove` package scripts without changing the showcase name.
- [ ] Commit the name and metadata guard plus individual sweep scripts.

### Task 2: Run all sweeps against the candidate build

**Files:**
- Create: `scripts/run-release-sweeps.mjs`
- Create: `tests/release-runner.test.mjs`
- Modify: `package.json`

- [ ] Add unit tests for a `runReleaseSweeps` function that require `http://127.0.0.1:3310` injection, the mobile → viewport → white-glove order, child-failure propagation, and preview-server cleanup on both success and failure.
- [ ] Run `node --test tests/release-runner.test.mjs`; confirm RED because the runner module does not exist.
- [ ] Implement the minimal testable runner using Vite's preview API: bind `127.0.0.1:3310` with `strictPort`, spawn each sweep sequentially with `BASE_URL` set to that local server, propagate failures, and always close the server.
- [ ] Rerun `node --test tests/release-runner.test.mjs`; expect green.
- [ ] Extend the release-contract test to require the individual sweep scripts, `test:sweeps`, and `test:release`; confirm RED before adding the aggregate scripts.
- [ ] Add `test:sweeps` and `test:release` scripts; the latter runs build, unit, E2E, then local-candidate sweeps.
- [ ] Run the release-contract test; expect green.
- [ ] Run `npm run build` followed by `npm run test:sweeps`; expect all three sweeps to pass against the local candidate.
- [ ] Commit the runner and release scripts.

### Task 3: Add accessibility coverage

**Files:**
- Create: `e2e/accessibility.spec.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify only if axe finds a real defect: the smallest affected UI source/style file

- [ ] Install `@axe-core/playwright` as a locked dev dependency.
- [ ] Add axe WCAG A/AA checks for the marketing landing, desktop application shell, and phone shell.
- [ ] Run the accessibility test; if it finds a violation, fix only that verified defect and rerun until green.
- [ ] Run all 37 pre-existing E2E tests plus the new accessibility checks.
- [ ] Commit accessibility coverage and any minimal verified fix.

### Task 4: Add CI and verify the complete release

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] Add a GitHub Actions workflow using `npm ci`, Chromium installation, and `npm run test:release`.
- [ ] Run `npm run test:release`; expect the production build, 22 existing unit tests, all existing and new browser tests, and all three local-candidate sweeps to pass.
- [ ] Confirm source and metadata still say `Grant Tracker`; do not introduce `Grant Command Center` into the demo.
- [ ] Verify `git status --short` contains only intended source, test, config, lockfile, and documentation changes.
- [ ] Commit the CI gate.
