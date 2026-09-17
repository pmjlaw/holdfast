export type ThesisVerdict = 'INTACT' | 'CRACKING' | 'BROKEN'
export type SignalStatus = 'ok' | 'warn' | 'alarm'
export type SignalKey = 'concentration' | 'whale_flow' | 'liquidity'

export interface ThesisSignal {
  key: SignalKey
  label: string
  value: number | null
  baseline: number | null
  changePct: number | null
  status: SignalStatus
  note: string
}

export interface ThesisMetric { value: number; baseline: number }

export interface ThesisReport {
  targetMint: string
  windowDays: number
  signals: ThesisSignal[]
  verdict: ThesisVerdict
  asOf: number
  partial: boolean
}

interface SignalSpec {
  key: SignalKey
  label: string
  bearish: 'down' | 'up'
  warnPct: number
  alarmPct: number
}

export const SIGNAL_SPECS: Record<SignalKey, SignalSpec> = {
  concentration: { key: 'concentration', label: 'Holder concentration', bearish: 'down', warnPct: 0.05, alarmPct: 0.15 },
  whale_flow:    { key: 'whale_flow',    label: 'Whale net position',   bearish: 'down', warnPct: 0.05, alarmPct: 0.15 },
  liquidity:     { key: 'liquidity',     label: 'DEX liquidity depth',  bearish: 'down', warnPct: 0.05, alarmPct: 0.15 },
}

function classify(spec: SignalSpec, metric: ThesisMetric | null): ThesisSignal {
  if (!metric) {
    return { key: spec.key, label: spec.label, value: null, baseline: null, changePct: null, status: 'warn', note: 'signal unavailable' }
  }
  const changePct = metric.baseline === 0 ? 0 : (metric.value - metric.baseline) / metric.baseline
  const bearishDelta = spec.bearish === 'down' ? -changePct : changePct
  let status: SignalStatus = 'ok'
  if (bearishDelta >= spec.alarmPct) status = 'alarm'
  else if (Math.abs(changePct) >= spec.warnPct) status = 'warn'
  const dir = changePct >= 0 ? 'up' : 'down'
  const note = `${(changePct * 100).toFixed(1)}% ${dir} over window`
  return { key: spec.key, label: spec.label, value: metric.value, baseline: metric.baseline, changePct, status, note }
}

function applyNoiseFilter(signals: ThesisSignal[]): void {
  const concentration = signals.find(s => s.key === 'concentration')
  const liquidity = signals.find(s => s.key === 'liquidity')
  if (concentration?.status === 'alarm' && liquidity && liquidity.changePct !== null && liquidity.changePct >= 0.15) {
    concentration.status = 'warn'
    concentration.note += ' — likely AMM liquidity, not distribution'
  }
}

export function foldVerdict(signals: ThesisSignal[]): ThesisVerdict {
  const alarms = signals.filter(s => s.status === 'alarm').length
  const warns = signals.filter(s => s.status === 'warn').length
  if (alarms >= 2) return 'BROKEN'
  if (alarms === 1 || warns >= 2) return 'CRACKING'
  return 'INTACT'
}

export function assembleThesisReport(input: {
  targetMint: string
  windowDays: number
  asOf: number
  metrics: Partial<Record<SignalKey, ThesisMetric | null>>
}): ThesisReport {
  const keys: SignalKey[] = Object.keys(input.metrics) as SignalKey[]
  const signals = keys.map(k => classify(SIGNAL_SPECS[k], input.metrics[k] ?? null))
  applyNoiseFilter(signals)
  return {
    targetMint: input.targetMint,
    windowDays: input.windowDays,
    signals,
    verdict: foldVerdict(signals),
    asOf: input.asOf,
    partial: signals.some(s => s.value === null),
  }
}
