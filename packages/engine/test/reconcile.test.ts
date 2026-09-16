import { describe, it, expect } from 'vitest'
import { reconcile } from '../src/reconcile'
import type { AcquisitionLeg } from '../src/types'

const leg = (costUsd: number, amt: number): AcquisitionLeg => ({
  signature: 's', slot: 1, blockTime: 1, mint: 'T', amount: amt,
  costInputMint: 'So11111111111111111111111111111111111111112', costInputAmount: amt,
  costUsd, priceConfidence: 'exact', fundedByExternalSigner: false, fundingWallet: null,
})

describe('reconcile', () => {
  it('agrees on consistent legs', () => {
    const r = reconcile([leg(100, 1), leg(200, 2)])
    expect(r.primaryCostUsd).toBeCloseTo(300)
    expect(r.agree).toBe(true)
  })
})
