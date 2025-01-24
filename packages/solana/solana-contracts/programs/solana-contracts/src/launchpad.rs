use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::convert::TryFrom;

declare_id!("Your_Program_ID");

#[program]
pub mod launchpad {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        token_price: u64,
        soft_cap: u64,
        hard_cap: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.token_price = token_price;
        pool.soft_cap = soft_cap;
        pool.hard_cap = hard_cap;
        pool.start_time = start_time;
        pool.end_time = end_time;
        pool.finalized = false;
        pool.total_invested = 0;
        
        Ok(())
    }

    pub fn invest(ctx: Context<Invest>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= pool.start_time,
            ErrorCode::PoolNotStarted
        );
        require!(
            clock.unix_timestamp <= pool.end_time,
            ErrorCode::PoolEnded
        );
        require!(!pool.finalized, ErrorCode::PoolFinalized);

        // Calculate token amount based on price
        let token_amount = amount
            .checked_mul(pool.token_price)
            .ok_or(ErrorCode::NumberOverflow)?;

        // Transfer SOL to pool
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.investor.key(),
            &pool.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.investor.to_account_info(),
                ctx.accounts.pool.to_account_info(),
            ],
        )?;

        // Create vesting schedule
        let vesting = &mut ctx.accounts.vesting;
        vesting.investor = ctx.accounts.investor.key();
        vesting.pool = pool.key();
        vesting.total_amount = token_amount;
        vesting.claimed_amount = 0;
        vesting.start_time = pool.end_time;
        vesting.cliff = 2_592_000; // 30 days in seconds
        vesting.duration = 15_552_000; // 180 days in seconds

        pool.total_invested = pool.total_invested.checked_add(amount)
            .ok_or(ErrorCode::NumberOverflow)?;

        Ok(())
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let vesting = &mut ctx.accounts.vesting;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= vesting.start_time + vesting.cliff,
            ErrorCode::CliffNotReached
        );

        let elapsed_time = clock.unix_timestamp - vesting.start_time;
        let vested_amount = if elapsed_time >= vesting.duration {
            vesting.total_amount
        } else {
            vesting.total_amount
                .checked_mul(elapsed_time as u64)
                .ok_or(ErrorCode::NumberOverflow)?
                .checked_div(vesting.duration as u64)
                .ok_or(ErrorCode::NumberOverflow)?
        };

        let claimable_amount = vested_amount
            .checked_sub(vesting.claimed_amount)
            .ok_or(ErrorCode::NumberOverflow)?;

        require!(claimable_amount > 0, ErrorCode::NoTokensToClaim);

        // Transfer tokens
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_token_account.to_account_info(),
                to: ctx.accounts.investor_token_account.to_account_info(),
                authority: pool.to_account_info(),
            },
        );

        token::transfer(transfer_ctx, claimable_amount)?;
        vesting.claimed_amount = vesting.claimed_amount
            .checked_add(claimable_amount)
            .ok_or(ErrorCode::NumberOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8)]
    pub pool: Account<'info, Pool>,
    pub token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        payer = investor,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8
    )]
    pub vesting: Account<'info, VestingSchedule>,
    #[account(mut)]
    pub investor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub vesting: Account<'info, VestingSchedule>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub investor_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub token_price: u64,
    pub soft_cap: u64,
    pub hard_cap: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub finalized: bool,
    pub total_invested: u64,
}

#[account]
pub struct VestingSchedule {
    pub investor: Pubkey,
    pub pool: Pubkey,
    pub total_amount: u64,
    pub claimed_amount: u64,
    pub start_time: i64,
    pub cliff: i64,
    pub duration: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Pool has not started yet")]
    PoolNotStarted,
    #[msg("Pool has ended")]
    PoolEnded,
    #[msg("Pool is already finalized")]
    PoolFinalized,
    #[msg("Cliff period has not been reached")]
    CliffNotReached,
    #[msg("No tokens available to claim")]
    NoTokensToClaim,
    #[msg("Numeric overflow")]
    NumberOverflow,
}