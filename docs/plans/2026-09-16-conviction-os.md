# Holdfast — Conviction OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Holdfast into a three-pillar Conviction OS by adding a thesis-health pillar (concentration + whale-flow, liquidity stretch) that returns a transparent INTACT/CRACKING/BROKEN verdict, woven between the existing basis engine and the on-chain anchor.

**Architecture:** Reuse `packages/engine` (Pillar 1 Truth) and `programs/holdfast` (Pillar 3 Discipline) unchanged. Add pure thesis logic in `packages/engine/src/thesis.ts`, a thin `server/` endpoint that holds the Dune API key server-side and feeds the pure logic, and a `ThesisPanel` in the app. Data is hybrid: RPC for basis + anchoring, Dune for thesis time-series.

**Tech Stack:** TypeScript, vitest, Solana web3.js, Anchor (existing program), React + Vite + wallet-adapter, Express (new thin server), Dune Analytics REST API.

**Spec:** `docs/specs/2026-09-16-conviction-os-design.md`

## Global Constraints

- **Toolchain:** `source scripts/env.sh` before EVERY node/pnpm/vitest command — the default PATH points at a different bundled node.
- **Privacy firewall:** clean-room. No real position, wallet, basis, or personal watcher internals in code, tests, fixtures, UI, or commits. The demo uses a public token (BONK `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`).
- **Secrets:** the Dune API key lives in env var `DUNE_API_KEY`, never in code or committed files. `.env` is gitignored.
- **Git identity (this repo):** commits author as `pmjlaw <88074488+pmjlaw@users.noreply.github.com>` (repo-local config already set). Verify before first commit.
- **Commit attribution:** end every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Honesty over false precision:** an unavailable signal renders `status: 'warn'` with note "unavailable" — never a fabricated value. Same principle as Pillar 1's `priceConfidence: 'none'`.
- **Reuse, don't rewrite:** do not modify `packages/engine` Pillar-1 files (`tracer.ts`, `pricing.ts`, `report.ts`, `reconcile.ts`, `live.ts`, `types.ts`) or the Anchor program. Add only.
- **Tests:** vitest, TDD, tests in `packages/engine/test/`.

---

## File Structure

- `packages/engine/src/thesis.ts` (new) — pure thesis-health types + signal classification + verdict fold + report assembly. No network.
- `packages/engine/src/index.ts` (modify) — export `./thesis`.
- `packages/engine/test/thesis.test.ts` (new) — unit tests for classification, verdict boundaries, noise filter.
- `server/package.json`, `server/src/index.ts` (new) — Express endpoint `GET /api/thesis`, holds `DUNE_API_KEY`, executes Dune queries, maps rows → metrics → `assembleThesisReport`.
- `server/src/dune.ts` (new) — Dune REST client (execute-by-id / latest-results) + row→metric mapping.
- `server/test/dune.test.ts` (new) — row→metric mapping over recorded JSON fixtures (no live Dune).
- `server/dune-queries.json` (new) — recorded Dune query IDs + documented row shapes.
- `app/src/components/ThesisPanel.tsx` (new) — verdict badge + per-signal breakdown.
- `app/src/App.tsx` (modify) — fetch `/api/thesis` after the basis report; render `ThesisPanel` between `LegDiffView` and `AnchorPanel`.
- `app/vite.config.ts` (modify) — proxy `/api` → the server.
- `pnpm-workspace.yaml` (modify) — add `server` to the workspace.
- `README.md` (modify, Task 7) — reposition to Conviction OS.

---

### Task 1: Pure thesis-health engine

**Files:**
- Create: `packages/engine/src/thesis.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/thesis.test.ts`

**Interfaces:**
- Consumes: nothing external (pure).
- Produces: `ThesisVerdict`, `SignalStatus`, `SignalKey`, `ThesisSignal`, `ThesisMetric`, `ThesisReport`, `assembleThesisReport(input)`, `SIGNAL_SPECS`.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/engine/test/thesis.test.ts
import { describe, it, expect } from 'vitest'
import { assembleThesisReport } from '../src/thesis'

const mint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'

describe('assembleThesisReport', () => {
  it('INTACT when metrics are stable', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.50, baseline: 0.49 },
        whale_flow: { value: 1000, baseline: 1000 },
      },
    })
    expect(r.verdict).toBe('INTACT')
    expect(r.signals).toHaveLength(2)
  })

  it('CRACKING on a single bearish alarm', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.40, baseline: 0.50 }, // -20% => alarm (bearish down)
        whale_flow: { value: 1000, baseline: 1000 },
      },
    })
    expect(r.signals.find(s => s.key === 'concentration')!.status).toBe('alarm')
    expect(r.verdict).toBe('CRACKING')
  })

  it('BROKEN on two bearish alarms', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.40, baseline: 0.50 },
        whale_flow: { value: 700, baseline: 1000 },
      },
    })
    expect(r.verdict).toBe('BROKEN')
  })

  it('CRACKING on two warns, no alarm', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.46, baseline: 0.50 }, // -8% => warn
        whale_flow: { value: 920, baseline: 1000 },       // -8% => warn
      },
    })
    expect(r.verdict).toBe('CRACKING')
  })

  it('marks a null metric unavailable as warn, never fabricates', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: null,
        whale_flow: { value: 1000, baseline: 1000 },
      },
    })
    const c = r.signals.find(s => s.key === 'concentration')!
    expect(c.status).toBe('warn')
    expect(c.note).toMatch(/unavailable/i)
    expect(c.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source scripts/env.sh && cd packages/engine && pnpm vitest run test/thesis.test.ts`
Expected: FAIL — `assembleThesisReport` not defined.

- [ ] **Step 3: Implement `thesis.ts`**

```ts
// packages/engine/src/thesis.ts
export type ThesisVerdict = 'INTACT' | 'CRACKING' | 'BROKEN'
export type SignalStatus = 'ok' | 'warn' | 'alarm'
export type SignalKey = 'concentration' | 'whale_flow' | 'liquidity'

export interface ThesisSignal {
  key: SignalKey
  label: string
  value: number | null
  baseline: number | null
  changePct: number | null
  status: SignalStatus
  note: string
}

export interface ThesisMetric { value: number; baseline: number }

export interface ThesisReport {
  targetMint: string
  windowDays: number
  signals: ThesisSignal[]
  verdict: ThesisVerdict
  asOf: number
  partial: boolean
}

interface SignalSpec {
  key: SignalKey
  label: string
  bearish: 'down' | 'up'
  warnPct: number
  alarmPct: number
}

export const SIGNAL_SPECS: Record<SignalKey, SignalSpec> = {
  concentration: { key: 'concentration', label: 'Holder concentration', bearish: 'down', warnPct: 0.05, alarmPct: 0.15 },
  whale_flow:    { key: 'whale_flow',    label: 'Whale net position',   bearish: 'down', warnPct: 0.05, alarmPct: 0.15 },
  liquidity:     { key: 'liquidity',     label: 'DEX liquidity depth',  bearish: 'down', warnPct: 0.05, alarmPct: 0.15 },
}

function classify(spec: SignalSpec, metric: ThesisMetric | null): ThesisSignal {
  if (!metric) {
    return { key: spec.key, label: spec.label, value: null, baseline: null, changePct: null, status: 'warn', note: 'signal unavailable' }
  }
  const changePct = metric.baseline === 0 ? 0 : (metric.value - metric.baseline) / metric.baseline
  const bearishDelta = spec.bearish === 'down' ? -changePct : changePct
  let status: SignalStatus = 'ok'
  if (bearishDelta >= spec.alarmPct) status = 'alarm'
  else if (Math.abs(changePct) >= spec.warnPct) status = 'warn'
  const dir = changePct >= 0 ? 'up' : 'down'
  const note = `${(changePct * 100).toFixed(1)}% ${dir} over window`
  return { key: spec.key, label: spec.label, value: metric.value, baseline: metric.baseline, changePct, status, note }
}

export function foldVerdict(signals: ThesisSignal[]): ThesisVerdict {
  const alarms = signals.filter(s => s.status === 'alarm').length
  const warns = signals.filter(s => s.status === 'warn').length
  if (alarms >= 2) return 'BROKEN'
  if (alarms === 1 || warns >= 2) return 'CRACKING'
  return 'INTACT'
}

export function assembleThesisReport(input: {
  targetMint: string
  windowDays: number
  asOf: number
  metrics: Partial<Record<SignalKey, ThesisMetric | null>>
}): ThesisReport {
  const keys: SignalKey[] = Object.keys(input.metrics) as SignalKey[]
  const signals = keys.map(k => classify(SIGNAL_SPECS[k], input.metrics[k] ?? null))
  return {
    targetMint: input.targetMint,
    windowDays: input.windowDays,
    signals,
    verdict: foldVerdict(signals),
    asOf: input.asOf,
    partial: signals.some(s => s.value === null),
  }
}
```

- [ ] **Step 4: Export from index**

Add to `packages/engine/src/index.ts`: `export * from './thesis'`

- [ ] **Step 5: Run tests to verify they pass**

Run: `source scripts/env.sh && cd packages/engine && pnpm vitest run test/thesis.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/thesis.ts packages/engine/src/index.ts packages/engine/test/thesis.test.ts
git commit -m "feat(engine): pure thesis-health verdict engine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Author + validate Dune queries (concentration, whale-flow)

**Files:**
- Create: `server/dune-queries.json`

**Note:** This task needs a Dune account with API access. It authors and saves the two core queries and records their IDs + row shapes. It writes no application code. If Dune's Solana schema differs from the query drafts below, the discovery step (Step 1) is authoritative — adjust the SQL to the real tables, do not force the draft.

- [ ] **Step 1: Discover the Solana holder/balance tables**

Use the Dune tooling (MCP `searchTables` / the Dune UI schema browser) to find current Solana SPL balance tables. Confirm which table gives per-holder token balances and supports a historical `as-of` cut (e.g. a balances table with a block-time or a latest-balance-with-history table). Record the chosen table names in `server/dune-queries.json` under `notes`.

- [ ] **Step 2: Author the concentration query**

A query parameterized by `{{mint}}`, `{{window_days}}`, and `{{top_n}}` (default 20) returning two rows or two columns: top-N holder share of circulating supply **now** and **`window_days` ago**, excluding known AMM/pool program accounts. Target output columns: `metric` (`'now' | 'baseline'`), `value` (share as a 0..1 float). Validate it executes and returns sane numbers for BONK.

- [ ] **Step 3: Author the whale-flow query**

A query parameterized by `{{mint}}`, `{{window_days}}`, `{{top_n}}` returning the aggregate absolute token balance held by the top-N non-AMM holders **now** and **`window_days` ago**. Same output shape (`metric`, `value`). Validate for BONK.

- [ ] **Step 4: Record IDs and row shapes**

```json
// server/dune-queries.json
{
  "notes": "Solana holder tables used: <fill from Step 1>",
  "concentration": { "queryId": 0, "params": ["mint", "window_days", "top_n"], "rows": "[{metric:'now'|'baseline', value:number}]" },
  "whale_flow":    { "queryId": 0, "params": ["mint", "window_days", "top_n"], "rows": "[{metric:'now'|'baseline', value:number}]" }
}
```
Fill the real `queryId`s. Commit (this file has no secrets).

- [ ] **Step 5: Commit**

```bash
git add server/dune-queries.json
git commit -m "chore(server): record Dune query ids + row shapes for thesis signals

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Thesis server endpoint

**Files:**
- Create: `server/package.json`, `server/src/index.ts`, `server/src/dune.ts`, `server/test/dune.test.ts`, `server/test/fixtures/concentration.json`, `server/test/fixtures/whale_flow.json`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: `assembleThesisReport`, `ThesisMetric`, `SignalKey` from `@holdfast/engine`; `DUNE_API_KEY` from env; query IDs from `server/dune-queries.json`.
- Produces: `GET /api/thesis?mint=<mint>&windowDays=<n>` → `ThesisReport` JSON. `rowsToMetric(rows)` in `dune.ts`.

- [ ] **Step 1: Workspace + package**

Add `server` to `pnpm-workspace.yaml` `packages:` list.

```json
// server/package.json
{
  "name": "@holdfast/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": { "dev": "tsx src/index.ts", "test": "vitest run" },
  "dependencies": { "@holdfast/engine": "workspace:*", "express": "^4.19.0" },
  "devDependencies": { "vitest": "^2.0.0", "tsx": "^4.16.0", "typescript": "^5.5.0", "@types/express": "^4.17.0" }
}
```

- [ ] **Step 2: Write the failing mapping test**

```ts
// server/test/dune.test.ts
import { describe, it, expect } from 'vitest'
import { rowsToMetric } from '../src/dune'
import conc from './fixtures/concentration.json'

describe('rowsToMetric', () => {
  it('maps now/baseline rows to a ThesisMetric', () => {
    const m = rowsToMetric(conc as any)
    expect(m).toEqual({ value: 0.52, baseline: 0.50 })
  })
  it('returns null when a row is missing', () => {
    expect(rowsToMetric([{ metric: 'now', value: 0.5 }] as any)).toBeNull()
  })
})
```

```json
// server/test/fixtures/concentration.json
[{ "metric": "now", "value": 0.52 }, { "metric": "baseline", "value": 0.50 }]
```
(Also create `server/test/fixtures/whale_flow.json` with the same shape, e.g. `value` 1000/1000.)

- [ ] **Step 3: Run test to verify it fails**

Run: `source scripts/env.sh && pnpm install && cd server && pnpm vitest run`
Expected: FAIL — `rowsToMetric` not defined.

- [ ] **Step 4: Implement `dune.ts`**

```ts
// server/src/dune.ts
import type { ThesisMetric } from '@holdfast/engine'

export interface DuneRow { metric: 'now' | 'baseline'; value: number }

export function rowsToMetric(rows: DuneRow[]): ThesisMetric | null {
  const now = rows.find(r => r.metric === 'now')
  const baseline = rows.find(r => r.metric === 'baseline')
  if (!now || !baseline) return null
  return { value: now.value, baseline: baseline.value }
}

const BASE = 'https://api.dune.com/api/v1'

export async function runQuery(queryId: number, params: Record<string, string | number>, apiKey: string): Promise<DuneRow[]> {
  const exec = await fetch(`${BASE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: { 'x-dune-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query_parameters: params }),
  })
  const { execution_id } = await exec.json()
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const st = await fetch(`${BASE}/execution/${execution_id}/status`, { headers: { 'x-dune-api-key': apiKey } })
    const { state } = await st.json()
    if (state === 'QUERY_STATE_COMPLETED') break
    if (state === 'QUERY_STATE_FAILED') throw new Error(`Dune query ${queryId} failed`)
  }
  const res = await fetch(`${BASE}/execution/${execution_id}/results`, { headers: { 'x-dune-api-key': apiKey } })
  const body = await res.json()
  return body.result.rows as DuneRow[]
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `source scripts/env.sh && cd server && pnpm vitest run`
Expected: PASS.

- [ ] **Step 6: Implement the endpoint**

```ts
// server/src/index.ts
import express from 'express'
import { readFileSync } from 'node:fs'
import { assembleThesisReport, type SignalKey, type ThesisMetric } from '@holdfast/engine'
import { runQuery, rowsToMetric } from './dune'

const queries = JSON.parse(readFileSync(new URL('../dune-queries.json', import.meta.url), 'utf8'))
const KEY = process.env.DUNE_API_KEY ?? ''
const app = express()

app.get('/api/thesis', async (req, res) => {
  const mint = String(req.query.mint ?? '')
  const windowDays = Number(req.query.windowDays ?? 7)
  if (!mint) return res.status(400).json({ error: 'mint required' })
  const metrics: Partial<Record<SignalKey, ThesisMetric | null>> = {}
  for (const key of ['concentration', 'whale_flow'] as SignalKey[]) {
    try {
      const rows = await runQuery(queries[key].queryId, { mint, window_days: windowDays, top_n: 20 }, KEY)
      metrics[key] = rowsToMetric(rows)
    } catch {
      metrics[key] = null
    }
  }
  res.json(assembleThesisReport({ targetMint: mint, windowDays, asOf: Math.floor(Date.now() / 1000), metrics }))
})

app.listen(8787, () => console.log('thesis server on :8787'))
```

- [ ] **Step 7: Manual smoke**

With `DUNE_API_KEY` exported and query IDs filled in: `source scripts/env.sh && cd server && DUNE_API_KEY=$DUNE_API_KEY pnpm dev`, then `curl 'http://localhost:8787/api/thesis?mint=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263&windowDays=7'` → a `ThesisReport` JSON with a verdict. If Dune is unreachable, expect both signals `warn`/unavailable and `partial: true` (honest degrade, not a crash).

- [ ] **Step 8: Commit**

```bash
git add server pnpm-workspace.yaml
git commit -m "feat(server): thesis endpoint over Dune signals

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: ThesisPanel + wire into the loop

**Files:**
- Create: `app/src/components/ThesisPanel.tsx`
- Modify: `app/src/App.tsx`, `app/vite.config.ts`

**Interfaces:**
- Consumes: `ThesisReport` type from `@holdfast/engine`; `GET /api/thesis`.
- Produces: `ThesisPanel({ mint })`.

- [ ] **Step 1: Vite proxy**

In `app/vite.config.ts`, add a server proxy so `/api` → `http://localhost:8787`:
```ts
server: { proxy: { '/api': 'http://localhost:8787' } }
```
(Merge into the existing config; do not clobber other settings.)

- [ ] **Step 2: ThesisPanel**

```tsx
// app/src/components/ThesisPanel.tsx
import { useEffect, useState } from 'react'
import type { ThesisReport } from '@holdfast/engine'

const COLOR = { INTACT: 'green', CRACKING: 'orange', BROKEN: 'red' } as const

export function ThesisPanel({ mint }: { mint: string }) {
  const [data, setData] = useState<ThesisReport | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    fetch(`/api/thesis?mint=${mint}&windowDays=7`)
      .then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [mint])
  if (loading) return <p>Checking thesis health…</p>
  if (!data) return <p>Thesis health unavailable.</p>
  return (
    <section>
      <h3>Is your thesis still true?</h3>
      <p style={{ fontWeight: 700, color: COLOR[data.verdict] }}>
        Verdict: {data.verdict}{data.partial ? ' (partial)' : ''}
      </p>
      <ul>
        {data.signals.map(s => (
          <li key={s.key}>
            <strong>{s.label}:</strong> {s.status.toUpperCase()} — {s.note}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Wire into App**

In `app/src/App.tsx`, import `ThesisPanel` and render it between `LegDiffView` and `AnchorPanel`, passing `mint={targetMint}`. Update the tagline `<p>` to the Conviction OS line: "Know your real basis. Know if your thesis still holds. Hold the line — or break it honestly."

- [ ] **Step 4: Manual verify**

With the server running: `source scripts/env.sh && cd app && pnpm dev`, trace a public wallet holding BONK, confirm the verdict badge renders with per-signal breakdown between the leg diff and the anchor panel.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ThesisPanel.tsx app/src/App.tsx app/vite.config.ts
git commit -m "feat(app): thesis-health panel woven into the conviction loop

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5 (stretch): Liquidity signal + noise filter

**Files:**
- Modify: `server/dune-queries.json`, `server/src/index.ts`, `packages/engine/src/thesis.ts`, `packages/engine/test/thesis.test.ts`

**Only start this once Tasks 1–4 are green.** Build order enforces the disciplined slice.

- [ ] **Step 1: Failing test for the noise filter**

Add to `thesis.test.ts`: when `concentration` is a bearish alarm AND `liquidity` rose beyond the alarm threshold (pool depth up), `applyNoiseFilter` demotes the concentration signal `alarm → warn` with a note mentioning liquidity.

```ts
it('demotes a concentration alarm explained by rising liquidity', () => {
  const r = assembleThesisReport({
    targetMint: mint, windowDays: 7, asOf: 100,
    metrics: {
      concentration: { value: 0.40, baseline: 0.50 }, // -20% alarm
      liquidity:     { value: 1.30, baseline: 1.00 }, // +30% depth up
    },
  })
  const c = r.signals.find(s => s.key === 'concentration')!
  expect(c.status).toBe('warn')
  expect(c.note).toMatch(/liquidity/i)
})
```

- [ ] **Step 2: Implement `applyNoiseFilter`**

Add a pure `applyNoiseFilter(signals)` step inside `assembleThesisReport`, run before `foldVerdict`: if a `concentration` signal is `alarm` (bearish drop) and a `liquidity` signal exists with `changePct >= alarmPct` (depth increased), set the concentration signal to `warn` and append " — likely AMM inventory, not distribution" to its note.

- [ ] **Step 3: Add liquidity to the Dune set + endpoint**

Author a `liquidity` Dune query (DEX pool depth now vs baseline, same `metric`/`value` row shape), record its ID in `dune-queries.json`, and add `'liquidity'` to the endpoint's signal loop.

- [ ] **Step 4: Run all engine + server tests**

Run: `source scripts/env.sh && pnpm -r test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: liquidity signal + AMM-noise filter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Reposition README + demo copy

**Files:**
- Modify: `README.md`, `docs/DEMO.md`

- [ ] **Step 1: README**

Reposition the top of `README.md` from cost-basis tool to Conviction OS: the one-loop framing (Truth → Thesis health → Discipline), the "most tools tell you what you own; Holdfast tells you whether you should still believe in it" line, and the three-pillar architecture. Keep the existing Quick Start; add the `server/` run step (`DUNE_API_KEY` env var) and the Vite proxy note. Keep the Known Limitations + Privacy sections; add the deferred dormancy signal and the "reconcile is self-consistency, not independent verification" honesty note.

- [ ] **Step 2: DEMO.md**

Update the demo beats to: Paste → Truth (basis + hidden legs) → **Thesis health (verdict + why)** → Anchor → Confront. Keep the builder's-arc framing (generic scar, no real figures).

- [ ] **Step 3: Commit**

```bash
git add README.md docs/DEMO.md
git commit -m "docs: reposition README + demo to Conviction OS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Pillar 1 (Truth) reuse → unchanged, referenced in Task 4/6. ✅
- Pillar 2 (Thesis health): pure verdict engine → Task 1; Dune queries → Task 2; server endpoint → Task 3; UI → Task 4; liquidity + noise filter → Task 5. ✅
- Pillar 3 (Discipline) reuse → unchanged, referenced in Task 4. ✅
- Hybrid data (RPC + Dune, key server-side) → Tasks 2–3. ✅
- Transparent verdict, inputs shown → Task 1 (report carries per-signal value/baseline/changePct/note) + Task 4 (renders them). ✅
- Honest degrade (unavailable → warn, never fabricate) → Task 1 Step 1 test + Task 3 endpoint catch. ✅
- Privacy firewall + secrets in env → Global Constraints, enforced in Task 3. ✅
- Deferred dormancy → not built; noted in Task 6 README. ✅

**Placeholder scan:** Task 2 `queryId: 0` is a labeled placeholder resolved by authoring the queries (that IS the task's deliverable), not a logic gap. Task 2 Step 1 (table discovery) is a concrete action (use searchTables), not a TODO. No vague "add error handling" steps — the honest-degrade path is specified with a test.

**Type consistency:** `ThesisMetric`, `SignalKey`, `ThesisReport`, `assembleThesisReport` defined in Task 1, consumed unchanged in Tasks 3–5. `rowsToMetric` signature identical in Task 3 test and impl. `ThesisReport` shape rendered in Task 4 matches Task 1's definition (`verdict`, `partial`, `signals[].label/status/note`). ✅

**Known accepted gap:** Task 2's exact Dune SQL depends on Dune's current Solana schema, which the plan cannot pin without live access — Task 2 Step 1 makes schema discovery an explicit first step, and the row shape (`metric`/`value`) the rest of the code depends on is fixed regardless of the underlying tables.
