// programs/holdfast/tests/holdfast.ts
import * as anchor from '@coral-xyz/anchor'
import { assert } from 'chai'

describe('holdfast', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.Holdfast as anchor.Program
  const owner = provider.wallet.publicKey

  const pda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('conviction'), owner.toBuffer()], program.programId)[0]

  it('anchors a conviction', async () => {
    const hash = new Array(32).fill(7)
    await program.methods.anchorConviction(new anchor.BN(1000), hash, new anchor.BN(42))
      .accounts({ owner }).rpc()
    const acc = await program.account.convictionAnchor.fetch(pda)
    assert.equal(acc.line.toNumber(), 1000)
    assert.equal(acc.breakCount, 0)
    assert.equal(acc.version, 0)
  })

  it('records a break permanently', async () => {
    await program.methods.recordBreak().accounts({ owner }).rpc()
    const acc = await program.account.convictionAnchor.fetch(pda)
    assert.equal(acc.breakCount, 1)
  })
})
