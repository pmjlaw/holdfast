import { SOL_MINT, type AcquisitionLeg } from './types'

export interface TokenBalance {
  accountIndex: number; mint: string; owner: string
  uiTokenAmount: { uiAmount: number | null }
}
export interface ParsedTx {
  slot: number; blockTime: number | null
  transaction: { signatures: string[]; message: { accountKeys: { pubkey: string; signer: boolean }[] } }
  meta: {
    preTokenBalances: TokenBalance[]; postTokenBalances: TokenBalance[]
    preBalances: number[]; postBalances: number[]
  }
}

const LAMPORTS = 1e9

function targetDeltaByOwner(tx: ParsedTx, selfWallets: Set<string>, targetMint: string) {
  const pre = new Map<string, number>(), post = new Map<string, number>()
  for (const b of tx.meta.preTokenBalances)
    if (b.mint === targetMint && selfWallets.has(b.owner))
      pre.set(b.owner, (pre.get(b.owner) ?? 0) + (b.uiTokenAmount.uiAmount ?? 0))
  for (const b of tx.meta.postTokenBalances)
    if (b.mint === targetMint && selfWallets.has(b.owner))
      post.set(b.owner, (post.get(b.owner) ?? 0) + (b.uiTokenAmount.uiAmount ?? 0))
  let receiver: string | null = null, delta = 0
  for (const [owner, p] of post) {
    const d = p - (pre.get(owner) ?? 0)
    if (d > delta) { delta = d; receiver = owner }
  }
  return { receiver, delta }
}

function findSolCost(tx: ParsedTx, selfWallets: Set<string>) {
  const keys = tx.transaction.message.accountKeys
  let best: { wallet: string; amount: number } | null = null
  for (let i = 0; i < keys.length; i++) {
    if (!selfWallets.has(keys[i].pubkey)) continue
    const spent = (tx.meta.preBalances[i] - tx.meta.postBalances[i]) / LAMPORTS
    if (spent > (best?.amount ?? 0)) best = { wallet: keys[i].pubkey, amount: spent }
  }
  return best
}

export function traceAcquisitionLegs(
  txs: ParsedTx[], selfWallets: string[], targetMint: string,
): AcquisitionLeg[] {
  const self = new Set(selfWallets)
  const legs: AcquisitionLeg[] = []
  for (const tx of txs) {
    const { receiver, delta } = targetDeltaByOwner(tx, self, targetMint)
    if (!receiver || delta <= 0) continue
    const cost = findSolCost(tx, self)
    const funded = !!cost && cost.wallet !== receiver
    legs.push({
      signature: tx.transaction.signatures[0],
      slot: tx.slot,
      blockTime: tx.blockTime ?? 0,
      mint: targetMint,
      amount: delta,
      costInputMint: cost ? SOL_MINT : null,
      costInputAmount: cost ? cost.amount : 0,
      costUsd: null,
      priceConfidence: 'none',
      fundedByExternalSigner: funded,
      fundingWallet: funded ? cost!.wallet : null,
    })
  }
  return legs
}
