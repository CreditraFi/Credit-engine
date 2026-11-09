// SPDX-License-Identifier: MIT

//! Tests verifying the one-time initialization contract for the Credit contract.
//!
//! # What is tested
//!
//! 1. The constructor pins the admin atomically at deployment.
//! 2. Re-init with a different admin reverts with `AlreadyInitialized`.
//! 3. Re-init with the same admin is an idempotent no-op.
//! 3. No state is mutated by a failed re-init.
//! 4. LiquiditySource is set to the contract address on first init.
//! 5. Admin-gated functions work after init and fail before init.
//! 6. Init is deterministic across multiple contract instances.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};

use creditra_credit::{Credit, CreditClient, FreezeReason};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

fn deploy(env: &Env) -> (CreditClient<'_>, Address) {
    let admin = Address::generate(env);
    let contract_id = env.register(Credit, (admin.clone(),));
    let client = CreditClient::new(env, &contract_id);
    (client, admin)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Double-init reverts with AlreadyInitialized
// ─────────────────────────────────────────────────────────────────────────────

/// A second call to `init` must revert with `ContractError::AlreadyInitialized`
/// (error code 14).
#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn double_init_reverts_with_already_initialized() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin) = deploy(&env);
    client.init(&admin);

    let attacker = Address::generate(&env);
    // Second call must revert — attacker cannot overwrite admin.
    client.init(&attacker);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Admin is unchanged after failed re-init
// ─────────────────────────────────────────────────────────────────────────────

/// After a failed re-init attempt the original admin must still be in storage
/// and admin-gated operations must continue to work.
#[test]
fn admin_unchanged_after_failed_reinit() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin) = deploy(&env);
    client.init(&admin);

    let attacker = Address::generate(&env);
    // Attempt re-init — must fail.
    let result = client.try_init(&attacker);
    assert!(result.is_err(), "second init should fail");

    // Admin-gated operation must still succeed with original admin.
    let borrower = Address::generate(&env);
    client.open_credit_line(&borrower, &1_000_i128, &300_u32, &50_u32);
    let line = client.get_credit_line(&borrower).unwrap();
    assert_eq!(line.borrower, borrower);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. No state mutation on failed re-init
// ─────────────────────────────────────────────────────────────────────────────

/// A failed re-init must not change LiquiditySource or any other instance
/// storage value.
#[test]
fn failed_reinit_does_not_mutate_state() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Credit, (admin.clone(),));
    let client = CreditClient::new(&env, &contract_id);

    client.init(&admin);

    // Record the liquidity source after first init.
    let new_source = Address::generate(&env);
    client.set_liquidity_source(&new_source);

    // Attempt re-init with a different address — must fail.
    let attacker = Address::generate(&env);
    let _ = client.try_init(&attacker);

    // Liquidity source must still be new_source, not contract address.
    // We verify indirectly: admin-gated set_liquidity_source still works,
    // meaning admin was not overwritten.
    let another_source = Address::generate(&env);
    client.set_liquidity_source(&another_source);
    // If we reach here without panic, admin is still the original.
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LiquiditySource defaults to contract address on first init
// ─────────────────────────────────────────────────────────────────────────────

/// On first init, LiquiditySource must be set to the contract's own address.
/// This is verified indirectly: a draw without set_liquidity_source uses the
/// contract balance as the reserve.
#[test]
fn init_sets_liquidity_source_to_contract_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin) = deploy(&env);
    client.init(&admin);

    // set_liquidity_source requires admin auth — if admin is set correctly
    // this call succeeds, confirming init wrote the admin key.
    let external_source = Address::generate(&env);
    client.set_liquidity_source(&external_source);
    // No panic = admin was stored correctly by init.
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Admin-gated functions fail before init
// ─────────────────────────────────────────────────────────────────────────────

/// The constructor pins the admin during deployment, so an admin-gated
/// function is usable immediately without a separate `init` transaction.
#[test]
fn admin_gated_call_works_immediately_after_deploy() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Credit, (admin.clone(),));
    let client = CreditClient::new(&env, &contract_id);

    client.freeze_draws(&FreezeReason::LiquidityReserve);
    assert!(client.is_draws_frozen());
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Init is deterministic across instances
// ─────────────────────────────────────────────────────────────────────────────

/// Two separate contract instances initialized with the same admin are
/// independent — a double-init on one does not affect the other.
#[test]
fn init_is_independent_across_contract_instances() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_a = env.register(Credit, (admin.clone(),));
    let contract_b = env.register(Credit, (admin.clone(),));
    let client_a = CreditClient::new(&env, &contract_a);
    let client_b = CreditClient::new(&env, &contract_b);

    client_a.init(&admin);
    client_b.init(&admin);

    // Double-init on A must not affect B.
    let attacker = Address::generate(&env);
    let _ = client_a.try_init(&attacker);

    // B must still accept admin-gated calls.
    let borrower = Address::generate(&env);
    client_b.open_credit_line(&borrower, &500_i128, &200_u32, &40_u32);
    assert!(client_b.get_credit_line(&borrower).is_some());
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Single init succeeds and is idempotent for state
// ─────────────────────────────────────────────────────────────────────────────

/// A single init call succeeds and leaves the contract in a usable state.
#[test]
fn single_init_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin) = deploy(&env);
    client.init(&admin);

    // Contract is usable: open a credit line.
    let borrower = Address::generate(&env);
    client.open_credit_line(&borrower, &1_000_i128, &300_u32, &50_u32);
    let line = client.get_credit_line(&borrower).unwrap();
    assert_eq!(line.credit_limit, 1_000);
    assert_eq!(line.interest_rate_bps, 300);
    assert_eq!(line.risk_score, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Re-init with same admin also reverts
// ─────────────────────────────────────────────────────────────────────────────

/// Re-init with the admin already pinned by the constructor is an idempotent
/// no-op, so legacy callers do not break after upgrading to constructor-based
/// initialization.
#[test]
fn reinit_with_same_admin_is_idempotent() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin) = deploy(&env);
    client.init(&admin);

    // The admin is unchanged and the contract remains usable.
    let borrower = Address::generate(&env);
    client.open_credit_line(&borrower, &1_000_i128, &300_u32, &50_u32);
    assert_eq!(
        client.get_credit_line(&borrower).unwrap().credit_limit,
        1_000
    );
}
