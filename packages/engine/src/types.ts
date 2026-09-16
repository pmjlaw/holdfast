export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

export type PriceConfidence = 'exact' | 'nearest' | 'none'

export interface AcquisitionLeg {
  signature: string
  slot: number
  blockTime: number            // unix seconds
  mint: string                 // token acquired
  amount: number               // UI amount acquired (net increase for self-set)
  costInputMint: string | null // token spent; null => no on-chain cost found (airdrop/free)
  costInputAmount: number      // UI amount spent
  costUsd: number | null       // USD cost at block time; null if unpriceable
  priceConfidence: PriceConfidence
  fundedByExternalSigner: boolean // the leg single-wallet trackers get wrong
  fundingWallet: string | null
}

export interface BasisReport {
  targetMint: string
  wallets: string[]
  legs: AcquisitionLeg[]
  totalAcquired: number
  totalCostUsd: number
  weightedBasisUsd: number     // totalCostUsd / totalAcquired over priced legs
  currentPriceUsd: number
  currentValueUsd: number
  drawdownPct: number          // (current - basis) / basis
  distanceToBreakevenUsd: number
  misattributedLegs: AcquisitionLeg[]
  reconciled: boolean
  basisHash: string
}

export interface Pricer {
  priceAt(mint: string, unixSeconds: number): Promise<{ price: number; confidence: PriceConfidence }>
  spot(mint: string): Promise<number>
}
