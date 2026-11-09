// SPDX-License-Identifier: MIT

//! Integration tests for read-only `capabilities()` view on collateral.

use creditra_collateral::views::{
    capabilities, ALL_COLLATERAL_CAPABILITIES, CAPABILITY_ADMIN_COOLDOWN, CAPABILITY_DEPOSIT,
    CAPABILITY_MULTI_TOKEN, CAPABILITY_PARTIAL_RELEASE, CAPABILITY_RATIO_FLOOR,
    CAPABILITY_RISK_WEIGHTING, CAPABILITY_WITHDRAW,
};
use soroban_sdk::Env;

#[test]
fn test_direct_collateral_views_capabilities() {
    let env = Env::default();
    let caps = capabilities(&env);

    assert_eq!(caps, ALL_COLLATERAL_CAPABILITIES);
    assert_ne!(caps, 0);

    // Verify individual capability bits
    assert_eq!(caps & CAPABILITY_DEPOSIT, CAPABILITY_DEPOSIT);
    assert_eq!(caps & CAPABILITY_WITHDRAW, CAPABILITY_WITHDRAW);
    assert_eq!(
        caps & CAPABILITY_PARTIAL_RELEASE,
        CAPABILITY_PARTIAL_RELEASE
    );
    assert_eq!(caps & CAPABILITY_MULTI_TOKEN, CAPABILITY_MULTI_TOKEN);
    assert_eq!(caps & CAPABILITY_RISK_WEIGHTING, CAPABILITY_RISK_WEIGHTING);
    assert_eq!(caps & CAPABILITY_ADMIN_COOLDOWN, CAPABILITY_ADMIN_COOLDOWN);
    assert_eq!(caps & CAPABILITY_RATIO_FLOOR, CAPABILITY_RATIO_FLOOR);
}
