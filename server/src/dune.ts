import type { ThesisMetric } from '@holdfast/engine'

export interface DuneRow { metric: 'now' | 'baseline'; value: number }

export function rowsToMetric(rows: DuneRow[]): ThesisMetric | null {
  const now = rows.find(r => r.metric === 'now')
  const baseline = rows.find(r => r.metric === 'baseline')
  if (!now || !baseline) return null
  return { value: now.value, baseline: baseline.value }
}

const BASE = 'https://api.dune.com/api/v1'

export async function runQuery(queryId: number, params: Record<string, string | number>, apiKey: string): Promise<DuneRow[]> {
  const exec = await fetch(`${BASE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: { 'x-dune-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ query_parameters: params }),
  })
  const { execution_id } = await exec.json()
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const st = await fetch(`${BASE}/execution/${execution_id}/status`, { headers: { 'x-dune-api-key': apiKey } })
    const { state } = await st.json()
    if (state === 'QUERY_STATE_COMPLETED') break
    if (state === 'QUERY_STATE_FAILED') throw new Error(`Dune query ${queryId} failed`)
  }
  const res = await fetch(`${BASE}/execution/${execution_id}/results`, { headers: { 'x-dune-api-key': apiKey } })
  const body = await res.json()
  return body.result.rows as DuneRow[]
}
