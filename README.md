# Holdfast

**Chain-verified conviction. Know your true basis, hold the line.**

Holdfast is a Solana cost-basis wallet that reconstructs the true acquisition cost of any SPL token position by tracing on-chain transaction history, then anchors that conviction immutably on-chain. Built for the builder who entered crypto in 2021, dispersed a life-changing position to impatience in 2023, and needed the machine that reconstructs truth and defends against the next panic.

## The Problem

Single-wallet trackers lie by omission. When you acquire a token across multiple wallets — swapping, staking, transferring — those trackers see only their slice of your history. They label genuine acquisitions as "free receives" and leave you flying blind on true cost.

Without verifiable basis, conviction has no anchor. You sell into fear because you don't know what you really paid. Holdfast fixes both: it walks the full on-chain trail across all your wallets and builds the complete acquisition ledger, then commits that basis on-chain where future-you cannot rewrite it.

## Architecture

Holdfast is a monorepo with three pieces:

- **`packages/engine`** — off-chain basis reconstruction engine. Reads transaction history from Solana mainnet, traces SPL token flows across wallets, prices acquisition legs at block time, and produces a verifiable `BasisReport` with a SHA-256 hash.

- **`programs/holdfast`** — Anchor program deployed on devnet. Stores a `ConvictionAnchor` PDA per user with key fields: `line` (your cost basis in micro-USD), `basis_hash` (SHA-256 of the acquisition legs), and `break_count` (monotonic counter of honest breaches). The PDA also stores `owner`, timestamps (`created_at`, `streak_start`), and a `version` counter. Three instructions: `anchor_conviction` (commit your basis), `record_break` (increment break counter, permanent), `renew` (update basis as you add to the position).

- **`app/`** — Vite + React frontend. Paste a wallet, trace its on-chain history, see the acquisition legs single-wallet trackers miss, and anchor your conviction on devnet.

**Mainnet read / Devnet anchor split:** The app reads transaction history from Solana **mainnet** (via `VITE_MAINNET_RPC`) to reconstruct real cost basis, but anchors conviction on **devnet**. This is a deliberate MVP choice — mainnet anchoring would require rent and introduces no value over devnet for the conviction-defense use case.

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

### 6. Run the app

```bash
cd app
pnpm --filter @holdfast/app dev
```

Open [http://localhost:5173](http://localhost:5173). Paste a Solana wallet address, click **Trace**, and see the acquisition legs that single-wallet trackers miss.

Connect a devnet wallet (Phantom in devnet mode) to anchor your conviction on-chain.

## Known Limitations

- **SPL-funded legs:** The engine's block-time pricing reconstructs cost for SOL-funded acquisition legs (e.g., you swapped SOL → target token). When a leg is funded by swapping a different SPL token (e.g., you swapped HYPE → target), the acquisition is correctly detected but surfaced with `priceConfidence: 'none'` rather than a fabricated price. Widening cost reconstruction to SPL-funded legs is a fast-follow.

- **Multi-user:** The current PDA design ties one `ConvictionAnchor` to one wallet. Supporting aggregated basis across multiple wallets (the "one position, three wallets" use case) requires a cross-wallet PDA architecture — straightforward but out of MVP scope.

- **Reconciliation:** The reconcile step is an internal arithmetic self-consistency assertion (it confirms the leg costs sum consistently within the engine's pricing logic) — it is NOT an independent cross-validation against a second price source. Widening it to independently-sourced re-pricing is a fast-follow.

## Privacy

This is a **clean-room repo**. No personal wallet addresses, no real cost-basis data, no position sizes. The narrative is authentic — the builder's arc is real — but the specifics stay private.

## Built With

- [Solana web3.js](https://github.com/solana-labs/solana-web3.js)
- [Anchor](https://www.anchor-lang.com/)
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)

## License

MIT
