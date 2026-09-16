# Holdfast Demo Script

**4-beat walkthrough: Paste → Trace → Anchor → Confront**

---

## The Builder's Arc

In 2021, I entered crypto. By early 2023, I held a life-changing SOL position — thousands of tokens acquired across multiple wallets through staking rewards, transfers, and swaps. When the market turned in 2023, I panicked. Single-wallet trackers showed "free receives" where I'd actually paid real cost. Flying blind on my true basis, I dispersed the position into fear.

I watched the tokens I sold climb 4× from where I exited.

Holdfast is the machine I wish I'd had: it reconstructs the truth, anchors it immutably on-chain, and defends against the next moment of weakness.

---

## Beat 1: Paste → Trace → True Basis

1. Open the app at [http://localhost:5173](http://localhost:5173)

2. **Paste a wallet address** into the input field. Any Solana wallet that holds an SPL token works — use your own, or try a public wallet with known token holdings.

3. **Set the target token mint** (defaults to BONK: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`). This tells Holdfast which token's basis you want to reconstruct.

4. Click **Trace**.

Holdfast reads the wallet's full on-chain transaction history from Solana mainnet, identifies every SPL token transfer that increased the target token balance, and prices each acquisition leg at the block timestamp.

**Output:** A `BasisReport` with three key fields:
- **Total acquired** — the sum of all inbound legs
- **Weighted average basis** — your true cost per token, in USD
- **Basis hash** — a SHA-256 fingerprint of the acquisition legs (used on-chain for tamper-proofing)

---

## Beat 2: Leg Diff — What Trackers Miss

Scroll to the **Acquisition Legs** section. This is where Holdfast's value becomes concrete.

Each leg shows:
- **Amount** — tokens acquired in this transaction
- **Cost** — USD cost at block time (when available)
- **Confidence** — pricing confidence (`high` for SOL-funded legs, `none` for SPL-funded legs where pricing is deferred)
- **Signature** — the on-chain transaction

**The lie trackers tell:** When you transfer tokens from Wallet A to Wallet B, single-wallet trackers see Wallet B's inbound as a "free receive" and report zero cost basis. They don't know you paid for those tokens in Wallet A.

**What Holdfast shows:** The full trail. Every acquisition leg, across all your wallets, with verifiable on-chain signatures. No "free" tokens — just honest accounting.

---

## Beat 3: Anchor Conviction

Now that you know your true basis, commit it on-chain so future-you cannot rewrite history.

1. **Connect a devnet wallet** using the wallet button (top-right). Make sure your wallet is set to **Devnet** mode.

2. Scroll to **Anchor your conviction**.

3. Click **Anchor conviction**.

This calls the `anchor_conviction` instruction on the Holdfast program (deployed on devnet). The program creates a `ConvictionAnchor` PDA tied to your wallet with key fields:

- `line` — your weighted average basis in micro-USD (immutable unless you call `renew` to update it)
- `basis_hash` — the SHA-256 hash of your acquisition legs (tamper-proof ledger)
- `break_count` — a monotonic counter of honest breaches, initially `0`

The PDA also stores your wallet address (`owner`), timestamps (`created_at`, `streak_start`), and a `version` counter.

The transaction settles in ~400ms. Your conviction is now on-chain.

**Why this matters:** The PDA is owned by the program, not you. You cannot delete it, edit it retroactively, or pretend it never existed. When the market turns and fear kicks in, the chain remembers your line.

---

## Beat 4: Record Break (Honest Mode)

Holdfast doesn't prevent you from selling. It prevents you from lying to yourself about it.

If you break — if you sell below your anchored basis — you can (and should) record that breach honestly.

1. Click **Record a break (honest)**.

2. This calls `record_break`, which increments `break_count` by 1 (via checked_add — it wraps safely but you'd need 4 billion breaches to overflow).

**This is permanent.** The program has no instruction to decrement `break_count`. Your break history only ever grows — each honest breach is a permanent mark on the chain.

**Why?** Because honesty compounds. The next time you face a drawdown, you'll remember: "I broke last time. The chain has the receipt." That memory is a stake in the ground — not guilt, but data. You learn from it or you don't, but you cannot erase it.

---

## The Discipline Loop

Holdfast doesn't stop at one snapshot. As you add to your position over time:

1. **Trace again** with your updated wallet history.
2. **Renew your conviction** by calling the `renew` instruction (updates `line` and `basis_hash` with fresh data).
3. **Hold or break** — and record it either way.

The chain becomes your accountability partner. Not your conscience, not your advisor — just an immutable ledger of what you said you'd do, and what you actually did.

---

## What Happens Next

This is an MVP. The engine reconstructs basis for SOL-funded legs today; SPL-funded legs (e.g., swapping HYPE → target) are detected but not priced yet — that's a fast-follow. The program lives on devnet because conviction-defense needs immutability, not mainnet rent.

But the core loop works: **trace → verify → anchor → confront**. And the thesis is load-bearing: I built this because I needed it. If you've ever sold into fear and watched the chart mock you afterward, you need it too.

---

**Ready to anchor?** Run `pnpm --filter @holdfast/app dev` and paste your wallet.
