import { describe, it, expect } from 'vitest'
import { SOL_MINT, USDC_MINT, type AcquisitionLeg } from '../src/types'

describe('types', () => {
  it('exports canonical mints', () => {
    expect(SOL_MINT).toBe('So11111111111111111111111111111111111111112')
    expect(USDC_MINT).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
  })
  it('constructs a leg', () => {
    const leg: AcquisitionLeg = {
      signature: 's', slot: 1, blockTime: 100, mint: 'M', amount: 10,
      costInputMint: SOL_MINT, costInputAmount: 2, costUsd: 174,
      priceConfidence: 'exact', fundedByExternalSigner: false, fundingWallet: null,
    }
    expect(leg.costUsd).toBe(174)
  })
})
