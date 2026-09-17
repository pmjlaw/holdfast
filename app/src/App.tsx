// app/src/App.tsx
import { useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { buildReport, type BasisReport } from '@holdfast/engine'
import { BasisReportView } from './components/BasisReportView'
import { LegDiffView } from './components/LegDiffView'
import { ThesisPanel } from './components/ThesisPanel'
import { AnchorPanel } from './components/AnchorPanel'

export function App() {
  const [wallet, setWallet] = useState('')
  const [targetMint, setTargetMint] = useState('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')
  const [report, setReport] = useState<BasisReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTrace = async () => {
    if (!wallet) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const result = await buildReport({
        rpcUrl: import.meta.env.VITE_MAINNET_RPC ?? 'https://api.mainnet-beta.solana.com',
        targetMint,
        wallets: [wallet]
      })
      setReport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Conviction</h1>
      <p>Know your real basis. Know if your thesis still holds. Hold the line — or break it honestly.</p>
      <WalletMultiButton />
      <input
        value={wallet}
        onChange={e => setWallet(e.target.value)}
        placeholder="Paste a Solana wallet to trace"
        style={{ width: '100%', marginTop: 16 }}
      />
      <input
        value={targetMint}
        onChange={e => setTargetMint(e.target.value)}
        placeholder="Token mint (BONK by default)"
        style={{ width: '100%', marginTop: 8 }}
      />
      <button
        onClick={handleTrace}
        disabled={!wallet || loading}
        style={{ marginTop: 16, padding: '8px 16px' }}
      >
        {loading ? 'Tracing…' : 'Trace'}
      </button>
      {error && <p style={{ color: 'red', marginTop: 16 }}>Error: {error}</p>}
      {report && (
        <>
          <BasisReportView report={report} />
          <LegDiffView legs={report.legs} />
          <ThesisPanel mint={targetMint} />
          <AnchorPanel report={report} />
        </>
      )}
    </main>
  )
}
