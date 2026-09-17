import type { ThesisMetric } from '@holdfast/engine'

export interface DuneRow { metric: 'now' | 'baseline'; value: number }

export function rowsToMetric(rows: DuneRow[]): ThesisMetric | null {
  const now = rows.find(r => r.metric === 'now')
  const baseline = rows.find(r => r.metric === 'baseline')
  if (!now || !baseline) return null
  return { value: now.value, baseline: baseline.value }
}

const BASE = 'https://api.dune.com/api/v1'

async function fetchCachedRows(queryId: number, params: Record<string, string | number>, apiKey: string): Promise<DuneRow[] | null> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(`params.${k}`, String(v))
  const res = await fetch(`${BASE}/query/${queryId}/results?${qs}`, { headers: { 'x-dune-api-key': apiKey } })
  if (!res.ok) return null
  const body = await res.json()
  const rows = body.result?.rows as DuneRow[] | undefined
  return rows && rows.length ? rows : null
}

export async function runQuery(queryId: number, params: Record<string, string | number>, apiKey: string): Promise<DuneRow[]> {
  const cached = await fetchCachedRows(queryId, params, apiKey)
  if (cached) return cached
  const exec = await fetch(`${BASE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: { 'x-dune-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query_parameters: params }),
  })
  if (!exec.ok) throw new Error(`Dune execute ${queryId}: HTTP ${exec.status}`)
  const { execution_id } = await exec.json()
  let completed = false
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const st = await fetch(`${BASE}/execution/${execution_id}/status`, { headers: { 'x-dune-api-key': apiKey } })
    if (!st.ok) throw new Error(`Dune status ${queryId}: HTTP ${st.status}`)
    const { state } = await st.json()
    if (state === 'QUERY_STATE_COMPLETED') {
      completed = true
      break
    }
    if (state === 'QUERY_STATE_FAILED') throw new Error(`Dune query ${queryId} failed`)
  }
  if (!completed) throw new Error(`Dune query ${queryId} timed out`)
  const res = await fetch(`${BASE}/execution/${execution_id}/results`, { headers: { 'x-dune-api-key': apiKey } })
  if (!res.ok) throw new Error(`Dune results ${queryId}: HTTP ${res.status}`)
  const body = await res.json()
  return (body.result?.rows ?? []) as DuneRow[]
}
