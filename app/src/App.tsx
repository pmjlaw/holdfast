// app/src/App.tsx
import { useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
export function App() {
  const [wallet, setWallet] = useState('')
  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>Holdfast</h1>
      <p>Chain-verified conviction. Know your true basis, hold the line.</p>
      <WalletMultiButton />
      <input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="Paste a Solana wallet" style={{ width: '100%', marginTop: 16 }} />
    </main>
  )
}
