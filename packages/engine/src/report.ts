import { createHash } from 'node:crypto'
import type { AcquisitionLeg, BasisReport } from './types'
import { reconcile } from './reconcile'

export interface BasisInput {
  targetMint: string; wallets: string[]; legs: AcquisitionLeg[]; currentPriceUsd: number
}

export function computeBasisReport(input: BasisInput): BasisReport {
  const { targetMint, wallets, legs, currentPriceUsd } = input
  const totalAcquired = legs.reduce((s, l) => s + l.amount, 0)
  const { primaryCostUsd, agree } = reconcile(legs)
  const totalCostUsd = primaryCostUsd
  const weightedBasisUsd = totalAcquired > 0 ? totalCostUsd / totalAcquired : 0
  const currentValueUsd = totalAcquired * currentPriceUsd
  const drawdownPct = weightedBasisUsd > 0 ? (currentPriceUsd - weightedBasisUsd) / weightedBasisUsd : 0
  const distanceToBreakevenUsd = Math.max(0, (weightedBasisUsd - currentPriceUsd) * totalAcquired)
  const report: BasisReport = {
    targetMint, wallets, legs, totalAcquired, totalCostUsd, weightedBasisUsd,
    currentPriceUsd, currentValueUsd, drawdownPct, distanceToBreakevenUsd,
    misattributedLegs: legs.filter(l => l.fundedByExternalSigner),
    reconciled: agree, basisHash: '',
  }
  report.basisHash = hashReport(report)
  return report
}

export function hashReport(r: BasisReport): string {
  const canonical = JSON.stringify({
    targetMint: r.targetMint,
    wallets: [...r.wallets].sort(),
    legs: r.legs.map(l => ({ signature: l.signature, mint: l.mint, amount: l.amount, costUsd: l.costUsd })),
    totalCostUsd: r.totalCostUsd,
    weightedBasisUsd: r.weightedBasisUsd,
    snapshotless: true,
  })
  return createHash('sha256').update(canonical).digest('hex')
}
