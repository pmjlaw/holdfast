import { describe, it, expect } from 'vitest'
import self from './fixtures/parsedTx_selfsigner.json'
import ext from './fixtures/parsedTx_externalsigner.json'
import feepayer from './fixtures/parsedTx_feepayer.json'
import { traceAcquisitionLegs, type ParsedTx } from '../src/tracer'
import { SOL_MINT } from '../src/types'

const selfWallets = ['WALLET_A', 'WALLET_B']

describe('traceAcquisitionLegs', () => {
  it('detects a same-wallet acquisition with SOL cost', () => {
    const legs = traceAcquisitionLegs([self as unknown as ParsedTx], selfWallets, 'TARGET')
    expect(legs).toHaveLength(1)
    expect(legs[0].amount).toBe(100)
    expect(legs[0].costInputMint).toBe(SOL_MINT)
    expect(legs[0].costInputAmount).toBeCloseTo(2) // 2 SOL spent
    expect(legs[0].fundedByExternalSigner).toBe(false)
  })

  it('flags the external-signer leg trackers miss', () => {
    const legs = traceAcquisitionLegs([ext as unknown as ParsedTx], selfWallets, 'TARGET')
    expect(legs).toHaveLength(1)
    expect(legs[0].amount).toBe(50)
    expect(legs[0].costInputMint).toBe(SOL_MINT)
    expect(legs[0].costInputAmount).toBeCloseTo(3)
    expect(legs[0].fundedByExternalSigner).toBe(true)
    expect(legs[0].fundingWallet).toBe('WALLET_B')
  })

  it('flags a leg funded by a different signer even when receiver paid its own SOL', () => {
    const legs = traceAcquisitionLegs([feepayer as unknown as ParsedTx], selfWallets, 'TARGET')
    expect(legs).toHaveLength(1)
    expect(legs[0].fundedByExternalSigner).toBe(true)
    expect(legs[0].fundingWallet).toBe('WALLET_B')
    expect(legs[0].costInputAmount).toBeCloseTo(2)
  })
})
