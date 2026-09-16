# Holdfast — Design Spec

**Date:** 2026-09-16
**Event:** Colosseum "Crypto World's Fair" hackathon (ends 2026-10-12 23:59 PDT)
**Status:** Design approved — spec for review before implementation planning

---

## One line

*Holdfast — chain-verified conviction. Know your true basis, hold the line.*

A Solana wallet that reconstructs the **truth** about itself from raw on-chain
history, then lets you **commit that conviction on-chain** where future-you cannot
quietly rewrite it. The forensic truth engine and the anti-impatience commitment
device are the same machine: truth is the discipline mechanism.

## The problem (both halves are real, both are lived)

1. **Retail has no verifiable cost basis.** Portfolio trackers reconstruct basis
   from a single wallet and mislabel any acquisition leg funded by a *different*
   signer (co-signer, unstake account, cross-wallet transfer) as "free / $0
   RECEIVE." The reported basis is wrong, often by a wide margin, and no one can
   audit it.
2. **Retail has no defense against its own hands.** Conviction dies to impatience
   because the commitment lives only in the holder's head, where it can be
   rationalized away in a weak moment. (The builder held a large personal
   position — enough to be free — and dispersed it to impatience. That scar is
   the product thesis.)

Holdfast fixes both with one insight: **if you can see chain-verified ground
truth and commit it to an immutable on-chain record, impatient-you can no longer
gaslight disciplined-you.**

## The product

Three parts behind one demo. Build everything toward the demo.

### The demo (the WOW)
1. Paste **any** Solana wallet.
2. The engine traces true cost basis live and **flags the legs trackers get
   wrong** — the acquisition legs funded by co-signer / unstake / cross-wallet
   flows that single-wallet trackers mislabel as free. Shows: *true basis $X ·
   Y% underwater · $Z to breakeven/free.*
3. User **anchors conviction on-chain** (devnet): "my line, my date, hash of my
   verified basis" → an immutable `ConvictionAnchor` PDA.
4. **The confront mechanic:** simulating a break surfaces the commitment past-you
   made. A break is **recorded, not erased** (`record_break` increments a counter
   and resets the streak, permanently). That immutable honesty is the anti-2023
   device.

## Architecture

Three components plus a hard privacy firewall.

### 1. On-chain program (Anchor, devnet)

`ConvictionAnchor` — one PDA per owner, seeds `[b"conviction", owner]`.

Fields:
- `owner: Pubkey`
- `line: u64` — the thesis floor / commitment level (or a never-sell flag encoded as a sentinel)
- `basis_hash: [u8; 32]` — hash of the off-chain reconciled basis report
- `snapshot_slot: u64` — slot at which the basis snapshot was taken
- `created_at: i64`
- `break_count: u32`
- `streak_start: i64`
- `version: u32` — incremented on `renew`; prior snapshots are never deleted

Instructions:
- `anchor_conviction(line, basis_hash, snapshot_slot)` — create the PDA and
  record the first commitment. Immutable thereafter except via `renew`/`record_break`.
- `record_break()` — honest break: `break_count += 1`, `streak_start = now`. The
  break is permanent; the record cannot be deleted. This is the point.
- `renew(line, basis_hash, snapshot_slot)` — append a new snapshot; `version += 1`.
  Prior state is superseded but the history (via transaction log / version trail)
  is never erased.

**Immutability is the whole point** — the on-chain record of "I committed to hold
at date X with verified basis Y" cannot be quietly rewritten.

### 2. Off-chain forensic engine (the moat)

A generic, clean-room reimplementation of a proven multi-wallet basis-reconciliation
algorithm. Capabilities:
- **Multi-wallet leg tracing** across a user-declared set of related/self/co-signer
  wallets — captures acquisition legs funded from a different signer that
  single-wallet trackers miss.
- **ATA resolution** (the phantom-zero fix) — never reads an owner-level null as a
  zero balance; resolves the associated token account or cross-checks holders.
- **Block-time pricing** — prices each in-leg at the historical price at block time
  (DefiLlama and/or Jupiter historical), including non-SOL/USDC input tokens.
- **Adversarial second-pass reconcile** (the "truth tie-out") — an independent
  recomputation path that must agree with the primary before a basis is reported;
  disagreement surfaces as a flagged drift, not a silent number.

Output: reconciled true basis, true drawdown, distance-to-breakeven, a per-leg
diff of "what your tracker got wrong," and a `basis_hash` for the on-chain anchor.

### 3. Frontend

Single page: paste wallet → basis report + leg-diff → anchor conviction → confront.
Wallet adapter for the devnet anchor transaction. Lean; no accounts, no settings.

### 🔒 Privacy firewall (hard rule)

The public repo is **clean-room**: it reimplements the *technique* generically for
any wallet. The builder's own wallet, position, cost basis, and private state files
**never** enter this repo. The private forensic/monitoring stack stays untouched and
off-repo. Engine correctness is validated against the builder's own known numbers
**privately**, outside version control.

## MVP scope

**In (protect these — they are the WOW and the Solana-native credit):**
- Multi-wallet forensic leg tracer + block-time pricing + adversarial reconcile pass.
- The per-leg "what your tracker got wrong" diff view.
- `ConvictionAnchor` program with `anchor_conviction` + `record_break`, on devnet.
- Single-page demo: paste → report → anchor → confront.
- Read **mainnet** for basis (real wallets, real teeth); anchor on **devnet**.

**Explicitly cut (YAGNI for a 26-day part-time solo build):**
- Mainnet program deployment.
- Multi-user accounts, auth, persistence beyond the on-chain PDA.
- Alerting / monitoring infrastructure (out of scope; belongs to a private stack).
- `renew` may be stubbed/omitted if time-constrained — `anchor` + `record_break`
  carry the demo.
- Support for more than one demo token narrative (engine stays generic; the
  *demo script* focuses on one).

## Build sequence (part-time: evenings + weekends)

- **D1–4:** forensic engine — generic wrapper, multi-wallet leg tracer, block-time
  pricer; validate privately against known basis.
- **D5–9:** Anchor program (`anchor_conviction`, `record_break`), devnet deploy, tests.
- **D10–16:** frontend + wallet adapter; wire engine → `basis_hash` → on-chain.
- **D17–22:** confront mechanic + the leg-diff view + polish.
- **D23–26:** submission video + writeup (the builder's arc: entered crypto 2021 →
  dispersed a life-changing position to impatience 2023 → built the anti-panic
  device), buffer.

## Why it scores

- **Novelty:** on-chain conviction anchored to adversarial on-chain forensics —
  unseen. Not a portfolio tracker, not an alert bot.
- **Technical execution:** a real Solana program plus genuinely hard chain-tracing
  (the legs everyone else gets wrong).
- **Real problem:** retail has no true basis and no defense against its own hands.
- **Authenticity that cannot be faked:** built by a real large holder who lived
  both failures and built the fix on a real position.

## Open risks

- **Block-time pricing coverage** for illiquid/non-standard input tokens may be
  spotty — fallback path (nearest available price + flagged confidence) required.
- **Multi-wallet declaration UX** — the user must declare related wallets for the
  cross-signer trace; auto-discovery is out of MVP scope, so the demo wallet's
  related set is pre-declared.
- **Part-time capacity** — the sequence assumes evenings/weekends; if capacity is
  lower, `renew` and polish are the first cuts, the leg-tracer and anchor are not.

## Name

**Holdfast.** A holdfast anchors a growing thing to bedrock so it cannot be torn
loose — "hold fast." Carries the never-sell conviction soul and the anti-dispersal
scar. Alternates considered and rejected: "Bedrock" (collides with Salesforce/AWS
Bedrock), "Anchor" (collides with the Solana Anchor framework), "Ground Truth"
(descriptive but generic).
