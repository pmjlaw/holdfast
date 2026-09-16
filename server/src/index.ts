import express from 'express'
import { readFileSync } from 'node:fs'
import { assembleThesisReport, type SignalKey, type ThesisMetric } from '@holdfast/engine'
import { runQuery, rowsToMetric } from './dune'

const queries = JSON.parse(readFileSync(new URL('../dune-queries.json', import.meta.url), 'utf8'))
const KEY = process.env.DUNE_API_KEY ?? ''
const app = express()

app.get('/api/thesis', async (req, res) => {
  const mint = String(req.query.mint ?? '')
  const windowDays = Number(req.query.windowDays ?? 7)
  if (!mint) return res.status(400).json({ error: 'mint required' })
  const metrics: Partial<Record<SignalKey, ThesisMetric | null>> = {}
  for (const key of ['concentration', 'whale_flow'] as SignalKey[]) {
    try {
      const rows = await runQuery(queries[key].queryId, { mint, window_days: windowDays, top_n: 20 }, KEY)
      metrics[key] = rowsToMetric(rows)
    } catch {
      metrics[key] = null
    }
  }
  res.json(assembleThesisReport({ targetMint: mint, windowDays, asOf: Math.floor(Date.now() / 1000), metrics }))
})

app.listen(8787, () => console.log('thesis server on :8787'))
