use anchor_lang::prelude::*;

declare_id!("9hUyPGeYFxdfrp5XmrkaVoEbB1V8hjuigXdUAM7LQTXi");

#[program]
pub mod vangai {
    use solana_program::{program::invoke, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, vangai_owner: Pubkey, cabina_wallet: Pubkey, token_fund_wallet: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.vangai_owner = vangai_owner;
        state.cabina_wallet = cabina_wallet;
        state.token_fund_wallet = token_fund_wallet;
        let vangai_owner_share_numerator: u64 = 45_00;
        let cabinai_wallet_share_numerator: u64 = 45_00;
        let token_fund_wallet_share_numerator: u64 = 10_00;
        let total_share: u64 = cabinai_wallet_share_numerator + token_fund_wallet_share_numerator + vangai_owner_share_numerator;
        require!(total_share == 100_00, CustomError::InvalidDistribution);
        state.min_lamports = 0u64;
        state.total_points = 0u64;
        state.vangai_owner_share_numerator = vangai_owner_share_numerator;
        state.cabinai_wallet_share_numerator = cabinai_wallet_share_numerator;
        state.token_fund_wallet_share_numerator = token_fund_wallet_share_numerator;
        Ok(())
    }

    pub fn mint(ctx: Context<MintNFT>, lamports_amount: u64) -> Result<()> {        
        let state = &mut ctx.accounts.state;
        
        let vangai_owner_share: u64 = lamports_amount * state.vangai_owner_share_numerator / 100_00;
        let cabina_share: u64 = (lamports_amount * state.cabinai_wallet_share_numerator) / 100_00;
        let token_fund_share: u64 = lamports_amount - vangai_owner_share - cabina_share;
        let min_lamports: u64 = state.min_lamports;
        require!(lamports_amount >= min_lamports, CustomError::InvalidLamportsAmount);
        
        // Transfer to Vangai Owner wallet
        invoke(
            &system_instruction::transfer(
                ctx.accounts.minter.key,
                &state.vangai_owner.key(),
                vangai_owner_share,
            ),
            &[
                ctx.accounts.minter.to_account_info(),
                ctx.accounts.vangai_owner.to_account_info(),
            ],
        )?;

        // Transfer to Cabina Wallet
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.minter.key(),
                &state.cabina_wallet,
                cabina_share,
            ),
            &[
                ctx.accounts.minter.to_account_info(),
                ctx.accounts.cabina_wallet.to_account_info(),
            ],
        )?;

        // Transfer to Token Fund Wallet
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.minter.key(),
                &state.token_fund_wallet,
                token_fund_share,
            ),
            &[
                ctx.accounts.minter.to_account_info(),
                ctx.accounts.token_fund_wallet.to_account_info(),
            ],
        )?;
        
        // Append points
        let minter_state = &mut ctx.accounts.minter_state;
        minter_state.minter_points += lamports_amount;
        state.total_points += lamports_amount;

        Ok(())
    }

    pub fn transfer_vangai_ownership(ctx: Context<TransferVangaiOwnership>, new_vangai_owner: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(ctx.accounts.vangai_owner.key() == state.vangai_owner, CustomError::InvalidVangaiOwner);
        state.vangai_owner = new_vangai_owner;
        Ok(())
    }

    pub fn set_cabina_wallet(ctx: Context<SetWallet>, cabina_wallet: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(ctx.accounts.vangai_owner.key() == state.vangai_owner, CustomError::InvalidVangaiOwner);
        state.cabina_wallet = cabina_wallet;
        Ok(())
    }

    pub fn set_token_fund_wallet(ctx: Context<SetWallet>, token_fund_wallet: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(ctx.accounts.vangai_owner.key() == state.vangai_owner, CustomError::InvalidVangaiOwner);
        state.token_fund_wallet = token_fund_wallet;
        Ok(())
    }

    pub fn set_min_lamports(ctx: Context<SetMinLamports>, new_min_lamports: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.min_lamports = new_min_lamports;
        Ok(())
    }

    pub fn set_distribution(
        ctx: Context<SetDistribution>,
        vangai_owner_share_numerator: u64,
        cabinai_wallet_share_numerator: u64,
        token_fund_wallet_share_numerator: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(ctx.accounts.vangai_owner.key() == state.vangai_owner, CustomError::InvalidVangaiOwner);

        // Ensure the shares add up to 100
        let total_share = vangai_owner_share_numerator + cabinai_wallet_share_numerator + token_fund_wallet_share_numerator;
        require!(total_share == 100_00, CustomError::InvalidDistribution);

        state.vangai_owner_share_numerator = vangai_owner_share_numerator;
        state.cabinai_wallet_share_numerator = cabinai_wallet_share_numerator;
        state.token_fund_wallet_share_numerator = token_fund_wallet_share_numerator;

        Ok(())
    }

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 32 * 4 + 3 * 8)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(
        init_if_needed,
        payer = minter,
        space = 8 + MinterState::SIZE,
        seeds = [ minter.key().as_ref()], bump)]
    pub minter_state: Account<'info, MinterState>,
    /// CHECK: minter pays to all actors
    #[account(mut, signer)]
    pub minter: AccountInfo<'info>,


    /// CHECK: vangai_owner is grabbed from state
    #[account(mut, address = state.vangai_owner @ CustomError::InvalidVangaiOwner)]
    pub vangai_owner: AccountInfo<'info>,
    /// CHECK: cabina_wallet is grabbed from state
    #[account(mut, address = state.cabina_wallet @ CustomError::InvalidCabinaWallet)]
    pub cabina_wallet: AccountInfo<'info>,
    /// CHECK: token_fund_wallet is grabbed from state
    #[account(mut, address = state.token_fund_wallet @ CustomError::InvalidTokenFundWallet)]
    pub token_fund_wallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetWallet<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    /// CHECK: This account is validated by ensuring it matches the `vangai_owner` in the state
    #[account(signer, address = state.vangai_owner @ CustomError::InvalidVangaiOwner)]
    pub vangai_owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetDistribution<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    /// CHECK: This account is validated by ensuring it matches the `vangai_owner` in the state
    #[account(signer, address = state.vangai_owner @ CustomError::InvalidVangaiOwner)]
    pub vangai_owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetMinLamports<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    /// CHECK: This account is validated by ensuring it matches the `vangai_owner` in the state
    #[account(signer, address = state.vangai_owner @ CustomError::InvalidVangaiOwner)]
    pub vangai_owner: AccountInfo<'info>,
}


#[derive(Accounts)]
pub struct TransferVangaiOwnership<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    /// CHECK: This account is validated by ensuring it matches the `vangai_owner` in the state
    #[account(signer, address = state.vangai_owner @ CustomError::InvalidVangaiOwner)]
    pub vangai_owner: AccountInfo<'info>,
}

#[account]
pub struct State {
    pub vangai_owner: Pubkey,
    pub cabina_wallet: Pubkey,
    pub token_fund_wallet: Pubkey,
    pub min_lamports: u64,
    pub total_points: u64,
    pub vangai_owner_share_numerator: u64, // % share
    pub cabinai_wallet_share_numerator: u64, // % share
    pub token_fund_wallet_share_numerator: u64, // % share

}

#[account]
pub struct MinterState {
    pub minter_points: u64
}

impl MinterState {
    const SIZE: usize = 8;
}

#[error_code]
pub enum CustomError {
    #[msg("Insufficient lamports")]
    InvalidLamportsAmount,
    #[msg("Not VangAI Owner ")]
    InvalidVangaiOwner,
    #[msg("Not Cabina Wallet")]
    InvalidCabinaWallet,
    #[msg("Not Token Fund Wallet")]
    InvalidTokenFundWallet,
    #[msg("Invalid Distribution. Shares sum must be equal 100% or 100_00.")]
    InvalidDistribution,
}