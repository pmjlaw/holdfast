import type { Pricer, PriceConfidence, AcquisitionLeg } from './types'

const LLAMA = 'https://coins.llama.fi'
const JUP = 'https://lite-api.jup.ag/price/v3'

export function createLlamaPricer(fetchFn: typeof fetch = fetch): Pricer {
  return {
    async priceAt(mint, unixSeconds): Promise<{ price: number; confidence: PriceConfidence }> {
      const key = `solana:${mint}`
      const res = await fetchFn(`${LLAMA}/prices/historical/${unixSeconds}/${key}?searchWidth=6h`)
      if (!res.ok) return { price: 0, confidence: 'none' }
      const data = await res.json() as { coins: Record<string, { price?: number }> }
      const price = data.coins?.[key]?.price
      if (typeof price !== 'number') return { price: 0, confidence: 'none' }
      return { price, confidence: 'exact' }
    },
    async spot(mint): Promise<number> {
      const res = await fetchFn(`${JUP}?ids=${mint}`)
      if (!res.ok) return 0
      const data = await res.json() as Record<string, { usdPrice?: number }>
      return data[mint]?.usdPrice ?? 0
    },
  }
}

export async function priceLegs(legs: AcquisitionLeg[], pricer: Pricer): Promise<AcquisitionLeg[]> {
  return Promise.all(legs.map(async (leg) => {
    if (!leg.costInputMint) return { ...leg, costUsd: null, priceConfidence: 'none' as const }
    const { price, confidence } = await pricer.priceAt(leg.costInputMint, leg.blockTime)
    const costUsd = price > 0 ? leg.costInputAmount * price : null
    return { ...leg, costUsd, priceConfidence: confidence }
  }))
}
