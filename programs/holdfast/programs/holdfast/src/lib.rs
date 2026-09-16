use anchor_lang::prelude::*;

declare_id!("7e4UKQSRh5zLvLefMWc25TRepwAsuYfVi8E8sk1CzhuN");

#[program]
pub mod holdfast {
    use super::*;

    pub fn anchor_conviction(ctx: Context<AnchorConviction>, line: u64, basis_hash: [u8; 32], snapshot_slot: u64) -> Result<()> {
        let a = &mut ctx.accounts.conviction;
        let now = Clock::get()?.unix_timestamp;
        a.owner = ctx.accounts.owner.key();
        a.line = line;
        a.basis_hash = basis_hash;
        a.snapshot_slot = snapshot_slot;
        a.created_at = now;
        a.break_count = 0;
        a.streak_start = now;
        a.version = 0;
        Ok(())
    }

    pub fn record_break(ctx: Context<Mutate>) -> Result<()> {
        let a = &mut ctx.accounts.conviction;
        a.break_count = a.break_count.checked_add(1).unwrap();
        a.streak_start = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn renew(ctx: Context<Mutate>, line: u64, basis_hash: [u8; 32], snapshot_slot: u64) -> Result<()> {
        let a = &mut ctx.accounts.conviction;
        a.line = line;
        a.basis_hash = basis_hash;
        a.snapshot_slot = snapshot_slot;
        a.version = a.version.checked_add(1).unwrap();
        Ok(())
    }
}

#[account]
pub struct ConvictionAnchor {
    pub owner: Pubkey,
    pub line: u64,
    pub basis_hash: [u8; 32],
    pub snapshot_slot: u64,
    pub created_at: i64,
    pub break_count: u32,
    pub streak_start: i64,
    pub version: u32,
}
impl ConvictionAnchor { pub const LEN: usize = 8 + 32 + 8 + 32 + 8 + 8 + 4 + 8 + 4; }

#[derive(Accounts)]
pub struct AnchorConviction<'info> {
    #[account(init, payer = owner, space = ConvictionAnchor::LEN, seeds = [b"conviction", owner.key().as_ref()], bump)]
    pub conviction: Account<'info, ConvictionAnchor>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Mutate<'info> {
    #[account(mut, seeds = [b"conviction", owner.key().as_ref()], bump, has_one = owner)]
    pub conviction: Account<'info, ConvictionAnchor>,
    pub owner: Signer<'info>,
}
