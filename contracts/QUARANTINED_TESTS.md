# Quarantined test targets

These files are kept for reference but are **not compiled or run** by `cargo test`.
They live under `tests/quarantine/`, which Cargo does not discover as a test target.

| File | Why it is quarantined |
|---|---|
| `freeze/tests/quarantine/events.rs` | Written against the pre-SDK-22 event API (`testutils::Event`, `Events::all`, removed `publish_*` helpers). |
| `accrual/tests/quarantine/rustdoc_accrual_tests.rs` | Asserts renamed `InterestAccruedEvent` fields and removed `publish_*` helpers. |
| `accrual/tests/quarantine/auth_snap.rs` | Asserts the pre-SDK-22 auth-snapshot tuple shape and imports fee configs from a private module. |
| `credit/tests/quarantine/proptest_borrower_id.rs` | Imports `test_helpers::{ensure_credit_line_id, ...}`, which do not exist. |
| `credit/tests/quarantine/proptest_collateral.rs` | Uses unstable `int_roundings` and a proptest assertion API this workspace does not pin. |
| `collateral/tests/quarantine/proptest.rs` | Pre-1.0 proptest syntax (`#![proptest_config = ...]`) and imports a prebuilt WASM file. |
| `collateral/tests/quarantine/auth_snap.rs` | Requires `repay_and_release_collateral` and admin-collateral-cooldown entrypoints that the contract does not expose. |
| `lifecycle/tests/quarantine/admin_cooldown.rs` | Requires the unimplemented admin-lifecycle-cooldown entrypoints and error code 56. |
| `credit/tests/quarantine/atomic_repay_release.rs` | References `repay_and_release_collateral` entrypoint which was intentionally removed from the contract. |
| `credit/tests/quarantine/borrow_auth_boundary.rs` | References `repay_and_release_collateral` and `get_collateral_state` entrypoints which were intentionally removed from the contract. |
| `credit/tests/quarantine/collateral_state_view.rs` | References `get_collateral_state` entrypoint which does not exist in the contract. |
| `credit/tests/quarantine/error_discriminants.rs` | Pins discriminants for error variants that were removed (`BorrowerBlocked`, `LiquidityTokenCallFailed`, `TreasuryTimelockActive`, `CloseFactorAboveMax`, ...) and calls the removed `propose_treasury_withdrawal` entrypoint. |
| `credit/tests/quarantine/governance_fee.rs` | Exercises the removed `set_protocol_fee_bounds` / `get_protocol_fee_bounds` admin entrypoints. |
| `credit/tests/quarantine/grace_waiver_event.rs` | Imports `events::GraceWaiverReceiptEvent`, which the contract no longer publishes. |
| `credit/tests/quarantine/proptest_accrual_bound.rs` | Imports `calculate_accrued_interest` and `CreditContractClient`, neither of which exists in the contract crate. |
| `credit/tests/quarantine/query_admin_cooldown.rs` | Exercises the removed `set_query_admin_cooldown` / `get_query_admin_last_action_ts` entrypoints. |
| `credit/tests/quarantine/events_catalog.rs` | Written against the pre-SDK-22 event API and removed event types (`GraceWaiverReceiptEvent`, `BidRefundedEvent`, `AuctionClosedEvent`, ...). |
| `credit/tests/quarantine/limits.rs` | Exercises the removed per-borrower exposure-cap entrypoints (`set_borrower_exposure_cap` / `get_borrower_exposure_cap`) and `BorrowerExposureCapExceeded` error variant. |
| `credit/tests/quarantine/protocol_fee_total_repayment.rs` | Uses `CreditClient::contract_id` (not exposed by the SDK client) and the removed `repay_and_release_collateral` entrypoint. |
| `collateral/tests/quarantine/auth_boundary.rs` | Uses the pre-SDK-22 `Env::disable_dispatch_auth_for_address` auth API. |
| `credit/tests/quarantine/credit_line_snapshot.rs` | Exercises the removed `get_credit_line_snapshot` entrypoint. |
| `collateral/tests/quarantine/gas_snap.rs` | Targets the removed `CollateralContract` client, `repay_and_release_collateral`, and admin-collateral-cooldown entrypoints. |
| `credit/tests/quarantine/vrf_commitment.rs` | Imports the private `scoring` module and the removed `ContractClient` alias. |
| `credit/tests/quarantine/treasury_timelock.rs` | Exercises the removed treasury-withdrawal timelock entrypoints (`propose_treasury_withdrawal`, `execute_treasury_withdrawal`, `get_pending_treasury_withdrawal`). |

Un-quarantine a file by moving it back to `tests/` once the referenced API exists.
