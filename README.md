# Holdfast

**Conviction OS: Truth → Thesis health → Discipline**

Most tools tell you what you own. Holdfast tells you whether you should still believe in it.

Holdfast is a conviction operating system for crypto holders: it reconstructs the true cost basis of any Solana SPL token position (Truth), checks whether your thesis still holds (Thesis health), and anchors that conviction immutably on-chain (Discipline). Built for the builder who entered crypto in 2021, dispersed a life-changing position to impatience in 2023, and needed the machine that reconstructs truth and defends against the next panic.

## The Problem

Single-wallet trackers lie by omission. When you acquire a token across multiple wallets — swapping, staking, transferring — those trackers see only their slice of your history. They label genuine acquisitions as "free receives" and leave you flying blind on true cost.

But knowing your basis is only half the answer. Conviction also requires knowing whether the thesis that justified your entry still holds — is the holder base still intact, or distributing? Are whales accumulating or exiting? Is liquidity growing or collapsing?

Without verifiable truth and thesis health, conviction has no anchor. You sell into fear because you don't know what you really paid, and you don't know if the fundamentals that justified the hold still stand. Holdfast fixes both: it walks the full on-chain trail across all your wallets, checks whether your thesis is still intact, and commits that conviction on-chain where future-you cannot rewrite it.

## Architecture: Three Pillars

Holdfast is a conviction loop across three pillars:

### Pillar 1: Truth (cost basis reconstruction)

**`packages/engine`** — off-chain basis reconstruction engine. Reads transaction history from Solana mainnet, traces SPL token flows across wallets, prices acquisition legs at block time, and produces a verifiable `BasisReport` with a SHA-256 hash. This is the foundation: you cannot hold conviction without knowing what you truly paid.

### Pillar 2: Thesis health (verdict engine)

**`server/` + Dune Analytics integration** — checks whether the thesis that justified your entry still holds. Three signals, sourced from Dune's Solana tables:

- **Concentration** — top-holder share (is the holder base stable or distributing?)
- **Whale flow** — large-holder net flow (are whales accumulating or exiting?)
- **Liquidity** — DEX pool depth (is liquidity growing or collapsing?)

Each signal is classified against a baseline (INTACT-ish / warn / alarm), then folded into an overall verdict: **INTACT** (thesis holds), **CRACKING** (degrading but not broken), or **BROKEN** (thesis no longer defensible). The verdict surfaces with inputs shown — transparent reasoning, never a black box. When a signal is unavailable, it degrades honestly to a `warn` marked "unavailable" (never fabricated).

The verdict also includes an **AMM-noise filter**: a concentration alarm is demoted to warn when rising pool liquidity explains the holder-share drop. This defends against "AMM inventory masquerading as a distributing whale" — a common false positive.

**Data path:** React app → `GET /api/thesis` (Express server in `server/`) → Dune queries. The Dune API key is server-side only (env var `DUNE_API_KEY`), never exposed to the client.

### Pillar 3: Discipline (on-chain anchor)

**`programs/holdfast`** — Anchor program deployed on devnet. Stores a `ConvictionAnchor` PDA per user with key fields: `line` (your cost basis in micro-USD), `basis_hash` (SHA-256 of the acquisition legs), and `break_count` (monotonic counter of honest breaches). The PDA also stores `owner`, timestamps (`created_at`, `streak_start`), and a `version` counter. Three instructions: `anchor_conviction` (commit your basis), `record_break` (increment break counter, permanent), `renew` (update basis as you add to the position).

**The loop:** Truth (know your basis) → Thesis health (know if the thesis holds) → Discipline (anchor it on-chain). When the market turns and fear kicks in, the chain remembers your line.

**Mainnet read / Devnet anchor split:** The app reads transaction history from Solana **mainnet** (via `VITE_MAINNET_RPC`) to reconstruct real cost basis, but anchors conviction on **devnet**. This is a deliberate MVP choice — mainnet anchoring would require rent and introduces no value over devnet for the conviction-defense use case.

**Frontend:** **`app/`** — Vite + React UI that orchestrates all three pillars. Paste a wallet, trace its on-chain history, see the acquisition legs single-wallet trackers miss, check thesis health, and anchor your conviction on devnet.

## Quick Start

### Prerequisites

- Node.js v20+ (via nvm)
- pnpm 9.0+
- Rust + Solana CLI + Anchor CLI (for program build/deploy)

### 1. Set up environment

The default `PATH` in this repo environment points to the Salesforce CLI's bundled node. Always source the environment script first:

```bash
source scripts/env.sh
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run engine tests

```bash
cd packages/engine
pnpm test
```

### 4. Build and test the Anchor program

```bash
cd programs/holdfast
anchor build --arch v1
anchor test --skip-build --validator legacy
```

The program builds with `--arch v1` because the local validator only runs Solana BPF v2 or older; production deploy would target the latest BPF.

### 5. Deploy to devnet (optional)

If you want to deploy a fresh instance:

```bash
cd programs/holdfast
anchor deploy --provider.cluster devnet
```

The program ID is deterministic and already configured in `app/src/lib/idl.ts`.

### 6. Run the thesis health server

The thesis health endpoint requires a Dune API key. Set it in your environment:

```bash
export DUNE_API_KEY=your_dune_api_key
```

Then start the Express server:

```bash
cd server
pnpm dev
```

The server runs on `http://localhost:8787` and exposes `GET /api/thesis?mint=<token_mint>`.

### 7. Run the app

```bash
cd app
pnpm --filter @holdfast/app dev
```

Open [http://localhost:5173](http://localhost:5173). Paste a Solana wallet address, click **Trace**, and see the acquisition legs that single-wallet trackers miss, plus the thesis health verdict.

**Note:** The Vite dev server proxies `/api` requests to `http://localhost:8787` (configured in `vite.config.ts`). Make sure the thesis server is running before you click **Check thesis health** in the UI.

Connect a devnet wallet (Phantom in devnet mode) to anchor your conviction on-chain.

## Known Limitations

- **SPL-funded legs:** The engine's block-time pricing reconstructs cost for SOL-funded acquisition legs (e.g., you swapped SOL → target token). When a leg is funded by swapping a different SPL token (e.g., you swapped HYPE → target), the acquisition is correctly detected but surfaced with `priceConfidence: 'none'` rather than a fabricated price. Widening cost reconstruction to SPL-funded legs is a fast-follow.

- **Multi-user:** The current PDA design ties one `ConvictionAnchor` to one wallet. Supporting aggregated basis across multiple wallets (the "one position, three wallets" use case) requires a cross-wallet PDA architecture — straightforward but out of MVP scope.

- **Reconciliation:** The reconcile step is an internal arithmetic self-consistency assertion (it confirms the leg costs sum consistently within the engine's pricing logic) — it is NOT an independent cross-validation against a second price source. Widening it to independently-sourced re-pricing is a fast-follow.

- **Dormancy signal:** The thesis health verdict currently uses three signals (concentration, whale_flow, liquidity). A fourth signal — wallet dormancy (has the dev/founding team stopped transacting?) — is designed but deferred. When built, it will follow the same honest-degrade pattern: unavailable → warn, never fabricated.

- **Thesis health honesty:** The thesis verdict is derived from on-chain holder distribution and liquidity data. It tells you whether measurable on-chain signals are degrading — it does NOT independently verify whether the project's roadmap, fundamentals, or narrative remain intact. Use it as one input, not the sole decision gate.

## Privacy

This is a **clean-room repo**. No personal wallet addresses, no real cost-basis data, no position sizes. The narrative is authentic — the builder's arc is real — but the specifics stay private.

## Built With

- [Solana web3.js](https://github.com/solana-labs/solana-web3.js)
- [Anchor](https://www.anchor-lang.com/)
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)

## License

MIT
