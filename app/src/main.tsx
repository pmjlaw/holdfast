// app/src/main.tsx
import { createRoot } from 'react-dom/client'
import { Providers } from './WalletProvider'
import { App } from './App'
createRoot(document.getElementById('root')!).render(<Providers><App /></Providers>)
