// app/src/components/AnchorPanel.tsx
import { useState } from 'react'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import type { BasisReport } from '@holdfast/engine'
import { HOLDFAST_IDL, PROGRAM_ID } from '../lib/idl'

function hexToBytes(hex: string): number[] {
  const out: number[] = []
  for (let i = 0; i < 64; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16))
  return out
}

export function AnchorPanel({ report }: { report: BasisReport }) {
  const wallet = useAnchorWallet(); const { connection } = useConnection()
  const [status, setStatus] = useState('')
  if (!wallet) return <p>Connect a devnet wallet to anchor your conviction.</p>

  const provider = new AnchorProvider(connection, wallet, {})
  const program = new Program(HOLDFAST_IDL as any, provider)
  const pda = PublicKey.findProgramAddressSync(
    [Buffer.from('conviction'), wallet.publicKey.toBuffer()], new PublicKey(PROGRAM_ID))[0]

  const anchorNow = async () => {
    try {
      setStatus('anchoring…')
      const line = new BN(Math.round(report.weightedBasisUsd * 1e6))
      await program.methods.anchorConviction(line, hexToBytes(report.basisHash), new BN(0))
        .accounts({ owner: wallet.publicKey }).rpc()
      setStatus(`anchored · ${pda.toBase58()}`)
    } catch (e: any) {
      setStatus(`error: ${e.message ?? e}`)
    }
  }
  const recordBreak = async () => {
    try {
      setStatus('recording break…')
      await program.methods.recordBreak().accounts({ owner: wallet.publicKey }).rpc()
      setStatus('break recorded — permanent, cannot be erased')
    } catch (e: any) {
      setStatus(`error: ${e.message ?? e}`)
    }
  }

  return (
    <section>
      <h3>Anchor your conviction</h3>
      <p>Commit this verified basis on-chain. Future-you cannot rewrite it.</p>
      <button onClick={anchorNow}>Anchor conviction</button>
      <button onClick={recordBreak} style={{ marginLeft: 8 }}>Record a break (honest)</button>
      <p>{status}</p>
    </section>
  )
}
