import { useEffect, useState } from 'react'
import type { ThesisReport } from '@holdfast/engine'

const COLOR = { INTACT: 'green', CRACKING: 'orange', BROKEN: 'red' } as const

export function ThesisPanel({ mint }: { mint: string }) {
  const [data, setData] = useState<ThesisReport | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    fetch(`/api/thesis?mint=${mint}&windowDays=7`)
      .then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [mint])
  if (loading) return <p>Checking thesis health…</p>
  if (!data) return <p>Thesis health unavailable.</p>
  return (
    <section>
      <h3>Is your thesis still true?</h3>
      <p style={{ fontWeight: 700, color: COLOR[data.verdict] }}>
        Verdict: {data.verdict}{data.partial ? ' (partial)' : ''}
      </p>
      <ul>
        {data.signals.map(s => (
          <li key={s.key}>
            <strong>{s.label}:</strong> {s.status.toUpperCase()} — {s.note}
          </li>
        ))}
      </ul>
    </section>
  )
}
