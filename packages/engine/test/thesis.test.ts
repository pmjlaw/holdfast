import { describe, it, expect } from 'vitest'
import { assembleThesisReport } from '../src/thesis'

const mint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'

describe('assembleThesisReport', () => {
  it('INTACT when metrics are stable', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.50, baseline: 0.49 },
        whale_flow: { value: 1000, baseline: 1000 },
      },
    })
    expect(r.verdict).toBe('INTACT')
    expect(r.signals).toHaveLength(2)
  })

  it('CRACKING on a single bearish alarm', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.40, baseline: 0.50 }, // -20% => alarm (bearish down)
        whale_flow: { value: 1000, baseline: 1000 },
      },
    })
    expect(r.signals.find(s => s.key === 'concentration')!.status).toBe('alarm')
    expect(r.verdict).toBe('CRACKING')
  })

  it('BROKEN on two bearish alarms', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.40, baseline: 0.50 },
        whale_flow: { value: 700, baseline: 1000 },
      },
    })
    expect(r.verdict).toBe('BROKEN')
  })

  it('CRACKING on two warns, no alarm', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.46, baseline: 0.50 }, // -8% => warn
        whale_flow: { value: 920, baseline: 1000 },       // -8% => warn
      },
    })
    expect(r.verdict).toBe('CRACKING')
  })

  it('marks a null metric unavailable as warn, never fabricates', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: null,
        whale_flow: { value: 1000, baseline: 1000 },
      },
    })
    const c = r.signals.find(s => s.key === 'concentration')!
    expect(c.status).toBe('warn')
    expect(c.note).toMatch(/unavailable/i)
    expect(c.value).toBeNull()
  })

  it('demotes a concentration alarm explained by rising liquidity', () => {
    const r = assembleThesisReport({
      targetMint: mint, windowDays: 7, asOf: 100,
      metrics: {
        concentration: { value: 0.40, baseline: 0.50 },
        liquidity:     { value: 1.30, baseline: 1.00 },
      },
    })
    const c = r.signals.find(s => s.key === 'concentration')!
    expect(c.status).toBe('warn')
    expect(c.note).toMatch(/liquidity/i)
  })
})
