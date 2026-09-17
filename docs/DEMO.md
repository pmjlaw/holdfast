# Holdfast Demo Script

**5-beat walkthrough: Paste → Truth → Thesis health → Anchor → Confront**

---

## The Builder's Arc

In 2021, I entered crypto. By early 2023, I held a life-changing position — thousands of tokens acquired across multiple wallets through staking rewards, transfers, and swaps. When the market turned in 2023, I panicked. Single-wallet trackers showed "free receives" where I'd actually paid real cost. Flying blind on my true basis — and with no way to check whether the thesis still held — I dispersed the position into fear.

I watched the tokens I sold climb 4× from where I exited.

Holdfast is the machine I wish I'd had: it reconstructs the truth, checks whether the thesis still holds, anchors it immutably on-chain, and defends against the next moment of weakness.

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

## Beat 3: Thesis Health — Does It Still Hold?

Knowing your true basis is only half the answer. The other half: **does the thesis that justified your entry still hold?**

1. Scroll to the **Thesis Health** section (or click **Check thesis health** if you haven't already).

Holdfast queries Dune Analytics for three on-chain signals:

- **Concentration** — top-holder share. If the top holders control a growing share, the base is stable. If their share is dropping fast, they may be distributing.
- **Whale flow** — large-holder net flow. Are whales accumulating (positive flow) or exiting (negative)?
- **Liquidity** — DEX pool depth. Is liquidity growing (healthy) or collapsing (warning sign)?

Each signal is classified against a baseline:
- **INTACT** (or INTACT-ish) — signal is healthy or stable
- **warn** — signal is degrading but not broken
- **alarm** — signal is broken

The three signals fold into an overall verdict:
- **INTACT** — thesis holds (all signals green or stable)
- **CRACKING** — thesis degrading (one or more signals at warn/alarm, but not catastrophic)
- **BROKEN** — thesis no longer defensible (multiple alarms, or critical signal failed)

**Transparent reasoning:** The UI shows you the raw inputs — exact concentration percentage, whale flow direction, pool depth — plus the baseline each signal is compared against, plus the reason for any warn/alarm status. Never a black box.

**Honest degrade:** If a signal is unavailable (e.g., Dune query times out), it degrades to a `warn` marked "unavailable" — Holdfast never fabricates data to keep the verdict green.

**AMM-noise filter:** A concentration alarm (top-holder share dropping) is demoted to warn when rising pool liquidity explains the drop. This defends against "AMM inventory masquerading as a distributing whale" — a common false positive.

### The rigor kill: how we caught a false CRACKING on BONK

This is the beat that separates Holdfast from a naive dashboard.

Every on-chain-holder query reads Solana balances from a change-event table — a row exists only for the days an account *moved*. Ask the naive question — "what were the top holders' balances on the baseline day?" — and you only see accounts that happened to transact that exact day. For BONK, one baseline day indexed **3,221 accounts** against **1,016,914** live today — a **316× undercount**.

That artifact breaks concentration *twice*: it deflates the denominator (total supply seen) **and** drops most whales out of the top-N numerator. The naive verdict comes back **CRACKING** — a manufactured alarm off a snapshot hole, not a real distribution event.

Holdfast forward-fills: for each holder it reconstructs the last-known balance *as of* the baseline day (`ROW_NUMBER() … ORDER BY day DESC`, filtered to `balance > 0` after the dedupe, so wallets that zeroed out are correctly excluded). That recovers **1,008,559** baseline holders instead of 3,221. Real concentration: **51.7% → 52.4%** over the window — flat-to-rising. Correct verdict: **INTACT**.

**The pitch is the rigor.** Naive tools scream CRACKING off a snapshot artifact; Holdfast detects the artifact and says INTACT — and every number on screen carries the query and the on-chain source so **you can chain-verify it yourself**. Trust by construction, not by assertion.

**Why this matters:** A position can have solid cost basis but a broken thesis. Holdfast tells you both, so you can make an informed decision rather than flying blind.

---

## Beat 4: Anchor Conviction

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

## Beat 5: Record Break (Honest Mode)

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
2. **Check thesis health** — are the fundamentals still intact, or degrading?
3. **Renew your conviction** by calling the `renew` instruction (updates `line` and `basis_hash` with fresh data).
4. **Hold or break** — and record it either way.

The chain becomes your accountability partner. Not your conscience, not your advisor — just an immutable ledger of what you said you'd do, what the on-chain signals told you, and what you actually did.

---

## What Happens Next

This is an MVP. The engine reconstructs basis for SOL-funded legs today; SPL-funded legs (e.g., swapping HYPE → target) are detected but not priced yet — that's a fast-follow. The thesis health verdict uses three signals (concentration, whale flow, liquidity); a fourth signal (wallet dormancy) is designed but deferred. The program lives on devnet because conviction-defense needs immutability, not mainnet rent.

But the core loop works: **truth → thesis health → discipline → confront**. And the thesis is load-bearing: I built this because I needed it. If you've ever sold into fear and watched the chart mock you afterward, you need it too.

---

**Ready to anchor?** Run `pnpm --filter @holdfast/app dev` and paste your wallet.
