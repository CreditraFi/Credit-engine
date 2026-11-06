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

Un-quarantine a file by moving it back to `tests/` once the referenced API exists.
