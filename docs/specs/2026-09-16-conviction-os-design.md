# Holdfast — Conviction OS Design

**Status:** Design / brainstorm output — 2026-09-16
**Supersedes framing of:** `docs/specs/2026-09-16-holdfast-design.md` (cost-basis MVP). This repositions Holdfast from a cost-basis tool into a three-pillar Conviction OS. The existing engine and program are reused, not discarded.

## Overview

Holdfast answers one question a conviction investor cannot answer honestly on their own: **should I still believe in this position?**

Most tools tell you *what you own*. Holdfast tells you *whether you should still believe in it* — and holds you to the answer. It runs one loop over three pillars:

1. **Truth** — reconstruct your real cross-wallet cost basis from raw on-chain history, surfacing the acquisition legs single-wallet trackers hide as "free."
2. **Thesis health** — continuously stress-test the *reason you hold* against on-chain reality (holder concentration, whale flow, liquidity), and return a transparent verdict: **INTACT / CRACKING / BROKEN**. *This is the centerpiece.*
3. **Discipline** — commit your line on-chain; a real break is recorded permanently. Conviction becomes something the chain can hold you to.

The scar it answers: selling blind in a panic, with no honest real-time read on whether the thesis was actually broken or just noisy.

## Goals

- Ship a demoable, end-to-end Conviction OS loop on **real mainnet data** for a **public token** (clean-room; never a personal position).
- Make Pillar 2 (thesis health) genuinely differentiated and legible — every verdict shows its inputs; no black box.
- Reuse the shipped engine (Pillar 1) and program (Pillar 3) intact.
- Keep the shipped cost-basis MVP as a guaranteed fallback submission on `main` / `build/holdfast`.

## Non-Goals (MVP cuts)

- **Treasury/dev dormancy signal** — deferred. Requires per-token wallet labeling, which generalizes poorly. Named in the vision, not built.
- **Multi-token portfolio view** — one token per session.
- **Mainnet program deploy** — anchoring stays on devnet (immutability without rent cost).
- **Historical self-indexing** — time-series comes from Dune, not a self-built snapshot store.

## Architecture

Monorepo, three pieces (two reused):

```
packages/engine/     Pillar 1 (Truth) — REUSED as-is
  src/thesis.ts      Pillar 2 (Thesis health) — NEW
programs/holdfast/   Pillar 3 (Discipline) — REUSED as-is
app/                 shell + new ThesisPanel + verdict badge
server/              NEW thin endpoint holding the Dune API key server-side
```

**Data sources (hybrid):**
- **RPC** — basis reconstruction (`buildReport`, existing) and on-chain anchoring. Reads current chain state and full tx history.
- **Dune Analytics** — thesis-health time-series (concentration, whale flow, liquidity over a window). SQL-defined, judge-legible, instant historical depth. Accessed **server-side only** — the Dune API key never reaches the browser (per privacy/security rules: key in env var, never in code).

**Data flow (one loop):**
```
paste wallets + token mint
  → RPC: buildReport()            → BasisReport   (Pillar 1)
  → server /api/thesis            → ThesisReport  (Pillar 2)
  → verdict badge INTACT/CRACKING/BROKEN
  → connect wallet: anchorConviction / renew / recordBreak  (Pillar 3)
```

## Pillar 1 — Truth (reused)

No changes. `packages/engine` `buildReport({ rpcUrl, targetMint, wallets })` returns the existing `BasisReport` (`types.ts`), including `misattributedLegs` (the externally-funded legs trackers get wrong) and `basisHash`. UI: existing `BasisReportView` + `LegDiffView`.

## Pillar 2 — Thesis health (new build — all risk lives here)

### New types (`packages/engine/src/thesis.ts`)

```ts
export type ThesisVerdict = 'INTACT' | 'CRACKING' | 'BROKEN'
export type SignalStatus = 'ok' | 'warn' | 'alarm'

export interface ThesisSignal {
  key: 'concentration' | 'whale_flow' | 'liquidity'
  label: string
  value: number       // current metric
  baseline: number    // metric `windowDays` ago
  changePct: number    // (value - baseline) / baseline
  status: SignalStatus
  note: string        // plain-language read for the UI
}

export interface ThesisReport {
  targetMint: string
  windowDays: number
  signals: ThesisSignal[]
  verdict: ThesisVerdict
  asOf: number        // unix seconds
}
```

### Signals (core = concentration + whale_flow; stretch = liquidity)

1. **Concentration shift** — top-N holder share of circulating supply now vs `windowDays` ago, **excluding known AMM/pool accounts**. Rising non-AMM concentration = accumulation (thesis support); falling = distribution (thesis risk).
2. **Whale net-flow** — net token flow of large holders over the window. Net-dumping = alarm; net-adding = ok. Same top-holder primitive as (1).
3. **Liquidity / pool depth** (stretch) — DEX pool depth now vs window-ago. Also serves as the **noise filter**: a holder-share drop that coincides with pool-inventory *increase* is tokens moving into an AMM, not an exit — the verdict downgrades that alarm to noise. (This is the exact trap that misreads AMM inventory as a distributing whale.)

### Verdict engine (transparent, deterministic)

Each signal maps to a status via documented thresholds (e.g. concentration/whale change: `|Δ| < 5%` ok, `5–15%` warn, `> 15%` in the bearish direction alarm). Verdict folds statuses by a fixed, shown rule:

- `INTACT` — 0 alarms and ≤1 warn
- `CRACKING` — exactly 1 alarm, or ≥2 warns
- `BROKEN` — ≥2 alarms

The noise filter runs before folding: a liquidity-explained concentration drop is demoted one level. The UI renders every signal's `value`, `baseline`, `changePct`, and `note` alongside the verdict — the reasoning is always visible.

### Dune integration (server-side)

- `server/` exposes `GET /api/thesis?mint=<mint>&windowDays=<n>` → `ThesisReport`.
- The endpoint runs parameterized Dune queries (one per signal), holds the Dune API key in an env var, and maps raw rows → `ThesisSignal[]`, then calls the pure verdict function from `thesis.ts`.
- The verdict logic and row→signal mapping live in `thesis.ts` (pure, unit-testable); the server is a thin transport + key holder.

## Pillar 3 — Discipline (reused)

No program changes for MVP. Existing `anchor_conviction` / `renew` / `record_break` on the live devnet program (`7e4UKQSRh5zLvLefMWc25TRepwAsuYfVi8E8sk1CzhuN`). The `line` and `basis_hash` come from `BasisReport` as today. (A future `thesis_snapshot_hash` field is deferred.)

UI: existing `AnchorPanel`, rendered after the thesis verdict so the loop reads Truth → Thesis → Commit.

## Error handling

- **RPC failures / rate limits** — surface the partial `BasisReport` with a visible "history truncated" flag rather than failing silently (existing behavior).
- **Dune query failure / timeout** — the affected signal renders `status: 'warn'` with `note: "signal unavailable"`, never a fabricated value; the verdict is computed from available signals and labels itself "partial." Honesty over false precision — same principle as Pillar 1's `priceConfidence: 'none'`.
- **Unknown/illiquid token** — if no top-holder or pool data exists, return an empty `ThesisReport` with a clear "insufficient on-chain data for this token" message.

## Testing

- **Pure verdict engine** — unit tests over hand-built `ThesisSignal[]` fixtures covering each verdict boundary and the liquidity noise-filter demotion. Deterministic, no network.
- **Row→signal mapping** — unit tests over recorded Dune result fixtures (JSON), no live Dune in the test path.
- **Pillar 1** — existing engine tests unchanged (11 passing).
- **Manual** — end-to-end demo run on a public token (e.g. BONK/JUP) against mainnet RPC + live Dune, then anchor on devnet.

## Privacy firewall

Clean-room throughout. The demo runs on a public token and public wallets; no personal position, wallet, basis, or personal watcher internals enter the repo, the UI, or any artifact. Dune API key server-side only, in an env var.

## Risks & fallback

- **Pillar 2 is the whole risk.** If Dune integration or the server endpoint slips: fall back to running the Dune queries via the Dune MCP in dev and shipping cached result fixtures for the demo — still live-shaped, less real-time.
- **Ultimate fallback:** if Pillar 2 does not land at all, ship Pillars 1+3 (already built) — still a stronger, sharper product than the current cost-basis-only MVP. The shipped MVP on `main` guarantees a submission regardless.
- **Three-week solo scope** is real. Build order enforces it: concentration + whale_flow first (one build, shared primitive), liquidity filter second, everything else deferred.

## Build order

1. `thesis.ts` types + pure verdict engine + tests (no network).
2. Dune queries for concentration + whale_flow; `server/api/thesis` endpoint; row→signal mapping + tests.
3. App: `ThesisPanel` + verdict badge, woven into the loop.
4. Liquidity signal + noise filter (stretch).
5. Demo pass on a public token end-to-end.
