import { buildReport } from '../src/live'
const [targetMint, ...wallets] = process.argv.slice(2)
const rpcUrl = process.env.HELIUS_RPC ?? 'https://api.mainnet-beta.solana.com'
buildReport({ rpcUrl, targetMint, wallets }).then(r => {
  console.log(JSON.stringify({ ...r, legs: `${r.legs.length} legs`, misattributedLegs: `${r.misattributedLegs.length} flagged` }, null, 2))
})
