# Grant Tracker Showcase Release Hardening Design

## Objective

Turn Grant Tracker's existing successful checks into an enforced release contract without changing its UI, behavior, fixtures, or showcase name.

## Scope

- Preserve **Grant Tracker** as the demo's canonical visible and metadata identity.
- Add an automated regression test that fails if the showcase is renamed.
- Expose the existing mobile, viewport, and white-glove sweeps as explicit package scripts.
- Add a single release command that runs the production build, unit tests, browser tests, and the three sweeps.
- Add CI enforcement for the release command.
- Add automated accessibility and metadata checks to existing browser coverage.

## Non-goals

- Do not rename the demo to Grant Command Center.
- Do not rename the repository, deployment URL, case-study URL, or source directories.
- Do not change the intentional `noindex` posture.
- Do not alter the demo-led approval or SF-425 workflows or claim that they already exist in the private engine.
- Do not introduce screenshot-baseline testing or major dependency upgrades.

## Design

Existing product behavior remains the source of truth. Release hardening is additive: package scripts bind the already-present sweep programs into one deterministic `test:release` command, while static metadata assertions and browser accessibility assertions protect the public landing and application shell.

The sweep scripts will continue using their current implementations and exit semantics, but the release gate must never default to the deployed Vercel site. A release runner will start the candidate build locally, wait for it to become ready, pass its explicit local `BASE_URL` to all three sweeps, and always stop the server on success or failure. GitHub Actions will install from the lockfile, install Chromium, and run the same release command used locally so CI and developer verification cannot diverge.

## Acceptance criteria

- The current 22 unit tests and 37 Playwright tests remain green.
- A naming regression test demonstrably fails for any non-Grant-Tracker identity.
- Accessibility and metadata assertions pass on the covered public surfaces.
- Each existing sweep is invocable through `npm run` and is included in the release gate against the locally built candidate, never an earlier deployment.
- The production build and complete release command succeed.
- The working tree contains no generated test or build artifacts.
