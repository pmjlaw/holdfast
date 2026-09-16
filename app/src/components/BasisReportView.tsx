// app/src/components/BasisReportView.tsx
import type { BasisReport } from '@holdfast/engine'
export function BasisReportView({ report }: { report: BasisReport }) {
  const dd = (report.drawdownPct * 100).toFixed(1)
  return (
    <section>
      <h2>True basis ${report.weightedBasisUsd.toFixed(4)}</h2>
      <p>{report.totalAcquired.toLocaleString()} tokens · drawdown {dd}% · ${report.distanceToBreakevenUsd.toLocaleString()} to breakeven</p>
      <p>Self-consistency: {report.reconciled ? '✅ arithmetic ties out' : '⚠️ internal drift'}</p>
    </section>
  )
}
