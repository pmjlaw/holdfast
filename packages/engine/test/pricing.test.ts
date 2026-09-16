import { describe, it, expect, vi } from 'vitest'
import { createLlamaPricer, priceLegs } from '../src/pricing'
import { SOL_MINT, type AcquisitionLeg } from '../src/types'

const mockFetch = vi.fn(async (url: string) => ({
  ok: true,
  json: async () => ({ coins: { [`solana:${SOL_MINT}`]: { price: 174.0 } } }),
})) as unknown as typeof fetch

describe('pricing', () => {
  it('prices a leg at block time', async () => {
    const pricer = createLlamaPricer(mockFetch)
    const leg: AcquisitionLeg = {
      signature: 's', slot: 1, blockTime: 1700000000, mint: 'TARGET', amount: 100,
      costInputMint: SOL_MINT, costInputAmount: 2, costUsd: null,
      priceConfidence: 'none', fundedByExternalSigner: false, fundingWallet: null,
    }
    const [out] = await priceLegs([leg], pricer)
    expect(out.costUsd).toBeCloseTo(348) // 2 * 174
    expect(out.priceConfidence).toBe('exact')
  })

  it('treats null-cost legs as zero', async () => {
    const pricer = createLlamaPricer(mockFetch)
    const leg: AcquisitionLeg = {
      signature: 's', slot: 1, blockTime: 1700000000, mint: 'TARGET', amount: 5,
      costInputMint: null, costInputAmount: 0, costUsd: null,
      priceConfidence: 'none', fundedByExternalSigner: false, fundingWallet: null,
    }
    const [out] = await priceLegs([leg], pricer)
    expect(out.costUsd).toBe(0)
  })
})
