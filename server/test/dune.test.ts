import { describe, it, expect } from 'vitest'
import { rowsToMetric } from '../src/dune'
import conc from './fixtures/concentration.json'

describe('rowsToMetric', () => {
  it('maps now/baseline rows to a ThesisMetric', () => {
    const m = rowsToMetric(conc as any)
    expect(m).toEqual({ value: 0.52, baseline: 0.50 })
  })
  it('returns null when a row is missing', () => {
    expect(rowsToMetric([{ metric: 'now', value: 0.5 }] as any)).toBeNull()
  })
})
