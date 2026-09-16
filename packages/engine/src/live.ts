import { Connection, PublicKey } from '@solana/web3.js'
import { traceAcquisitionLegs, type ParsedTx } from './tracer'
import { createLlamaPricer, priceLegs } from './pricing'
import { computeBasisReport } from './report'
import type { BasisReport } from './types'

export async function fetchParsedTxs(conn: Connection, wallet: string, limit = 200): Promise<ParsedTx[]> {
  const sigs = await conn.getSignaturesForAddress(new PublicKey(wallet), { limit })
  const out: ParsedTx[] = []
  for (const s of sigs) {
    const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 })
    if (!tx?.meta) continue
    out.push({
      slot: tx.slot, blockTime: tx.blockTime ?? null,
      transaction: {
        signatures: tx.transaction.signatures,
        message: { accountKeys: tx.transaction.message.accountKeys.map(k => ({ pubkey: k.pubkey.toBase58(), signer: k.signer })) },
      },
      meta: {
        preBalances: tx.meta.preBalances, postBalances: tx.meta.postBalances,
        preTokenBalances: (tx.meta.preTokenBalances ?? []).map(b => ({ accountIndex: b.accountIndex, mint: b.mint, owner: b.owner ?? '', uiTokenAmount: { uiAmount: b.uiTokenAmount.uiAmount } })),
        postTokenBalances: (tx.meta.postTokenBalances ?? []).map(b => ({ accountIndex: b.accountIndex, mint: b.mint, owner: b.owner ?? '', uiTokenAmount: { uiAmount: b.uiTokenAmount.uiAmount } })),
      },
    })
  }
  return out
}

export async function buildReport(opts: { rpcUrl: string; targetMint: string; wallets: string[] }): Promise<BasisReport> {
  const conn = new Connection(opts.rpcUrl, 'confirmed')
  const txs = (await Promise.all(opts.wallets.map(w => fetchParsedTxs(conn, w)))).flat()
  const raw = traceAcquisitionLegs(txs, opts.wallets, opts.targetMint)
  const pricer = createLlamaPricer()
  const priced = await priceLegs(raw, pricer)
  const currentPriceUsd = await pricer.spot(opts.targetMint)
  return computeBasisReport({ targetMint: opts.targetMint, wallets: opts.wallets, legs: priced, currentPriceUsd })
}
