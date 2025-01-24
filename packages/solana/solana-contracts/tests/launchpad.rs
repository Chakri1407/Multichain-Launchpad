#[cfg(test)]
mod tests {
    use anchor_lang::prelude::*;
    use anchor_spl::token::{self, TokenAccount, Transfer};
    use launchpad::{
        state::{Pool, VestingSchedule},
        instructions,
    };

    #[test]
    fn test_pool_creation() {
        let context = setup_context();
        
        let pool_params = instructions::InitializePoolParams {
            token_price: 100,
            soft_cap: 1000,
            hard_cap: 5000,
            start_time: Clock::get().unwrap().unix_timestamp,
            end_time: Clock::get().unwrap().unix_timestamp + (30 * 24 * 60 * 60), // 30 days
        };

        let result = instructions::initialize_pool(
            context.accounts(), 
            pool_params
        );

        assert!(result.is_ok(), "Pool creation should succeed");
    }

    #[test]
    fn test_investment() {
        let mut context = setup_context();
        
        // Create pool first
        let pool_params = instructions::InitializePoolParams { /* same as previous test */ };
        instructions::initialize_pool(context.accounts(), pool_params).unwrap();

        // Investment test
        let investment_amount = 500;
        let result = instructions::invest(
            context.accounts(), 
            investment_amount
        );

        assert!(result.is_ok(), "Investment should succeed");
        
        // Check vesting schedule
        let vesting_account = context.accounts().vesting.load().unwrap();
        assert_eq!(vesting_account.total_amount, investment_amount);
    }

    #[test]
    fn test_token_vesting() {
        let mut context = setup_context();
        
        // Setup pool and investment
        let pool_params = instructions::InitializePoolParams { /* same as previous tests */ };
        instructions::initialize_pool(context.accounts(), pool_params).unwrap();
        instructions::invest(context.accounts(), 500).unwrap();

        // Fast forward past cliff period
        context.set_time(pool_params.end_time + (31 * 24 * 60 * 60)); // 31 days after end

        // Attempt token claim
        let result = instructions::claim_tokens(context.accounts());
        assert!(result.is_ok(), "Token claim should succeed");

        let vesting_account = context.accounts().vesting.load().unwrap();
        assert_eq!(vesting_account.claimed_amount, 500);
    }

    // Utility function to set up test context
    fn setup_context() -> ProgramTestContext {
        let mut context = ProgramTest::new(
            "launchpad", 
            launchpad::id(), 
            None
        );
        
        // Add mock accounts and tokens
        context.add_account(/* mock accounts */);
        context.start();
        
        context
    }
}
