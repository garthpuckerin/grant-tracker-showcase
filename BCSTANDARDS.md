# BCSTANDARDS — grant-tracker-showcase

> AI agents: read this before writing code. This is the AI Context Contract for
> this repo. It is written to be safe if this repo is public (it becomes public
> at the reveal) — keep it that way: no other project's embargoed names, no
> secrets, no engine internals, no private absolute paths.

## What this repo is

- A **curated public showcase** of the Grant Tracker **cockpit** — the frontend
  command-center, not the engine. Mock fixtures only; no backend, no network, no
  secrets. See `README.md` (§"What's real vs. illustrative") for the exact
  cockpit-vs-engine boundary; the production engine (auth, RBAC, persistence,
  federal-reporting integrations) is a separate **private** codebase and must
  never be described or referenced here beyond that honest boundary table.
- This repo is the **canonical dev home** for the Grant Tracker cockpit frontend
  going forward (owner decision, 2026-08-20). The monorepo copy at
  `portofolio-hub/apps/grant-tracker` is redundant but not yet retired
  (retirement is deferred until demo↔prod reconciliation is verified). Make
  cockpit frontend edits **here**.

## Governance

- Authority: **Blurred Concepts Engineering Constitution v2.0** —
  `github.com/garthpuckerin/blurred-concepts-engineering`.
- Precedence (Constitution §1): direct owner instruction → this `BCSTANDARDS.md`
  → Constitution → topic standards → supporting docs.
- **Product class (Product Class Standard):** `P` — seeded 2026-09-05 by heuristic (no multi-tenant, regulated or billing language in README); confirm or raise, never lower.
## Code Comprehension (Comprehension Ladder Standard)
<!-- bcstd:managed comprehension v1 -->
- Graph repo_id: `github.com/garthpuckerin/grant-tracker-showcase`
- This repo is **new and not yet ingested** into the code-graph. Until it is,
  raw `Read`/`Grep` are the correct tools here; once ingested, query the ladder
  (`map` / `find` / `explain` / `neighbors` / `read`) with the repo_id above
  before raw reads for structure/behaviour/relationship questions. Note: this is
  a React app — the graph does not model JSX render edges, so grep for "what
  renders X" regardless.
<!-- /bcstd:managed -->

## Git & Release

- **Branch model (alternate, documented per the Git & Release Standard):** this
  repo does not use short-lived `feat/*`/`fix/*` branches. It is solo-maintained
  (owner + AI pair); commits land directly on **`main`**, which is the Vercel
  production branch — **push to `main` auto-deploys** the live demo once the
  git-integrated Vercel project is connected.
- **Verify before pushing:** `npm run build` (clean), `npm run test:unit`
  (RBAC permission matrix), and `npm run test:e2e` (fixtures-only smoke, zero
  console/page/network errors) must pass. The e2e error assertions are strict by
  design — a failed request or console error is a real defect, never weaken them.
- Tags: not adopted here; don't tag unilaterally.

## Publish / spoiler discipline (reveal-season)

- **Private until the reveal.** This repo is created **private** and flips to
  **public at the Grant Tracker reveal (Thu Aug 27 2026, 16:00 UTC)** —
  owner-only action: `gh repo edit garthpuckerin/grant-tracker-showcase
  --visibility public --accept-visibility-change-consequences`.
- **noindex is kept** at reveal (owner decision, 2026-08-20): the deployed demo
  carries `<meta name="robots" content="noindex">`; SEO/GEO lives on the hub
  (`garthpuckerin.com`), which links to this demo. Do not remove the noindex tag.
- **Sanitized-only.** Never add engine internals, secrets, real PII, or any other
  reveal-season project's embargoed name/content. Vercel serves only `dist/`, so
  repo-root docs are not served by the live site — but this repo is public after
  the reveal, so treat every committed file as public.

## Institutional Memory
<!-- bcstd:managed memory v1 -->
- The comprehension and memory habits are active client bindings, not passive
  repository guidance. Each client must use the highest enforcement tier it
  supports under the Comprehension Ladder Standard.
- Recall Ogham with `hybrid_search` when starting work on a system that may
  have prior context. Before ending, store decisions with rationale, gotchas,
  and cross-session operational context with source, controlled tags, and a
  deliberate TTL. Never store secrets or code-structure facts.
- Canonical memory policy: `standards/Memory_Standard.md` in
  blurred-concepts-engineering — it governs on any conflict.
<!-- /bcstd:managed -->
