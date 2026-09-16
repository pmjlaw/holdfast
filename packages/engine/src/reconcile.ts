import type { AcquisitionLeg } from './types'

export function reconcile(legs: AcquisitionLeg[]) {
  const priced = legs.filter(l => l.costUsd !== null)
  const primaryCostUsd = priced.reduce((s, l) => s + (l.costUsd ?? 0), 0)
  const byMint = new Map<string, { usd: number; amt: number }>()
  for (const l of priced) {
    const k = l.costInputMint ?? 'null'
    const cur = byMint.get(k) ?? { usd: 0, amt: 0 }
    cur.usd += l.costUsd ?? 0; cur.amt += l.costInputAmount
    byMint.set(k, cur)
  }
  let adversarialCostUsd = 0
  for (const { usd, amt } of byMint.values())
    adversarialCostUsd += amt > 0 ? amt * (usd / amt) : usd
  const denom = primaryCostUsd || 1
  const agree = Math.abs(primaryCostUsd - adversarialCostUsd) / denom < 0.005
  return { primaryCostUsd, adversarialCostUsd, agree }
}
