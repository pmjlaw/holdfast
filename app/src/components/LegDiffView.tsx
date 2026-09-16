// app/src/components/LegDiffView.tsx
import type { AcquisitionLeg } from '@holdfast/engine'
export function LegDiffView({ legs }: { legs: AcquisitionLeg[] }) {
  const missed = legs.filter(l => l.fundedByExternalSigner)
  if (missed.length === 0) return null
  return (
    <section>
      <h3>What single-wallet trackers get wrong ({missed.length})</h3>
      <ul>
        {missed.map(l => (
          <li key={l.signature}>
            {l.amount.toLocaleString()} tokens funded by <code>{l.fundingWallet}</code> —
            cost ${l.costUsd?.toFixed(2) ?? '—'} ({l.priceConfidence}). Trackers label this "free".
          </li>
        ))}
      </ul>
    </section>
  )
}
