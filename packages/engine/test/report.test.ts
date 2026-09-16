import { describe, it, expect } from 'vitest'
import { computeBasisReport, hashReport } from '../src/report'
import type { AcquisitionLeg } from '../src/types'

const legs: AcquisitionLeg[] = [
  { signature: 'a', slot: 1, blockTime: 1, mint: 'T', amount: 100, costInputMint: 'SOL', costInputAmount: 2, costUsd: 300, priceConfidence: 'exact', fundedByExternalSigner: false, fundingWallet: null },
  { signature: 'b', slot: 2, blockTime: 2, mint: 'T', amount: 50, costInputMint: 'SOL', costInputAmount: 3, costUsd: null, priceConfidence: 'none', fundedByExternalSigner: true, fundingWallet: 'B' },
]

describe('report', () => {
  it('computes weighted basis, drawdown, misattributed legs', () => {
    const r = computeBasisReport({ targetMint: 'T', wallets: ['A', 'B'], legs, currentPriceUsd: 1 })
    expect(r.totalAcquired).toBe(150)
    expect(r.totalCostUsd).toBe(300)
    expect(r.weightedBasisUsd).toBeCloseTo(3) // 300/100 (excludes unpriceable leg from denominator)
    expect(r.currentValueUsd).toBe(150)       // 150 * 1
    expect(r.drawdownPct).toBeCloseTo((1 - 3) / 3)
    expect(r.misattributedLegs).toHaveLength(1)
    expect(r.reconciled).toBe(true)
  })
  it('hash is stable and price-independent', () => {
    const a = computeBasisReport({ targetMint: 'T', wallets: ['A', 'B'], legs, currentPriceUsd: 1 })
    const b = computeBasisReport({ targetMint: 'T', wallets: ['A', 'B'], legs, currentPriceUsd: 999 })
    expect(hashReport(a)).toBe(hashReport(b))
    expect(hashReport(a)).toMatch(/^[0-9a-f]{64}$/)
  })
})
