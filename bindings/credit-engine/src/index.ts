import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





/**
 * On-chain record for an aggregated attestation batch.
 * 
 * Stores the Merkle root of all leaf hashes in the batch, the number of
 * leaves, and the ledger timestamp at which the batch was committed.
 */
export interface AttestationBatch {
  /**
 * Ledger timestamp when this batch was committed.
 */
committed_at: u64;
  /**
 * Number of leaf hashes committed in this batch (informational; not
 * verified on-chain).
 */
count: u32;
  /**
 * SHA-256 Merkle root of all leaf hashes in the batch.
 */
merkle_root: Buffer;
}


/**
 * Reason for protocol pause (escape-hatch audit trail).
 * 
 * Stored alongside the pause flag in instance storage when the admin invokes
 * `set_protocol_paused`. Intended for governance transparency and off-chain
 * monitoring — the reason is a human-readable symbol that indexers and
 * dashboards can display to explain why the protocol is paused.
 */
export interface PauseReason {
  /**
 * Admin address that invoked the pause.
 */
actor: string;
  /**
 * Human-readable reason for pausing (e.g., "oracle-outage", "token-migration").
 */
reason: string;
  /**
 * Ledger timestamp when the pause was activated.
 */
timestamp: u64;
}

/**
 * Status of a borrower's credit line.
 * 
 * # Discriminant stability
 * The discriminants are part of the contract ABI. They must never be
 * reordered or renumbered; new variants must be appended.
 * 
 * # Transitions
 * See [`docs/state-machine.md`](../../../docs/state-machine.md) for the
 * authoritative state-transition diagram. In short:
 * 
 * - `Active` is the only state that permits new draws.
 * - `Restricted` allows draws but the numeric limit check will fail until
 * the borrower repays under the reduced ceiling.
 * - `Suspended` and `Defaulted` both block draws and allow repayments.
 * - `Closed` is terminal — no draws, no repayments.
 */
export enum CreditStatus {
  Active = 0,
  Suspended = 1,
  Defaulted = 2,
  Closed = 3,
  Restricted = 4,
}

/**
 * Structured taxonomy for credit-line and global draw freezes.
 * 
 * # Discriminant stability
 * Discriminants are part of the contract ABI. New variants must be appended;
 * existing values must never be reordered or renumbered.
 * 
 * # Usage
 * - [`crate::freeze::freeze_draws`] records a global reason alongside the
 * contract-wide draw kill-switch.
 * - [`crate::freeze::freeze_credit_line`] records a per-borrower reason without
 * mutating [`CreditStatus`], preserving lifecycle history for indexers.
 */
export enum FreezeReason {
  LiquidityReserve = 0,
  Compliance = 1,
  RiskInvestigation = 2,
  OperationalMaintenance = 3,
  BorrowerRequest = 4,
}


/**
 * Oracle circuit-breaker configuration.
 * 
 * When set, `settle_default_liquidation` validates the supplied `oracle_price`
 * against the last accepted price and the current ledger timestamp before
 * applying the settlement.
 * 
 * # Invariants
 * - `max_deviation_bps` must be in `1..=10_000` (0.01 % – 100 %).
 * - `max_age_seconds` must be > 0.
 */
export interface OracleConfig {
  /**
 * Maximum age of an oracle price in seconds before it is considered stale.
 */
max_age_seconds: u64;
  /**
 * Maximum allowed price deviation from the last accepted price, in basis points.
 * E.g. 500 = 5 %.
 */
max_deviation_bps: u32;
}

/**
 * Errors that can be returned by the Credit contract.
 * 
 * # Stability guarantee
 * These discriminants are **permanent**. Never reorder or renumber existing
 * variants — doing so would break deployed SDK clients. New variants must be
 * appended at the end with the next available integer.
 * 
 * # Category
 * Use [`ContractError::category`] to map any error to its
 * [`ContractErrorCategory`] for client-side grouping. See
 * [`docs/error-taxonomy.md`](../../../docs/error-taxonomy.md) for the
 * categorized reference with recovery actions.
 * 
 * # Discriminant table (source of truth)
 * | Code | Variant                        | Category      | Description |
 * |------|--------------------------------|---------------|-------------|
 * | 1    | `Unauthorized`                 | Auth          | Caller is not authorized |
 * | 2    | `NotAdmin`                     | Auth          | Caller lacks admin privileges |
 * | 3    | `CreditLineNotFound`           | Misc          | Credit line does not exist |
 * | 4    | `CreditLineClosed`             | Lifecycle     | Cred
 */
export const ContractError = {
  1: {message:"Unauthorized"},
  2: {message:"NotAdmin"},
  3: {message:"CreditLineNotFound"},
  4: {message:"CreditLineClosed"},
  5: {message:"InvalidAmount"},
  6: {message:"OverLimit"},
  7: {message:"NegativeLimit"},
  8: {message:"RateTooHigh"},
  9: {message:"ScoreTooHigh"},
  10: {message:"UtilizationNotZero"},
  11: {message:"Reentrancy"},
  12: {message:"Overflow"},
  14: {message:"AlreadyInitialized"},
  15: {message:"AdminAcceptTooEarly"},
  17: {message:"DrawExceedsMaxAmount"},
  18: {message:"Paused"},
  19: {message:"DrawsFrozen"},
  20: {message:"CreditLineSuspended"},
  21: {message:"CreditLineDefaulted"},
  22: {message:"MissingLiquidityToken"},
  23: {message:"MissingLiquiditySource"},
  24: {message:"InsufficientLiquidityReserve"},
  28: {message:"RepayExceedsMaxAmount"},
  29: {message:"DrawCooldownActive"},
  30: {message:"TreasuryNotSet"},
  31: {message:"ExposureCapExceeded"},
  32: {message:"AdminNotInitialized"},
  33: {message:"TimestampRegression"},
  34: {message:"LimitOutOfBounds"},
  35: {message:"CollateralRatioBelowMinimum"},
  36: {message:"OraclePriceInvalid"},
  37: {message:"OraclePriceStale"},
  38: {message:"OraclePriceDeviation"},
  39: {message:"InsufficientCollateralBalance"},
  40: {message:"BorrowerFrozen"},
  41: {message:"BountyNotSet"},
  42: {message:"NoPendingTreasuryWithdrawal"},
  46: {message:"CreditLineFrozen"},
  47: {message:"DrawReversalWindowExpired"},
  48: {message:"OriginalDrawNotFound"},
  49: {message:"AttestationBatchNotFound"},
  50: {message:"OracleQuorumNotMet"},
  51: {message:"AlreadySettled"},
  52: {message:"InvalidRiskWeight"},
  53: {message:"InvalidAttestation"},
  54: {message:"RiskAdminCooldownActive"},
  55: {message:"OracleNotFound"},
  57: {message:"FreezeCooldownActive"},
  58: {message:"AdminCollateralCooldownActive"},
  59: {message:"LiquidationGraceActive"}
}


/**
 * Stored credit line data for a borrower.
 */
export interface CreditLineData {
  /**
 * Total accrued interest that has been added to the utilized amount.
 * This tracks the cumulative interest that has been capitalized.
 */
accrued_interest: i128;
  /**
 * Address of the borrower.
 */
borrower: string;
  /**
 * Maximum borrowable amount for this line.
 */
credit_limit: i128;
  /**
 * Annual interest rate in basis points (1 bp = 0.01%).
 */
interest_rate_bps: u32;
  /**
 * Ledger timestamp of the last interest accrual calculation.
 * Zero means no accrual has been calculated yet.
 */
last_accrual_ts: u64;
  /**
 * Ledger timestamp of the last interest-rate update.
 * Zero means no rate update has occurred yet.
 */
last_rate_update_ts: u64;
  /**
 * Borrower's risk score (0-100).
 */
risk_score: u32;
  /**
 * Current status of the credit line.
 */
status: CreditStatus;
  /**
 * Ledger timestamp when the credit line was most recently suspended.
 * Zero when the line has never been suspended or has been reinstated.
 * Used by the grace period logic to determine whether the waiver window
 * is still active.
 */
suspension_ts: u64;
  /**
 * Current outstanding principal.
 */
utilized_amount: i128;
}


/**
 * Proof-of-reserve view for the protocol treasury.
 * 
 * Exposes the accumulated reserves held by the protocol in a single
 * read-only call. Indexers and dashboards can use this to verify that
 * the protocol's accounting balances are consistent.
 */
export interface ProofOfReserve {
  /**
 * Accumulated bounty pool fees held in the contract.
 */
bounty_balance: i128;
  /**
 * Accumulated protocol fees held in the contract (treasury share).
 */
treasury_balance: i128;
}


/**
 * Global protocol configuration.
 * 
 * A projection of the instance-storage keys
 * [`crate::storage::DataKey::LiquidityToken`] and
 * [`crate::storage::DataKey::LiquiditySource`], returned by
 * `get_protocol_config` for integrators who need to inspect both
 * values in a single call.
 * 
 * Either field may be `None` if the corresponding key has not been set; in
 * that case the relevant entrypoints panic with
 * [`ContractError::MissingLiquidityToken`] or
 * [`ContractError::MissingLiquiditySource`].
 */
export interface ProtocolConfig {
  /**
 * Configured liquidity source.
 */
liquidity_source: Option<string>;
  /**
 * Configured liquidity token.
 */
liquidity_token: Option<string>;
}


/**
 * Paginated list of credit lines returned by `get_credit_lines_paginated`.
 */
export interface CreditLinesPage {
  /**
 * `true` if there are additional lines beyond this page.
 */
has_more: boolean;
  /**
 * Credit lines included in this page.
 */
lines: Array<CreditLineData>;
  /**
 * Cursor for fetching the next page, if more items exist.
 */
next_cursor: Option<u32>;
}

/**
 * Grace period waiver modes.
 */
export enum GraceWaiverMode {
  FullWaiver = 0,
  ReducedRate = 1,
}


/**
 * Global protocol aggregate balances.
 * 
 * Returned by `get_protocol_summary` as a Soroban ABI value.
 */
export interface ProtocolSummary {
  /**
 * Accumulated bounty pool fees awaiting bounty withdrawal.
 */
bounty_balance: i128;
  /**
 * Number of indexed credit lines.
 */
count: u32;
  /**
 * Global collateral balance accumulator.
 */
total_collateral: i128;
  /**
 * Global utilized principal accumulator.
 */
total_utilized: i128;
  /**
 * Accumulated protocol fees awaiting treasury withdrawal.
 */
treasury_balance: i128;
}


/**
 * Persisted state for the global draw-freeze switch ([`crate::storage::DataKey::DrawsFrozen`]).
 */
export interface DrawsFreezeState {
  /**
 * `true` when all draws are currently frozen.
 */
frozen: boolean;
  /**
 * Structured reason recorded on the most recent freeze/unfreeze action.
 */
reason: FreezeReason;
}


/**
 * Admin-configurable limits on interest-rate changes.
 */
export interface RateChangeConfig {
  /**
 * Maximum absolute change in `interest_rate_bps` allowed per single update.
 */
max_rate_change_bps: u32;
  /**
 * Minimum elapsed seconds between two consecutive rate changes.
 */
rate_change_min_interval: u64;
}


/**
 * Grace period configuration for Suspended credit lines.
 */
export interface GracePeriodConfig {
  /**
 * Duration of the grace window in seconds.
 */
grace_period_seconds: u64;
  /**
 * Reduced rate to apply when waiver_mode is ReducedRate.
 */
reduced_rate_bps: u32;
  /**
 * Type of waiver to apply during the grace period.
 */
waiver_mode: GraceWaiverMode;
}


/**
 * Read-only capabilities bitmap for the query (v7) subsystem.
 * 
 * Returned by `query_capabilities` / the `capabilities` anchor in
 * `contracts/query/src/views.rs` so off-chain clients and keepers can
 * inspect which borrower-scoped query results are currently meaningful
 * without issuing multiple separate reads.
 * 
 * Every field is derived purely from storage — no token CPIs, no auth
 * checks, no mutation.
 */
export interface QueryCapabilities {
  /**
 * Delinquency checks can return `true` (open line with utilization and
 * a configured repayment schedule). Mirrors the short-circuit gates in
 * [`crate::query::is_delinquent`].
 */
delinquency_applicable: boolean;
  /**
 * `get_credit_line` returns `Some` for this borrower.
 */
has_credit_line: boolean;
  /**
 * `get_repayment_schedule` returns `Some` for this borrower.
 */
has_repayment_schedule: boolean;
  /**
 * Health factor is debt-sensitive (`utilized_amount > 0`). When
 * `false`, `get_health_factor` returns `u32::MAX` (no outstanding debt).
 */
health_factor_applicable: boolean;
  /**
 * Current delinquency status from [`crate::query::is_delinquent`].
 * Always `false` when `delinquency_applicable` is `false`.
 */
is_delinquent: boolean;
}


/**
 * Admin-configurable piecewise-linear rate formula.
 * 
 * When stored in instance storage, `update_risk_parameters` computes
 * `interest_rate_bps` from the borrower's `risk_score` instead of using
 * the manually supplied rate.
 * 
 * # Formula
 * ```text
 * raw_rate = base_rate_bps + (risk_score * slope_bps_per_score)
 * effective_rate = clamp(raw_rate, min_rate_bps, min(max_rate_bps, 10_000))
 * ```
 * 
 * # Invariants
 * - `min_rate_bps <= max_rate_bps <= 10_000`
 * - `base_rate_bps <= 10_000`
 */
export interface RateFormulaConfig {
  /**
 * Base interest rate in bps applied at risk_score = 0.
 */
base_rate_bps: u32;
  /**
 * Maximum allowed computed rate (ceiling), must be <= 10_000.
 */
max_rate_bps: u32;
  /**
 * Minimum allowed computed rate (floor).
 */
min_rate_bps: u32;
  /**
 * Additional bps per unit of risk_score (0–100).
 */
slope_bps_per_score: u32;
}


/**
 * Optional installment repayment schedule attached to a credit line.
 */
export interface RepaymentSchedule {
  /**
 * Required repayment amount for each installment period.
 */
amount_per_period: i128;
  /**
 * Timestamp at which the next installment is due.
 */
next_due_ts: u64;
  /**
 * Duration of a single installment period in seconds.
 */
period_seconds: u64;
}


/**
 * Read-only capabilities bitmap for a borrower's credit line.
 * 
 * Returned by `borrow_capabilities` to let off-chain clients and
 * on-chain integrators inspect which operations are currently
 * permitted for a borrower, without needing to simulate the full
 * entrypoint logic.
 * 
 * Each `bool` field represents a single operation; `true` means the
 * operation should succeed assuming valid parameters (amount, etc.).
 * Amount-dependent checks (credit limit, collateral ratio, draw
 * cooldown, exposure caps) are NOT evaluated because this view does
 * not know the intended draw amount.
 */
export interface BorrowCapabilities {
  /**
 * Whether the borrower can draw credit. False when the credit line
 * does not exist, the protocol is paused, draws are frozen, the
 * borrower is blocked/frozen, or the credit-line status is not
 * draw-allowed (Active/Restricted).
 */
can_draw: boolean;
  /**
 * Whether the borrower can repay credit. False when the credit line
 * does not exist or is permanently Closed.
 */
can_repay: boolean;
  /**
 * Whether the borrower can self-suspend their credit line. True
 * only when the credit line exists and is currently Active.
 */
can_self_suspend: boolean;
}


/**
 * Aggregated, single-call read-only view of a borrower's full credit-line state.
 * 
 * Assembles [`CreditLineData`], collateral balance, health factor, repayment
 * schedule, and delinquency status in one call, avoiding the multiple
 * round-trips a caller would otherwise need for `get_credit_line` +
 * `get_collateral` + `get_health_factor` + `get_repayment_schedule` +
 * `is_delinquent`.
 */
export interface CreditLineSnapshot {
  /**
 * Collateral balance for the borrower (single-token collateral path).
 */
collateral_balance: i128;
  /**
 * Collateral-aware health factor in basis points. `u32::MAX` when
 * `utilized_amount == 0`.
 */
health_factor_bps: u32;
  /**
 * `true` when the borrower is past the delinquency grace window.
 */
is_delinquent: boolean;
  /**
 * The core credit line record.
 */
line: CreditLineData;
  /**
 * The borrower's installment repayment schedule, if configured.
 * Empty when no schedule is set; exactly one element when a schedule
 * is configured. Represented as a `Vec` rather than `Option<T>`
 * because the Soroban SDK's struct-field XDR codegen does not support
 * `Option<CustomStruct>` fields (`Option<T>` requires `T: Into<ScVal>`,
 * which `#[contracttype]`-derived UDTs only implement fallibly).
 */
repayment_schedule: Array<RepaymentSchedule>;
}


/**
 * Multi-oracle quorum configuration.
 * 
 * When set, `submit_oracle_prices` resolves a canonical price from submitted
 * feeds using a quorum-of-K algorithm instead of the single-feed circuit
 * breaker path.
 * 
 * # Invariants
 * - `min_quorum_k` must be ≥ 2 (a single feed is not a quorum).
 * - `max_deviation_bps` must be in `0..=10_000` (0 = exact match required).
 * - `max_age_seconds` must be > 0.
 */
export interface OracleQuorumConfig {
  /**
 * Maximum age of the stored quorum price in seconds before it is
 * considered stale for settlement purposes.
 */
max_age_seconds: u64;
  /**
 * Maximum allowed price deviation between the highest and lowest prices
 * in the qualifying quorum window, in basis points.
 * E.g. 500 = 5%.
 */
max_deviation_bps: u32;
  /**
 * Minimum number of submitted prices that must agree within
 * `max_deviation_bps` to form a valid quorum.
 */
min_quorum_k: u32;
}

/**
 * Structured kind discriminant for collateral lifecycle events.
 * 
 * # Discriminant stability
 * Same rule as [`FreezeReason`] / [`CreditStatus`]: discriminants are part
 * of the contract ABI and must never be reordered or renumbered; new
 * variants must be appended.
 */
export enum CollateralEventKind {
  Deposited = 0,
  Withdrawn = 1,
  PartiallyReleased = 2,
  Released = 3,
}


/**
 * Protocol summary returned by the specific query view for GrantFox campaign.
 */
export interface ProtocolSummaryView {
  /**
 * Count of currently Active credit lines.
 */
active_line_count: u32;
  /**
 * Global collateral balance accumulator.
 */
total_collateral: i128;
  /**
 * Global utilized principal accumulator.
 */
total_utilized: i128;
}


/**
 * Read-only capabilities bitmap for a credit line's lifecycle transitions (v7).
 * 
 * Returned by the `lifecycle_capabilities` view to let off-chain clients and
 * on-chain integrators inspect which lifecycle transitions are currently
 * permitted for a borrower's credit line, without simulating the full
 * entrypoint logic (state lookup + status checks + pause guard).
 * 
 * Every field is derived purely from the credit line's current
 * [`CreditStatus`] and the protocol pause flag — no token CPIs, no auth
 * checks, no mutation. See [`crate::lifecycle`] for the authoritative
 * transition rules each field mirrors.
 */
export interface LifecycleCapabilities {
  /**
 * Whether an admin can force-close this line via `close_credit_line`
 * unconditionally (any non-`Closed` status). False when the line does
 * not exist, the protocol is paused, or the status is already `Closed`.
 */
can_close_admin: boolean;
  /**
 * Whether the borrower can self-close via `close_credit_line`. Requires
 * the same preconditions as `can_close_admin` **plus**
 * `utilized_amount == 0`.
 */
can_close_borrower: boolean;
  /**
 * Whether an admin can move this line to `Defaulted` via
 * `default_credit_line`. True when the line exists, the protocol is not
 * paused, and the status is `Active`, `Restricted`, or `Suspended`.
 */
can_default: boolean;
  /**
 * Whether an admin can cure this line via `reinstate_credit_line`. True
 * only when the line exists, the protocol is not paused, and the status
 * is `Defaulted`.
 */
can_reinstate: boolean;
  /**
 * Whether the borrower can self-suspend via `self_suspend_credit_line`.
 * Same precondition as `can_suspend` (only `Active` self-suspends).
 */
can_self_suspend: boolean;
  /**
 * Whether an admin can suspend this line via `suspend_credit_line`.
 * True only when the line exists, the protocol is not paused, and the
 * status is [`CreditStatus::Active`].
 */
can_suspend: boolean;
}


/**
 * Event emitted when the rate formula config is set or cleared.
 */
export interface RateFormulaConfigEvent {
  /**
 * `true` when a config was set; `false` when cleared.
 */
enabled: boolean;
}


/**
 * Configuration emitted when the risk admin cooldown is set or changed.
 */
export interface RiskAdminCooldownConfig {
  /**
 * New cooldown duration in seconds. `0` means disabled.
 */
cooldown_seconds: u64;
}


/**
 * A pending treasury withdrawal proposal created by `propose_treasury_withdrawal`.
 * 
 * Exactly one proposal can exist at a time. It must be executed (or superseded
 * only after a successful `execute_treasury_withdrawal` clears it) no sooner
 * than 24 hours after it was proposed.
 * 
 * # Timelock
 * `execute_after` is set to `proposal_ts + 86_400` (24 hours in seconds) at
 * proposal time. The execution entrypoint rejects calls when
 * `env.ledger().timestamp() < execute_after`.
 * 
 * # Storage
 * Stored in instance storage under [`crate::storage::DataKey::PendingTreasuryWithdrawal`].
 */
export interface TreasuryWithdrawalProposal {
  /**
 * Amount to transfer (snapshot of `TreasuryBalance` at proposal time).
 */
amount: i128;
  /**
 * Earliest ledger timestamp at which execution is permitted (`proposed_at + 86_400`).
 */
execute_after: u64;
  /**
 * Ledger timestamp at which the proposal was created.
 */
proposed_at: u64;
  /**
 * Address of the admin who submitted the proposal.
 */
proposer: string;
  /**
 * The treasury address that will receive the funds.
 */
recipient: string;
}


export interface DrawnEvent {
  amount: i128;
  borrower: string;
  new_utilized_amount: i128;
  timestamp: u64;
}


export interface DrawnEventV2 {
  amount: i128;
  borrower: string;
  new_utilized_amount: i128;
  recipient: string;
  reserve_source: string;
  timestamp: u64;
}


export interface RepaymentEvent {
  amount: i128;
  borrower: string;
  new_utilized_amount: i128;
}


export interface CreditLineEvent {
  borrower: string;
  credit_limit: i128;
  interest_rate_bps: u32;
  risk_score: u32;
  status: CreditStatus;
}


export interface FeeAccruedEvent {
  borrower: string;
  /**
 * Bounty pool portion of `fee_amount` credited to `BountyBalance`.
 */
bounty_amount: i128;
  /**
 * Total protocol fee skimmed from the repayment.
 */
fee_amount: i128;
  new_bounty_balance: i128;
  new_treasury_balance: i128;
  /**
 * Treasury portion of `fee_amount` credited to `TreasuryBalance`.
 */
treasury_amount: i128;
}


export interface DrawsFrozenEvent {
  frozen: boolean;
  reason: FreezeReason;
}


/**
 * Event emitted when debt is forgiven by the admin.
 */
export interface DebtForgivenEvent {
  amount_forgiven: i128;
  borrower: string;
  new_utilized_amount: i128;
  remaining_accrued_interest: i128;
}


export interface DrawReversedEvent {
  accounting_only: boolean;
  admin: string;
  amount: i128;
  borrower: string;
  new_utilized_amount: i128;
  original_ts: u64;
  reason_code: u32;
  timestamp: u64;
}


export interface TokenRescuedEvent {
  amount: i128;
  recipient: string;
  token: string;
}


export interface BorrowerFrozenEvent {
  borrower: string;
  /**
 * Timestamp (ledger seconds) until which draws are frozen.
 */
frozen_until: u64;
  /**
 * Ledger sequence at time of change (for off-chain indexers)
 */
ledger: u32;
}


export interface LateFeeChargedEvent {
  borrower: string;
  fee: i128;
  installment_index: u64;
}


export interface BorrowerBlockedEvent {
  blocked: boolean;
  borrower: string;
  ledger: u32;
}


/**
 * Event emitted during borrow lifecycle changes (draw, repay, forgive).
 */
export interface BorrowLifecycleEvent {
  borrower: string;
  credit_limit: i128;
  interest_rate_bps: u32;
  phase: BorrowLifecyclePhase;
  status: CreditStatus;
  timestamp: u64;
  utilized_amount: i128;
}

/**
 * Borrow lifecycle phases.
 */
export type BorrowLifecyclePhase = {tag: "Opened", values: void} | {tag: "Drawn", values: void} | {tag: "Repaid", values: void} | {tag: "Suspended", values: void} | {tag: "Reinstated", values: void} | {tag: "Defaulted", values: void} | {tag: "Closed", values: void} | {tag: "DebtForgiven", values: void};


export interface InterestAccruedEvent {
  accrued_amount: i128;
  borrower: string;
  new_utilized_amount: i128;
}


export interface ContractUpgradedEvent {
  new_wasm_hash: Buffer;
  old_wasm_hash: Buffer;
}


/**
 * Dedicated lifecycle event emitted when a credit line is closed.
 */
export interface CreditLineClosedEvent {
  borrower: string;
  closer: string;
  remaining_utilized_amount: i128;
  timestamp: u64;
}


export interface CreditLineFreezeEvent {
  borrower: string;
  /**
 * `true` when frozen; `false` when unfrozen.
 */
frozen: boolean;
  /**
 * Ledger sequence at time of change (for off-chain indexers).
 */
ledger: u32;
  /**
 * Structured reason for the freeze action.
 */
reason: FreezeReason;
}


/**
 * Dedicated lifecycle event emitted when a credit line is opened.
 */
export interface CreditLineOpenedEvent {
  borrower: string;
  credit_limit: i128;
  interest_rate_bps: u32;
  risk_score: u32;
  timestamp: u64;
}


export interface PenaltyRateExitedEvent {
  borrower: string;
  new_rate_bps: u32;
  previous_rate_bps: u32;
}


export interface GraceWaiverAppliedEvent {
  borrower: string;
  mode: GraceWaiverMode;
  waived_amount: i128;
}


export interface PenaltyRateEnteredEvent {
  base_rate_bps: u32;
  borrower: string;
  effective_rate_bps: u32;
  penalty_surcharge_bps: u32;
}


export interface CollateralDepositedEvent {
  amount: i128;
  borrower: string;
  new_balance: i128;
}


/**
 * Structured, unified lifecycle event covering every collateral state
 * change (deposit, withdrawal, partial release, internal release).
 * 
 * Emitted **in addition to** the legacy per-action events
 * ([`CollateralDepositedEvent`], [`CollateralWithdrawnEvent`],
 * [`CollateralPartialReleasedEvent`]) so existing indexers keep working
 * unmodified, while new integrators can subscribe to a single topic
 * (`("credit", "col_lca")`) and disambiguate via [`crate::types::CollateralEventKind`]
 * instead of tracking multiple topic strings.
 * 
 * # Field notes
 * 
 * - `token` is `None` for the single-token collateral path (`CollateralBalance`
 * storage) and `Some(token)` for the multi-collateral, per-token path.
 * - `ledger` / `timestamp` let off-chain consumers order and correlate
 * events without a separate RPC round-trip to fetch ledger metadata.
 */
export interface CollateralLifecycleEvent {
  /**
 * Amount moved by this action (always positive).
 */
amount: i128;
  borrower: string;
  kind: CollateralEventKind;
  /**
 * Ledger sequence at time of the action (for off-chain indexers).
 */
ledger: u32;
  /**
 * Collateral balance remaining after this action.
 */
new_balance: i128;
  /**
 * Ledger timestamp at time of the action.
 */
timestamp: u64;
  /**
 * `None` for the single-token collateral balance; `Some(token)` for
 * the multi-collateral per-token path.
 */
token: Option<string>;
}


export interface CollateralWithdrawnEvent {
  amount: i128;
  borrower: string;
  new_balance: i128;
}


/**
 * Dedicated lifecycle event emitted when a credit line is defaulted.
 */
export interface CreditLineDefaultedEvent {
  borrower: string;
  timestamp: u64;
  utilized_amount: i128;
}


/**
 * Dedicated lifecycle event emitted when a credit line is suspended.
 */
export interface CreditLineSuspendedEvent {
  borrower: string;
  reason: string;
  timestamp: u64;
}


/**
 * Dedicated lifecycle event emitted when a credit line is reinstated.
 */
export interface CreditLineReinstatedEvent {
  borrower: string;
  target_status: CreditStatus;
  timestamp: u64;
}


export interface AdminRotationAcceptedEvent {
  new_admin: string;
}


export interface AdminRotationProposedEvent {
  accept_after: u64;
  proposed_admin: string;
}


export interface RiskParametersUpdatedEvent {
  borrower: string;
  credit_limit: i128;
  interest_rate_bps: u32;
  risk_score: u32;
}


/**
 * Payload emitted when an admin commits a new attestation batch for a borrower.
 */
export interface AttestationBatchCommittedEvent {
  /**
 * Borrower whose attestation batch was updated.
 */
borrower: string;
  /**
 * Number of leaves in the batch (informational).
 */
count: u32;
  /**
 * SHA-256 Merkle root of all leaf hashes in the committed batch.
 */
merkle_root: Buffer;
}


/**
 * Event emitted by [`crate::collateral::partial_release_collateral`].
 * 
 * Distinct from [`CollateralWithdrawnEvent`] so indexers can distinguish a
 * borrower-initiated partial release (health-factor gated) from a generic
 * withdrawal or an atomic repay-and-release.
 */
export interface CollateralPartialReleasedEvent {
  /**
 * Token amount returned to the borrower.
 */
amount_released: i128;
  /**
 * Borrower whose collateral is being partially released.
 */
borrower: string;
  /**
 * Health factor (collateral * 10_000 / utilized) after the release.
 * `u32::MAX` when `utilized_amount == 0` (fully repaid / unconstrained).
 */
health_factor_bps: u32;
  /**
 * Collateral balance remaining in the contract after the release.
 */
new_balance: i128;
}


export interface DefaultLiquidationSettledEvent {
  borrower: string;
  close_factor_bps: u32;
  recovered_amount: i128;
  remaining_utilized_amount: i128;
  settlement_id: string;
  status: CreditStatus;
}


/**
 * Emitted when a treasury withdrawal is executed via `execute_treasury_withdrawal`.
 */
export interface TreasuryWithdrawalExecutedEvent {
  /**
 * Amount transferred.
 */
amount: i128;
  /**
 * Ledger timestamp at execution.
 */
executed_at: u64;
  /**
 * Admin who executed the withdrawal.
 */
executor: string;
  /**
 * Treasury recipient address.
 */
recipient: string;
}


/**
 * Emitted when a treasury withdrawal is proposed via `propose_treasury_withdrawal`.
 */
export interface TreasuryWithdrawalProposedEvent {
  /**
 * Snapshot of the treasury balance at proposal time.
 */
amount: i128;
  /**
 * Earliest timestamp at which execution is permitted (proposed_at + 86_400).
 */
execute_after: u64;
  /**
 * Ledger timestamp when the proposal was created.
 */
proposed_at: u64;
  /**
 * Admin who submitted the proposal.
 */
proposer: string;
  /**
 * Treasury recipient address.
 */
recipient: string;
}


/**
 * Payload emitted when the risk admin cooldown is configured.
 */
export interface RiskAdminCooldownConfiguredEvent {
  /**
 * New cooldown duration in seconds. `0` means disabled.
 */
cooldown_seconds: u64;
}


export interface ReportWeight {
  value: u128;
  weight: u32;
}

export type OracleDataKey = {tag: "OracleList", values: void} | {tag: "OracleWeight", values: readonly [string]} | {tag: "OracleReport", values: readonly [string]} | {tag: "QuorumThreshold", values: void} | {tag: "ReportingWindow", values: void};


export interface OracleReportData {
  timestamp: u64;
  value: u128;
}


/**
 * VRF commitment data stored per borrower.
 */
export interface VrfCommitment {
  /**
 * Hash of the VRF output (commitment).
 */
commitment_hash: Buffer;
  /**
 * Ledger timestamp when the commitment was made.
 */
committed_at: u64;
}


/**
 * Key payload for per-borrower per-timestamp draw audit and reversal storage entries.
 */
export interface DrawAuditKey {
  borrower: string;
  timestamp: u64;
}


/**
 * Composite key for per-borrower per-token collateral balance entries (v2).
 * Wraps `(borrower, token)` for use as a single storage key.
 */
export interface CollateralBalanceV2Key {
  borrower: string;
  token: string;
}


export interface ProtocolVersion {
  major: u32;
  minor: u32;
}


/**
 * Payload for the [`LateFeeConfig::AprBased`] variant.
 * 
 * Wraps the APR surcharge in basis points so the `#[contracttype]` macro on
 * [`LateFeeConfig`] can serialize the enum as an XDR tagged union.
 */
export interface AprFeeConfig {
  /**
 * Extra basis points added to the base interest rate while delinquent.
 * 
 * Must be in `0..=10_000`.
 */
surcharge_bps: u32;
}


/**
 * Payload for the [`LateFeeConfig::Flat`] variant.
 * 
 * Wraps the flat surcharge amount so the `#[contracttype]` macro on
 * [`LateFeeConfig`] can serialize the enum as an XDR tagged union.
 */
export interface FlatFeeConfig {
  /**
 * Token units charged once per overdue installment.
 * 
 * Must be `>= 0`. Zero disables the fee (no-op).
 */
amount: i128;
}

/**
 * Configuration for the late-fee penalty applied to overdue installments.
 * 
 * # Variants
 * 
 * | Variant    | Behaviour |
 * |------------|-----------|
 * | `Flat`     | A fixed `amount` in token units is applied once per missed installment. |
 * | `AprBased` | An additive basis-point surcharge on the periodic interest rate while the line is delinquent. |
 * 
 * # Storage
 * 
 * Stored in instance storage under [`crate::storage::DataKey::LateFeeConfig`].
 * Admin-configurable via `set_late_fee_config` / `get_late_fee_config` on the
 * contract.  When the key is absent the contract falls back to the legacy
 * `LateFeeFlat` and `PenaltySurchargeBps` instance keys.
 * 
 * # Examples
 * 
 * ```ignore
 * // Flat: charge 50 tokens per missed installment
 * let cfg = LateFeeConfig::Flat(FlatFeeConfig { amount: 50 });
 * 
 * // APR-based: add 200 bps to the interest rate when delinquent
 * let cfg = LateFeeConfig::AprBased(AprFeeConfig { surcharge_bps: 200 });
 * ```
 */
export type LateFeeConfig = {tag: "Flat", values: readonly [FlatFeeConfig]} | {tag: "AprBased", values: readonly [AprFeeConfig]};

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * One-time contract initialization.
   * 
   * Stores the immutable admin address, seeds the global accumulators, and
   * applies conservative default collateral and close-factor settings.
   * A second call reverts with [`ContractError::AlreadyInitialized`].
   */
  init: ({admin}: {admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Upgrade the contract WASM to a new version (admin only).
   * 
   * This entrypoint allows the protocol to ship bug fixes and feature additions
   * without migrating borrower state. The upgrade is atomic and preserves all
   * existing storage.
   * 
   * # Security Gates
   * - **Admin authentication**: Only the configured admin can authorize upgrades.
   * - **Pause check**: Upgrades are blocked when the protocol circuit breaker is active.
   * 
   * # State Updates
   * - Bumps `SCHEMA_VERSION` in instance storage to track upgrade history.
   * - Calls `env.deployer().update_current_contract_wasm(new_wasm_hash)` to perform
   * the atomic WASM replacement.
   * 
   * # Events
   * Emits `ContractUpgradedEvent` with both the old and new WASM hashes for
   * off-chain indexers and audit trails.
   * 
   * # Parameters
   * - `new_wasm_hash`: The 32-byte hash of the new WASM binary to deploy.
   * 
   * # Authorization
   * Requires admin authorization via `require_admin_auth()`.
   * 
   * # Errors
   * - `ContractError::Paused` — Protocol is paused by the emergency circuit breaker.
   * - Auth error — Caller is not the configured admi
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_oracle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Adds or updates an oracle's weight in the registry.
   * Admin only.
   */
  add_oracle: ({oracle, weight}: {oracle: string, weight: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_bounty transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get configured bounty pool address, if any.
   */
  get_bounty: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a set_bounty transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the bounty pool address where withdrawn bounty fees will be sent (admin only).
   */
  set_bounty: ({admin, bounty}: {admin: string, bounty: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a draw_credit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Draws credit by transferring liquidity tokens to the borrower.
   * 
   * Enforces status, limit, and liquidity checks before executing the transfer.
   * A reentrancy guard is set on entry and cleared on every exit path (success
   * and failure). If this function is re-entered while the guard is active,
   * the call reverts with [`ContractError::Reentrancy`].
   * 
   * # Parameters
   * - `borrower`: The address drawing credit; must authorize this call.
   * - `amount`: The amount to draw; must be positive and within available limit.
   * 
   * # Note
   * Not yet implemented. Planned logic: load existing record, update fields,
   * persist updated [`CreditLineData`].
   * @notice Draws credit by transferring liquidity tokens to the borrower.
   * @dev Enforces status/limit/liquidity checks and uses a reentrancy guard.
   */
  draw_credit: ({borrower, amount}: {borrower: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_version: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [u32, u32, u32]>>

  /**
   * Construct and simulate a accept_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a accrue_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Materialize interest accrual for a bounded list of borrowers.
   * 
   * No auth is required: the call only updates accounting state for lines
   * that already exist and are `Active`. Missing lines and non-active lines
   * are skipped without reverting the whole batch. Only non-zero accruals
   * emit `InterestAccruedEvent`.
   */
  accrue_batch: ({borrowers}: {borrowers: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a forgive_debt transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Forgive outstanding debt without transferring tokens (admin only).
   * 
   * Reduces `accrued_interest` (and `utilized_amount`) by up to `amount`.
   * Emits [`DebtForgivenEvent`] and [`BorrowLifecycleEvent`] on success.
   */
  forgive_debt: ({borrower, amount}: {borrower: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a freeze_draws transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Freeze all draws globally (admin only).
   * 
   * Sets [`DataKey::DrawsFrozen`] with `frozen = true` and records `reason`.
   * 
   * # Authorization
   * Requires administrative privileges. The configured admin must authorize this
   * call via `require_auth()`; unauthorized callers are rejected before any
   * storage mutation occurs.
   * 
   * # Storage
   * - **Type**: Instance storage (shared TTL with all instance keys)
   * - **Key**: `DataKey::DrawsFrozen`
   * - **Value**: [`DrawsFreezeState`]
   * 
   * # Events
   * Emits [`DrawsFrozenEvent`] with `frozen = true`.
   * 
   * # Errors
   * - Panics with auth error if the caller is not the configured admin.
   */
  freeze_draws: ({reason}: {reason: FreezeReason}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_treasury transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get configured treasury address, if any.
   */
  get_treasury: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a repay_credit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay outstanding credit (principal + accrued interest).
   * 
   * Repayment is allowed on Active, Suspended, and Defaulted lines.
   * Closed lines cannot accept repayment.
   * 
   * # Errors
   * - [`ContractError::InvalidAmount`] — `amount` is zero or negative.
   * - [`ContractError::CreditLineNotFound`] — no credit line exists for `borrower`.
   * - [`ContractError::CreditLineClosed`] — credit line is closed.
   * - [`ContractError::RepayExceedsMaxAmount`] — amount exceeds per-tx repay cap.
   */
  repay_credit: ({borrower, amount}: {borrower: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a report_value transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Oracles report their observed value.
   * Requires reporting oracle's auth.
   */
  report_value: ({oracle, value}: {oracle: string, value: u128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a reverse_draw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin-only bounded reversal for an erroneous draw.
   * 
   * # Storage
   * Loads the credit line via `storage_get_credit_line`, which bumps the
   * entry's persistent TTL on read — independent of whether the call goes
   * on to mutate and persist the line.
   */
  reverse_draw: ({borrower, amount, original_ts, reason_code}: {borrower: string, amount: i128, original_ts: u64, reason_code: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_treasury transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the treasury address where withdrawn fees will be sent (admin only).
   */
  set_treasury: ({admin, treasury}: {admin: string, treasury: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a is_delinquent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_delinquent: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a propose_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  propose_admin: ({new_admin, delay_seconds}: {new_admin: string, delay_seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a remove_oracle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Removes an oracle from the registry.
   * Admin only.
   */
  remove_oracle: ({oracle}: {oracle: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a block_borrower transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Block a single borrower. Admin only. Idempotent.
   * 
   * # Events
   * Emits `BorrowerBlockedEvent { blocked: true }`.
   */
  block_borrower: ({admin, borrower}: {admin: string, borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current collateral balance for a borrower.
   * 
   * # Returns
   * The collateral balance in the native token (as `i128`).
   */
  get_collateral: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a unfreeze_draws transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Unfreeze draws globally (admin only).
   * 
   * Sets [`DataKey::DrawsFrozen`] with `frozen = false` while preserving
   * the original freeze reason for audit trail.
   * 
   * # Authorization
   * Requires administrative privileges. The configured admin must authorize this
   * call via `require_auth()`; unauthorized callers are rejected before any
   * storage mutation occurs.
   * 
   * # Storage
   * - **Type**: Instance storage (shared TTL with all instance keys)
   * - **Key**: `DataKey::DrawsFrozen`
   * - **Value**: [`DrawsFreezeState`]
   * 
   * # Events
   * Emits [`DrawsFrozenEvent`] with `frozen = false`.
   * 
   * # Errors
   * - Panics with auth error if the caller is not the configured admin.
   */
  unfreeze_draws: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the credit line for `borrower`, or `None` if no line exists.
   * 
   * No authentication required — this is a pure read with no side effects.
   * Accrual is lazy; pending interest since the last checkpoint is not applied here.
   */
  get_credit_line: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<CreditLineData>>>

  /**
   * Construct and simulate a is_draws_frozen transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns `true` when draws are globally frozen.
   * 
   * Defaults to `false` (draws allowed) if the key has never been set.
   * 
   * # Authorization
   * No authentication required — this is a pure read with no side effects.
   * 
   * # Storage
   * - **Type**: Instance storage (shared TTL with all instance keys)
   * - **Key**: `DataKey::DrawsFrozen`
   * 
   * # Returns
   * - `true` if draws are frozen
   * - `false` if draws are not frozen or the key has never been set
   */
  is_draws_frozen: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a withdraw_bounty transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw accumulated bounty pool balance to configured bounty address (admin only).
   */
  withdraw_bounty: ({admin}: {admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_median_value transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Computes the weighted median of the latest fresh reports from approved oracles.
   * Returns error if quorum threshold is not met.
   */
  get_median_value: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u128>>>

  /**
   * Construct and simulate a open_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Open a new credit line for a borrower (admin only).
   */
  open_credit_line: ({borrower, credit_limit, interest_rate_bps, risk_score}: {borrower: string, credit_limit: i128, interest_rate_bps: u32, risk_score: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unblock_borrower transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Unblock a single borrower. Admin only. Idempotent.
   * 
   * # Events
   * Emits `BorrowerBlockedEvent { blocked: false }`.
   */
  unblock_borrower: ({admin, borrower}: {admin: string, borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a close_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  close_credit_line: ({borrower, closer}: {borrower: string, closer: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a commit_vrf_output transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Commit to a VRF output for a borrower's credit score derivation (admin only).
   * 
   * This function stores a hash of the VRF output, creating a binding commitment
   * that prevents ex-post manipulation of the credit score. The commitment must
   * be set before `update_risk_parameters` can be called with a new score.
   * 
   * # Parameters
   * - `borrower`: Address of the borrower whose score will be derived from this VRF.
   * - `commitment_hash`: 256-bit hash of the VRF output.
   * 
   * # Errors
   * - Reverts if protocol is paused.
   * - Reverts if caller is not admin.
   * - Reverts if a commitment already exists for this borrower.
   */
  commit_vrf_output: ({borrower, commitment_hash}: {borrower: string, commitment_hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_health_factor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the collateral-aware health factor for a borrower, expressed in
   * basis points (bps).
   * 
   * Off-chain keepers use this single query to decide whether a borrower is
   * under-collateralized and eligible for `default_credit_line`.
   * 
   * # Interpretation
   * 
   * - Returns `u32::MAX` when `utilized_amount == 0` (no debt → infinitely
   * healthy).
   * - A value below `10_000` means the position is under-collateralized and
   * eligible for liquidation (`default_credit_line`).
   * - A value of `10_000` means the collateral exactly covers the minimum
   * required amount.
   * - A value above `10_000` means the position is over-collateralized
   * relative to the minimum ratio.
   * 
   * See [`query::get_health_factor`] for the full formula and edge-case
   * documentation.
   */
  get_health_factor: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_late_fee_flat transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured flat late fee per missed installment.
   */
  get_late_fee_flat: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_oracle_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the current oracle circuit-breaker configuration, if set.
   */
  get_oracle_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<OracleConfig>>>

  /**
   * Construct and simulate a set_late_fee_flat transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the flat late fee per missed installment (admin only).
   */
  set_late_fee_flat: ({fee}: {fee: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_oracle_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the oracle price-feed circuit breaker thresholds.
   * 
   * Once set, `settle_default_liquidation` requires a valid `oracle_price`
   * that is within `max_deviation_bps` of the last accepted price and whose
   * stored timestamp is no older than `max_age_seconds`.
   * 
   * # Validation
   * - `max_deviation_bps` must be in `1..=10_000`.
   * - `max_age_seconds` must be > 0.
   * 
   * # Authorization
   * Admin only.
   */
  set_oracle_config: ({max_deviation_bps, max_age_seconds}: {max_deviation_bps: u32, max_age_seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unfreeze_borrower transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Remove a temporary freeze before its natural expiry (admin only).
   * 
   * If no freeze is currently set, this is a no-op. Repayments have never
   * been affected by this flag, so unfreezing early just restores draw access.
   * 
   * # Errors
   * - Reverts with auth error if caller is not the configured admin.
   */
  unfreeze_borrower: ({admin, borrower}: {admin: string, borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw_treasury transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw accumulated treasury balance to configured treasury address (admin only).
   */
  withdraw_treasury: ({admin}: {admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deposit_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit collateral tokens from the borrower into the contract.
   * 
   * # Authorization
   * Requires `borrower.require_auth()`.
   * 
   * # Errors
   * * `ContractError::InvalidAmount` if `amount <= 0`
   * * `ContractError::MissingLiquidityToken` if collateral token not configured
   * * `ContractError::Overflow` on arithmetic overflow
   */
  deposit_collateral: ({borrower, amount}: {borrower: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a freeze_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Freeze a single credit line's draws with a structured reason (admin only).
   * 
   * Does not mutate [`CreditStatus`]. Repayments remain available.
   * 
   * # Errors
   * - [`ContractError::CreditLineNotFound`] when no credit line exists.
   * 
   * # Events
   * Emits `CreditLineFreezeEvent` on `("credit", "line_frz")`.
   */
  freeze_credit_line: ({borrower, reason}: {borrower: string, reason: FreezeReason}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_schema_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current storage schema version.
   */
  get_schema_version: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a get_total_utilized transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the global total utilized accumulator.
   */
  get_total_utilized: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_vrf_commitment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the VRF commitment for a borrower (if it exists).
   * 
   * # Parameters
   * - `borrower`: Address of the borrower.
   * 
   * # Returns
   * The VRF commitment data, or `None` if no commitment exists.
   */
  get_vrf_commitment: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<VrfCommitment>>>

  /**
   * Construct and simulate a is_borrower_frozen transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check whether a borrower's draws are currently frozen.
   * 
   * Returns `true` when a temporary freeze is in effect (`now < expiry_ts`).
   * Returns `false` when no freeze has been set, or when the freeze has expired.
   * No auth required.
   */
  is_borrower_frozen: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a is_protocol_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query whether the protocol is currently paused.
   * 
   * No auth required — pure read.
   */
  is_protocol_paused: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a borrow_capabilities transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return a borrower's current borrow capabilities bitmap.
   * 
   * Read-only view that reports whether the borrower can draw, repay,
   * or self-suspend, based on the current protocol state and the
   * borrower's credit line status. Amount-dependent checks (limit,
   * collateral ratio, cooldown, exposure caps) are not evaluated.
   * 
   * # Authentication
   * No authentication required. This is a pure read-only query.
   * 
   * # Returns
   * A [`BorrowCapabilities`] struct with three bool fields:
   * - `can_draw` — draw pre-flight checks pass
   * - `can_repay` — repay pre-flight checks pass
   * - `can_self_suspend` — self-suspend pre-flight checks pass
   */
  borrow_capabilities: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<BorrowCapabilities>>

  /**
   * Construct and simulate a default_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  default_credit_line: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_late_fee_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the currently configured structured late-fee configuration.
   * 
   * Returns `None` when no structured config has been stored, meaning the
   * contract uses the legacy `LateFeeFlat` / `PenaltySurchargeBps` keys.
   */
  get_late_fee_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<LateFeeConfig>>>

  /**
   * Construct and simulate a get_max_draw_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_max_draw_amount: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<i128>>>

  /**
   * Construct and simulate a get_protocol_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns all global protocol configuration in a single call.
   * 
   * Useful for integrators who need to inspect the current state without
   * making multiple RPC calls. All fields are deterministic reads from
   * instance storage — no side effects.
   * 
   * - `liquidity_token`: `None` until `set_liquidity_token` is called.
   * - `liquidity_source`: `None` until `init` is called (defaults to contract address).
   */
  get_protocol_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<ProtocolConfig>>

  /**
   * Construct and simulate a get_utilization_cap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the utilization cap in basis points for a borrower, if set.
   */
  get_utilization_cap: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a is_borrower_blocked transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return true if `borrower` is currently on the blocklist.
   * Read-only; no auth required; no event emitted.
   */
  is_borrower_blocked: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a set_late_fee_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the structured late-fee configuration (flat amount or APR-based).
   * 
   * Pass `Some(LateFeeConfig::Flat(FlatFeeConfig { amount }))` to charge a
   * fixed token amount per overdue installment.  Pass
   * `Some(LateFeeConfig::AprBased(AprFeeConfig { surcharge_bps }))` to use
   * the existing APR-surcharge behaviour.  Pass `None` to remove the
   * structured config and fall back to the legacy `LateFeeFlat` /
   * `PenaltySurchargeBps` instance keys.
   * 
   * # Authorization
   * Requires admin signature via [`require_admin_auth`].
   * 
   * # Validation
   * - `Flat` mode: `amount` must be `>= 0`; negative amounts revert with
   * [`ContractError::InvalidAmount`].
   * - `AprBased` mode: `surcharge_bps` must be `<= 10_000`; values above
   * the cap revert with [`ContractError::RateTooHigh`].
   */
  set_late_fee_config: ({config}: {config: Option<LateFeeConfig>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_liquidity_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sets the SAC (Stellar Asset Contract) or compatible token contract used for
   * reserve balance checks, draw transfers, and repayment transfers.
   * 
   * # Authorization
   * Requires administrative privileges. The configured admin must authorize this
   * call via `require_auth()`; unauthorized callers are rejected before any
   * storage mutation occurs.
   * 
   * # Storage
   * Writes `token_address` to instance storage under [`DataKey::LiquidityToken`].
   * Calling this function a second time overwrites the previously stored address.
   * 
   * # Errors
   * - Panics with [`ContractError::Paused`] if the protocol circuit-breaker is active.
   * - Panics with auth error if the caller is not the configured admin.
   */
  set_liquidity_token: ({token_address}: {token_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_max_draw_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_max_draw_amount: ({amount}: {amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_protocol_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Emergency pause the protocol (admin only).
   * 
   * When paused, all mutating entrypoints except `repay_credit` are blocked
   * with [`ContractError::Paused`] (code 18). Repayments are always allowed
   * so borrowers can deleverage even during an emergency.
   * 
   * # Parameters
   * - `paused`: `true` to pause, `false` to unpause.
   * 
   * # Authorization
   * Admin only.
   * 
   * # Events
   * Emits `("credit", "paused")` with `true` or `("credit", "unpaused")` with `false`.
   */
  set_protocol_paused: ({paused}: {paused: boolean}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_utilization_cap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set a per-borrower utilization cap in basis points (admin only).
   * 
   * When set, `draw_credit` will reject any draw that would push
   * `utilized_amount` above `credit_limit * cap_bps / 10_000`.
   * 
   * # Parameters
   * - `borrower`: The borrower whose cap to configure.
   * - `cap_bps`: Cap ratio in basis points (1–10_000). Pass 0 to remove the cap.
   */
  set_utilization_cap: ({borrower, cap_bps}: {borrower: string, cap_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a suspend_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  suspend_credit_line: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw collateral tokens to the borrower.
   * 
   * # Authorization
   * Requires `borrower.require_auth()`.
   * 
   * # Errors
   * * `ContractError::InvalidAmount` if `amount <= 0`
   * * `ContractError::InsufficientCollateralBalance` if insufficient balance
   * * `ContractError::CollateralRatioBelowMinimum` if withdrawal would violate ratio
   */
  withdraw_collateral: ({borrower, amount}: {borrower: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a bulk_block_borrowers transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Block up to `BULK_BLOCK_MAX` borrowers in a single call. Admin only.
   * 
   * # Panics
   * If `borrowers.len() > BULK_BLOCK_MAX`.
   * 
   * # Events
   * Emits one `BorrowerBlockedEvent { blocked: true }` per borrower.
   */
  bulk_block_borrowers: ({admin, borrowers}: {admin: string, borrowers: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a clear_vrf_commitment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Clear the VRF commitment for a borrower (admin only).
   * 
   * This function removes the VRF commitment, allowing a new commitment to be
   * made. This is intended for cases where the VRF process needs to be restarted.
   * 
   * # Parameters
   * - `borrower`: Address of the borrower.
   * 
   * # Errors
   * - Reverts if protocol is paused.
   * - Reverts if caller is not admin.
   */
  clear_vrf_commitment: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_auction_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the configured auction contract address, if set.
   */
  get_auction_contract: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a get_close_factor_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the current protocol-level max close factor in basis points.
   * 
   * Returns `10_000` if never configured by the admin.
   */
  get_close_factor_bps: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_contract_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_contract_version: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [u32, u32, u32]>>

  /**
   * Construct and simulate a get_liquidity_source transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_liquidity_source: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_max_repay_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_max_repay_amount: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<i128>>>

  /**
   * Construct and simulate a get_proof_of_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return proof-of-reserve balances for the protocol treasury.
   * 
   * Read-only view exposing accumulated reserves for transparency
   * and indexer integration.
   */
  get_proof_of_reserve: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<ProofOfReserve>>

  /**
   * Construct and simulate a get_protocol_fee_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get configured protocol fee in basis points, if set.
   */
  get_protocol_fee_bps: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a get_protocol_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get protocol-level dashboard totals in one read-only call.
   * 
   * Reads aggregate counters only: no borrower records are loaded and no TTL
   * entries are extended.
   */
  get_protocol_summary: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<ProtocolSummary>>

  /**
   * Construct and simulate a set_auction_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the auction contract address for default-liquidation hooks.
   * 
   * When set, the credit contract records which auction contract is
   * authorized to participate in the liquidation settlement flow. This
   * address is stored in instance storage and can be updated by the admin.
   * 
   * # Authorization
   * Admin only.
   */
  set_auction_contract: ({auction_address}: {auction_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_close_factor_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the protocol-level max close factor in basis points (admin only).
   * 
   * This caps the `close_factor_bps` parameter accepted by
   * `settle_default_liquidation`. When set to e.g. `5_000`, no single
   * settlement can recover more than 50% of the outstanding debt, even
   * if the caller supplies a higher value. Defaults to `10_000` (full
   * liquidation) when never configured.
   * 
   * # Validation
   * - `close_factor_bps` must be in `1..=10_000`.
   * 
   * # Authorization
   * Admin only.
   * 
   * # Events
   * Emits a `clsfctr` event with the new value.
   */
  set_close_factor_bps: ({close_factor_bps}: {close_factor_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_liquidity_source transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_liquidity_source: ({reserve_address}: {reserve_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_max_repay_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_max_repay_amount: ({amount}: {amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_protocol_fee_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set protocol fee in basis points (applied to interest portion of repayments).
   * Admin only. Fee is bounded by `MAX_PROTOCOL_FEE_BPS`.
   */
  set_protocol_fee_bps: ({bps}: {bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_quorum_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sets the quorum threshold weight.
   * Admin only.
   */
  set_quorum_threshold: ({threshold}: {threshold: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_reporting_window transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sets the reporting freshness window in seconds.
   * Admin only.
   */
  set_reporting_window: ({window_seconds}: {window_seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a submit_oracle_prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Submit N oracle prices and resolve a quorum canonical price (admin only).
   * 
   * Runs the quorum-of-K algorithm:
   * 1. Sorts submitted prices ascending.
   * 2. Finds the first K-wide window whose spread is within
   * `max_deviation_bps` of the lowest price in that window.
   * 3. Returns the lower-median of that window as the canonical price.
   * 4. Stores the canonical price and the current ledger timestamp.
   * 
   * The stored price is subsequently used by `settle_default_liquidation`
   * (staleness is re-checked there against `max_age_seconds`).
   * 
   * # Validation
   * - Oracle quorum config must be set via `set_oracle_quorum_config` first.
   * - 2 ≤ `prices.len()` ≤ `MAX_ORACLE_FEEDS` (20).
   * - Every price must be strictly positive.
   * - At least `min_quorum_k` prices must agree within `max_deviation_bps`.
   * 
   * # Authorization
   * Admin only.
   * 
   * # Events
   * Emits an `orc_qprc` event with the resolved price, quorum K, and timestamp.
   */
  submit_oracle_prices: ({prices}: {prices: Array<i128>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a unfreeze_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Lift a per-credit-line draw freeze (admin only).
   * 
   * No-op when the borrower was not frozen.
   */
  unfreeze_credit_line: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a freeze_borrower_until transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Temporarily freeze a borrower's draws until the given expiry timestamp (admin only).
   * 
   * # Parameters
   * - `admin`: Must be the current contract admin (checked via `require_admin_auth` + explicit `require_auth`).
   * - `borrower`: The address whose draw capability should be frozen.
   * - `expiry_ts`: Ledger timestamp (seconds) at which the freeze auto-expires.
   * Must be strictly greater than the current ledger timestamp.
   * 
   * # Behaviour
   * - Stores the expiry timestamp in persistent storage under [`DataKey::FrozenBorrower`].
   * - Once `env.ledger().timestamp() >= expiry_ts`, the freeze auto-lifts — no
   * admin call needed.
   * - Calling again for the same borrower updates the expiry to the new value.
   * - Repayments are **never** blocked by a temporary freeze.
   * 
   * # Errors
   * - Reverts with [`ContractError::InvalidAmount`] if `expiry_ts <= now`.
   * - Reverts with auth error if caller is not the configured admin.
   * 
   * # Events
   * Emits `BorrowerFrozenEvent` on topic `("br_freeze",)`.
   */
  freeze_borrower_until: ({admin, borrower, expiry_ts}: {admin: string, borrower: string, expiry_ts: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_attestation_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the committed attestation batch for a borrower, if any.
   */
  get_attestation_batch: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<AttestationBatch>>>

  /**
   * Construct and simulate a get_collateral_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query: return the current collateral token allowlist.
   * Get the list of allowed collateral tokens.
   * 
   * # Returns
   * Vector of allowed token addresses.
   */
  get_collateral_tokens: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_credit_line_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the number of indexed credit lines.
   */
  get_credit_line_count: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_draw_min_interval transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured minimum draw interval between borrower draws.
   */
  get_draw_min_interval: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u64>>>

  /**
   * Construct and simulate a is_credit_line_frozen transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns `true` when the borrower's credit line has an active admin freeze.
   */
  is_credit_line_frozen: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a reinstate_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  reinstate_credit_line: ({borrower, target_status}: {borrower: string, target_status: CreditStatus}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_draw_min_interval transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the minimum interval between borrower draws.
   * Pass `0` to disable the per-borrower draw cooldown.
   */
  set_draw_min_interval: ({seconds}: {seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a enumerate_credit_lines transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Enumerate credit lines in stable insertion order.
   * 
   * `start_after` is an exclusive cursor over the stable numeric id.
   * Results are capped by `MAX_ENUMERATION_LIMIT` for predictable cost.
   */
  enumerate_credit_lines: ({start_after, limit}: {start_after: Option<u32>, limit: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<readonly [u32, CreditLineData]>>>

  /**
   * Construct and simulate a get_borrower_liq_grace transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the per-borrower liquidation grace period in seconds for `borrower`.
   */
  get_borrower_liq_grace: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_max_total_exposure transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured global exposure cap, or `None` if uncapped.
   */
  get_max_total_exposure: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<i128>>>

  /**
   * Construct and simulate a get_rate_change_limits transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rate_change_limits: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<RateChangeConfig>>>

  /**
   * Construct and simulate a get_repayment_schedule transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_repayment_schedule: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<RepaymentSchedule>>>

  /**
   * Construct and simulate a lifecycle_capabilities transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the lifecycle-transition capabilities bitmap for `borrower` (v7).
   * 
   * Read-only pre-flight check for every state-changing lifecycle
   * entrypoint (`suspend_credit_line`, `self_suspend_credit_line`,
   * `close_credit_line`, `default_credit_line`, `reinstate_credit_line`),
   * derived from the credit line's current status and the protocol pause
   * flag. Every field is `false` when no credit line exists for
   * `borrower`.
   * 
   * # Authentication
   * No authentication required. This is a pure read-only query.
   * 
   * # Returns
   * A [`LifecycleCapabilities`] bitmap. See its field docs for the exact
   * precondition each flag mirrors.
   */
  lifecycle_capabilities: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<LifecycleCapabilities>>

  /**
   * Construct and simulate a set_borrower_liq_grace transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set or update the per-borrower liquidation grace period in seconds (admin only).
   * 
   * # Arguments
   * - `env`: Soroban environment.
   * - `borrower`: Borrower address to configure.
   * - `grace_period_seconds`: Grace period duration in seconds. Pass `0` to remove.
   */
  set_borrower_liq_grace: ({borrower, grace_period_seconds}: {borrower: string, grace_period_seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_max_total_exposure transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the maximum total utilization allowed across all credit lines (admin only).
   * 
   * Once set, `draw_credit` reverts with [`ContractError::ExposureCapExceeded`] if
   * `total_utilized + amount > max_total_exposure`.
   * 
   * Pass `0` to remove the cap entirely (no protocol-wide limit).
   * 
   * # Errors
   * - Reverts with [`ContractError::InvalidAmount`] if `amount` is negative.
   * - Reverts if caller is not the configured admin.
   */
  set_max_total_exposure: ({amount}: {amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_rate_change_limits transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rate_change_limits: ({max_rate_change_bps, rate_change_min_interval}: {max_rate_change_bps: u32, rate_change_min_interval: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_repayment_schedule transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_repayment_schedule: ({borrower, amount_per_period, period_seconds, first_due_ts}: {borrower: string, amount_per_period: i128, period_seconds: u64, first_due_ts: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a update_risk_parameters transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_risk_parameters: ({borrower, credit_limit, interest_rate_bps, risk_score}: {borrower: string, credit_limit: i128, interest_rate_bps: u32, risk_score: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a clear_attestation_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Clear a borrower's attestation batch (admin only).
   */
  clear_attestation_batch: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_borrower_rate_floor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the per-borrower interest rate floor, if set.
   */
  get_borrower_rate_floor: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a get_credit_limit_bounds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured global credit limit bounds.
   * 
   * Returns the minimum and maximum allowed credit limits, if configured.
   * 
   * # Returns
   * `(min_credit_limit, max_credit_limit)` tuple, or `(None, None)` if not configured.
   */
  get_credit_limit_bounds: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [Option<i128>, Option<i128>]>>

  /**
   * Construct and simulate a get_credit_line_summary transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Backward-compatible alias for older tests and SDK callers.
   */
  get_credit_line_summary: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<CreditLineData>>>

  /**
   * Construct and simulate a get_draws_freeze_reason transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the structured reason for the active global draw freeze.
   * 
   * Returns `None` when draws are not currently frozen.
   */
  get_draws_freeze_reason: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<FreezeReason>>>

  /**
   * Construct and simulate a get_grace_period_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_grace_period_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<GracePeriodConfig>>>

  /**
   * Construct and simulate a get_rate_formula_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rate_formula_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<RateFormulaConfig>>>

  /**
   * Construct and simulate a get_risk_admin_cooldown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured risk admin cooldown duration in seconds.
   */
  get_risk_admin_cooldown: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a set_borrower_rate_floor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set a per-borrower interest rate floor (admin only).
   * 
   * When set, `update_risk_parameters` will ensure the effective rate
   * is at least `floor_bps` for this borrower.
   * 
   * # Parameters
   * - `borrower`: Address of the borrower.
   * - `floor_bps`: Minimum rate in basis points. Pass `None` to clear.
   */
  set_borrower_rate_floor: ({borrower, floor_bps}: {borrower: string, floor_bps: Option<u32>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_credit_limit_bounds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set global credit limit bounds (admin only).
   * 
   * Configures the minimum and maximum allowed credit limits for all credit lines.
   * These bounds are enforced when opening new credit lines or increasing existing limits.
   * 
   * # Parameters
   * - `min`: Minimum allowed credit limit. Must be >= 0.
   * - `max`: Maximum allowed credit limit. Must be >= min.
   * 
   * # Authorization
   * Requires admin authorization.
   * 
   * # Errors
   * - `ContractError::InvalidAmount` if `min < 0`
   * - `ContractError::LimitOutOfBounds` if `max < min`
   * - `ContractError::Paused` if protocol is paused
   * 
   * # Example
   * ```ignore
   * client.set_credit_limit_bounds(&1_000, &1_000_000_000);
   * // Now all credit lines must have limits between 1,000 and 1,000,000,000
   * ```
   */
  set_credit_limit_bounds: ({min, max}: {min: i128, max: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_grace_period_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the optional grace period policy for Suspended credit lines (admin only).
   * 
   * When configured, a Suspended line accrues interest at a reduced (or zero)
   * rate for `grace_period_seconds` after the suspension timestamp. After the
   * window expires, normal accrual resumes at the line's full rate.
   * 
   * # Parameters
   * - `grace_period_seconds`: Duration of the grace window. Pass `0` to disable
   * the grace period without removing the config record.
   * - `waiver_mode`: [`GraceWaiverMode::FullWaiver`] (zero interest) or
   * [`GraceWaiverMode::ReducedRate`] (partial rate).
   * - `reduced_rate_bps`: Rate applied during the window when `waiver_mode` is
   * `ReducedRate`. Must be ≤ 10 000. Ignored for `FullWaiver`.
   * 
   * # Errors
   * - Reverts if caller is not the contract admin.
   * - Reverts with [`ContractError::RateTooHigh`] if `reduced_rate_bps > 10 000`.
   * 
   * # Economics and risks
   * See [`GracePeriodConfig`] and [`GraceWaiverMode`] for a full discussion of
   * the economic trade-offs and interaction with `default_credit_line` and
   * `reinstate_credit_line`.
   */
  set_grace_period_config: ({grace_period_seconds, waiver_mode, reduced_rate_bps}: {grace_period_seconds: u64, waiver_mode: GraceWaiverMode, reduced_rate_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_rate_formula_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_rate_formula_config: ({base_rate_bps, slope_bps_per_score, min_rate_bps, max_rate_bps}: {base_rate_bps: u32, slope_bps_per_score: u32, min_rate_bps: u32, max_rate_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_risk_admin_cooldown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the risk admin cooldown duration in seconds (admin only).
   */
  set_risk_admin_cooldown: ({seconds}: {seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a close_credit_lines_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin-only batch close of multiple credit lines.
   * Reverts on first failure, ensuring atomicity.
   * 
   * # Parameters
   * - `borrowers`: List of borrower addresses to close; max `BATCH_CLOSE_MAX`
   */
  close_credit_lines_batch: ({borrowers}: {borrowers: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a commit_attestation_batch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Commit an attestation batch for a borrower (admin only).
   */
  commit_attestation_batch: ({borrower, merkle_root, count}: {borrower: string, merkle_root: Buffer, count: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deposit_collateral_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit a specific allowlisted collateral token from the borrower.
   * 
   * Requires borrower `require_auth`. Reverts with `MissingLiquidityToken` if
   * `token` is not on the allowlist.
   * Deposit a specific allowed collateral token into the contract.
   * 
   * # Authorization
   * Requires `borrower.require_auth()`.
   * 
   * # Errors
   * * `ContractError::InvalidAmount` if `amount <= 0`
   * * `ContractError::MissingLiquidityToken` if token not allowed
   * * `ContractError::Overflow` on arithmetic overflow
   */
  deposit_collateral_token: ({borrower, token, amount}: {borrower: string, token: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_collateral_for_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query: return a borrower's balance for a specific collateral token.
   * Get the balance of a specific collateral token for a borrower.
   * 
   * # Returns
   * The collateral balance for the specified token (as `i128`).
   */
  get_collateral_for_token: ({borrower, token}: {borrower: string, token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_oracle_quorum_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the current multi-oracle quorum configuration, if set.
   */
  get_oracle_quorum_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<OracleQuorumConfig>>>

  /**
   * Construct and simulate a self_suspend_credit_line transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  self_suspend_credit_line: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_oracle_quorum_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the multi-oracle quorum parameters (admin only).
   * 
   * Once set, calls to `submit_oracle_prices` validate that at least
   * `min_quorum_k` of the supplied prices agree within `max_deviation_bps`
   * of each other. The resolved median price is stored and used by
   * `settle_default_liquidation` (staleness-checked against
   * `max_age_seconds`).
   * 
   * Quorum mode takes precedence over the single-oracle circuit breaker:
   * when both are configured, `settle_default_liquidation` uses the quorum
   * price and ignores the `oracle_price` parameter.
   * 
   * # Validation
   * - `min_quorum_k` must be ≥ 2.
   * - `max_deviation_bps` must be ≤ 10_000.
   * - `max_age_seconds` must be > 0.
   * 
   * # Authorization
   * Admin only.
   * 
   * # Events
   * Emits an `orc_qcfg` event with the new configuration.
   */
  set_oracle_quorum_config: ({min_quorum_k, max_deviation_bps, max_age_seconds}: {min_quorum_k: u32, max_deviation_bps: u32, max_age_seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a verify_attestation_proof transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Verify a Merkle inclusion proof against a borrower's attestation batch.
   */
  verify_attestation_proof: ({borrower, leaf, proof}: {borrower: string, leaf: Buffer, proof: Array<Buffer>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a clear_rate_formula_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  clear_rate_formula_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_borrower_frozen_until transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the freeze expiry timestamp for a borrower, if one is set.
   * 
   * Returns `Some(expiry_ts)` when a temporary freeze record exists (even if
   * expired). Returns `None` when no freeze has ever been set for this borrower.
   * No auth required.
   */
  get_borrower_frozen_until: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u64>>>

  /**
   * Construct and simulate a get_borrower_rate_ceiling transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the per-borrower interest rate ceiling, if set.
   */
  get_borrower_rate_ceiling: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a get_borrow_admin_cooldown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured critical admin-action cooldown.
   */
  get_borrow_admin_cooldown: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u64>>>

  /**
   * Construct and simulate a get_penalty_surcharge_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured penalty surcharge in basis points.
   */
  get_penalty_surcharge_bps: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_protocol_pause_reason transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the structured pause reason, if one was recorded during the last pause.
   * 
   * Returns `None` before any pause or when the admin used the reason-less
   * `set_protocol_paused(bool)`. The reason is cleared on unpause.
   * 
   * No auth required — pure read.
   */
  get_protocol_pause_reason: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<PauseReason>>>

  /**
   * Construct and simulate a get_protocol_summary_view transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get protocol-level dashboard totals requested for GrantFox campaign.
   */
  get_protocol_summary_view: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<ProtocolSummaryView>>

  /**
   * Construct and simulate a set_borrower_rate_ceiling transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set a per-borrower interest rate ceiling (admin only).
   * 
   * When set, `update_risk_parameters` will cap the effective rate
   * at `ceiling_bps` for this borrower.
   * 
   * # Parameters
   * - `borrower`: Address of the borrower.
   * - `ceiling_bps`: Maximum rate in basis points. Pass `None` to clear.
   */
  set_borrower_rate_ceiling: ({borrower, ceiling_bps}: {borrower: string, ceiling_bps: Option<u32>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_borrow_admin_cooldown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the minimum interval between critical admin actions for one borrower.
   * Pass `0` to disable the per-borrower admin cooldown.
   */
  set_borrow_admin_cooldown: ({seconds}: {seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_penalty_surcharge_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the penalty surcharge in basis points for delinquent lines (admin only).
   */
  set_penalty_surcharge_bps: ({bps}: {bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw_collateral_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw a specific allowlisted collateral token to the borrower.
   * 
   * Requires borrower `require_auth`. Reverts with `InsufficientCollateralBalance`
   * if the borrower's balance for `token` is below `amount`.
   * Withdraw a specific allowed collateral token to the borrower.
   * 
   * # Authorization
   * Requires `borrower.require_auth()`.
   * 
   * # Errors
   * * `ContractError::InvalidAmount` if `amount <= 0`
   * * `ContractError::MissingLiquidityToken` if token not allowed
   * * `ContractError::InsufficientCollateralBalance` if insufficient balance
   */
  withdraw_collateral_token: ({borrower, token, amount}: {borrower: string, token: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_accrual_admin_cooldown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured accrual-critical admin-action cooldown.
   */
  get_accrual_admin_cooldown: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u64>>>

  /**
   * Construct and simulate a get_credit_lines_paginated transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return a paginated view of credit lines for off-chain reporting.
   * 
   * Uses cursor-based pagination where the cursor is the stable numeric ID
   * assigned to each borrower. This allows efficient, stateless navigation
   * through large sets of credit lines without offset-based limitations.
   * 
   * # Parameters
   * 
   * - `cursor`: Optional starting cursor (numeric ID). Pass `None` for the first page.
   * - `limit`: Maximum number of credit lines to return. Must be <= 100.
   * 
   * # Returns
   * 
   * A [`CreditLinesPage`] containing:
   * - `credit_lines`: Vector of credit line data for this page.
   * - `next_cursor`: Cursor for the next page, or `None` if this is the last page.
   * 
   * # Authentication
   * 
   * No authentication required. This is a pure read-only query.
   * 
   * # Example
   * 
   * ```text
   * // First page
   * let page1 = client.get_credit_lines_paginated(None, 10);
   * 
   * // Second page
   * if let Some(cursor) = page1.next_cursor {
   * let page2 = client.get_credit_lines_paginated(Some(cursor), 10);
   * }
   * ```
   */
  get_credit_lines_paginated: ({cursor, limit}: {cursor: Option<u32>, limit: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<CreditLinesPage>>

  /**
   * Construct and simulate a get_treasury_fee_share_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get configured treasury fee share in basis points.
   * 
   * Returns `None` when unset; callers should treat that as 100 % treasury.
   */
  get_treasury_fee_share_bps: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a partial_release_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Release a portion of collateral to the borrower while the credit line
   * stays above the configured health-factor threshold.
   * 
   * # What
   * 
   * Transfers exactly `amount` collateral tokens from the contract back to
   * `borrower`, subject to two invariants:
   * 
   * 1. **Balance invariant** — `amount` must not exceed the borrower's
   * current collateral balance.
   * 2. **Health-factor invariant** — after the release,
   * `remaining_collateral >= utilized_amount * min_collateral_ratio_bps / 10_000`.
   * When `utilized_amount == 0` the ratio is not checked.
   * 
   * # Authorization
   * 
   * `borrower.require_auth()` — only the borrower may release their own
   * collateral.
   * 
   * # Parameters
   * 
   * - `borrower` — address whose collateral balance is reduced; must
   * authorize this call.
   * - `amount` — token units to release; must be strictly positive.
   * 
   * # Errors
   * 
   * | Error | Condition |
   * |---|---|
   * | [`ContractError::InvalidAmount`] (5) | `amount <= 0` |
   * | [`ContractError::InsufficientCollateralBalance`] (39) | `amount > current_balance` |
   * | [`ContractError::CollateralRatioBelowMin
   */
  partial_release_collateral: ({borrower, amount}: {borrower: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a settle_default_liquidation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Apply auction liquidation proceeds to a defaulted credit line (admin only).
   * 
   * This is accounting-only: no token transfer occurs here. Off-chain
   * orchestration must ensure auction proceeds are in protocol custody
   * before invoking this function.
   * 
   * # Reentrancy
   * Protected by the contract-wide reentrancy guard to prevent cross-contract
   * callback attacks during settlement.
   */
  settle_default_liquidation: ({borrower, recovered_amount, settlement_id, close_factor_bps, oracle_price}: {borrower: string, recovered_amount: i128, settlement_id: string, close_factor_bps: u32, oracle_price: Option<i128>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_accrual_admin_cooldown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the minimum interval between accrual-critical admin actions for one borrower.
   * Pass `0` to disable the per-borrower accrual admin cooldown.
   */
  set_accrual_admin_cooldown: ({seconds}: {seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_collateral_risk_weight transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the risk weight for a collateral asset, in basis points (admin only).
   * 
   * Risk weight scales how much a unit of this asset counts toward the
   * collateral ratio check. 10_000 bps (100%) means full value; lower
   * values discount the asset.
   * 
   * # Errors
   * - Reverts with [`ContractError::InvalidRiskWeight`] if `weight_bps > 10_000`.
   * - Reverts with [`ContractError::AdminCollateralCooldownActive`] when the
   * configured admin collateral cool-off has not elapsed since the last
   * critical collateral admin action.
   * - Reverts if caller is not the configured admin.
   * Set the risk weight for a collateral asset (admin only).
   * 
   * # Arguments
   * * `asset` - The collateral asset address
   * * `weight_bps` - Risk weight in basis points
   * 
   * # Errors
   * * Panics if caller is not admin (`ContractError::Unauthorized`)
   */
  set_collateral_risk_weight: ({asset, weight_bps}: {asset: string, weight_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_treasury_fee_share_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the treasury share of skimmed protocol fees in basis points (admin only).
   * 
   * `treasury_share_bps` must be in `0..=10_000`. The bounty pool receives the
   * remainder of each fee after the treasury portion is floored. When unset,
   * the default is `10_000` (100 % treasury, backward compatible).
   */
  set_treasury_fee_share_bps: ({treasury_share_bps}: {treasury_share_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_col_admin_cooldown_secs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query the configured admin collateral cool-off interval, if set.
   */
  get_col_admin_cooldown_secs: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u64>>>

  /**
   * Construct and simulate a set_col_admin_cooldown_secs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the minimum interval between critical collateral admin actions (admin only).
   * 
   * Pass `0` to disable the cool-off guard.
   */
  set_col_admin_cooldown_secs: ({seconds}: {seconds: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_last_col_admin_action_ts transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query the ledger timestamp of the last critical collateral admin action.
   */
  get_last_col_admin_action_ts: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u64>>>

  /**
   * Construct and simulate a get_min_collateral_ratio_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query the configured minimum collateral ratio in basis points.
   */
  get_min_collateral_ratio_bps: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<u32>>>

  /**
   * Construct and simulate a set_min_collateral_ratio_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the protocol-wide minimum collateral ratio in basis points (admin only).
   * 
   * Dial down to `0` to disable the ratio check on draws and withdrawals.
   * 
   * # Errors
   * - Reverts with [`ContractError::AdminCollateralCooldownActive`] when the
   * configured admin collateral cool-off has not elapsed.
   * Set the minimum collateral ratio required for borrowing (admin only).
   * 
   * # Arguments
   * * `ratio_bps` - The minimum collateral ratio in basis points (e.g., 15000 = 150%)
   * 
   * # Errors
   * * Panics if caller is not admin (`ContractError::Unauthorized`)
   * * Panics if protocol is paused (`ContractError::ProtocolPaused`)
   */
  set_min_collateral_ratio_bps: ({ratio_bps}: {ratio_bps: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_credit_line_freeze_reason transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the structured freeze reason for a credit line, if frozen.
   */
  get_credit_line_freeze_reason: ({borrower}: {borrower: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<FreezeReason>>>

  /**
   * Construct and simulate a set_collateral_token_allowlist transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin: add a token to the collateral allowlist.
   * 
   * The token must be a valid SAC-compatible contract address. Once listed
   * borrowers can call [`deposit_collateral_token`] / [`withdraw_collateral_token`]
   * using this token.
   * 
   * # Errors
   * - Reverts with [`ContractError::AdminCollateralCooldownActive`] when the
   * configured admin collateral cool-off has not elapsed.
   * Set the list of allowed collateral tokens (admin only).
   * 
   * # Arguments
   * * `tokens` - Vector of token addresses to allow
   * 
   * # Errors
   * * Panics if caller is not admin (`ContractError::Unauthorized`)
   */
  set_collateral_token_allowlist: ({tokens}: {tokens: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_protocol_paused_with_reason transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Emergency pause the protocol with a structured reason (admin only).
   * 
   * Same as `set_protocol_paused` but records a human-readable reason for
   * governance transparency and off-chain monitoring. The reason is stored
   * alongside the pause flag and cleared on unpause.
   * 
   * # Parameters
   * - `paused`: `true` to pause, `false` to unpause.
   * - `reason`: A human-readable reason symbol (e.g., "oracle-outage").
   * 
   * # Authorization
   * Admin only.
   * 
   * # Events
   * Emits `("credit", "paused")` or `("credit", "unpaused")`.
   */
  set_protocol_paused_with_reason: ({paused, reason}: {paused: boolean, reason: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAO5PbmUtdGltZSBjb250cmFjdCBpbml0aWFsaXphdGlvbi4KClN0b3JlcyB0aGUgaW1tdXRhYmxlIGFkbWluIGFkZHJlc3MsIHNlZWRzIHRoZSBnbG9iYWwgYWNjdW11bGF0b3JzLCBhbmQKYXBwbGllcyBjb25zZXJ2YXRpdmUgZGVmYXVsdCBjb2xsYXRlcmFsIGFuZCBjbG9zZS1mYWN0b3Igc2V0dGluZ3MuCkEgc2Vjb25kIGNhbGwgcmV2ZXJ0cyB3aXRoIFtgQ29udHJhY3RFcnJvcjo6QWxyZWFkeUluaXRpYWxpemVkYF0uAAAAAAAEaW5pdAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAABABVcGdyYWRlIHRoZSBjb250cmFjdCBXQVNNIHRvIGEgbmV3IHZlcnNpb24gKGFkbWluIG9ubHkpLgoKVGhpcyBlbnRyeXBvaW50IGFsbG93cyB0aGUgcHJvdG9jb2wgdG8gc2hpcCBidWcgZml4ZXMgYW5kIGZlYXR1cmUgYWRkaXRpb25zCndpdGhvdXQgbWlncmF0aW5nIGJvcnJvd2VyIHN0YXRlLiBUaGUgdXBncmFkZSBpcyBhdG9taWMgYW5kIHByZXNlcnZlcyBhbGwKZXhpc3Rpbmcgc3RvcmFnZS4KCiMgU2VjdXJpdHkgR2F0ZXMKLSAqKkFkbWluIGF1dGhlbnRpY2F0aW9uKio6IE9ubHkgdGhlIGNvbmZpZ3VyZWQgYWRtaW4gY2FuIGF1dGhvcml6ZSB1cGdyYWRlcy4KLSAqKlBhdXNlIGNoZWNrKio6IFVwZ3JhZGVzIGFyZSBibG9ja2VkIHdoZW4gdGhlIHByb3RvY29sIGNpcmN1aXQgYnJlYWtlciBpcyBhY3RpdmUuCgojIFN0YXRlIFVwZGF0ZXMKLSBCdW1wcyBgU0NIRU1BX1ZFUlNJT05gIGluIGluc3RhbmNlIHN0b3JhZ2UgdG8gdHJhY2sgdXBncmFkZSBoaXN0b3J5LgotIENhbGxzIGBlbnYuZGVwbG95ZXIoKS51cGRhdGVfY3VycmVudF9jb250cmFjdF93YXNtKG5ld193YXNtX2hhc2gpYCB0byBwZXJmb3JtCnRoZSBhdG9taWMgV0FTTSByZXBsYWNlbWVudC4KCiMgRXZlbnRzCkVtaXRzIGBDb250cmFjdFVwZ3JhZGVkRXZlbnRgIHdpdGggYm90aCB0aGUgb2xkIGFuZCBuZXcgV0FTTSBoYXNoZXMgZm9yCm9mZi1jaGFpbiBpbmRleGVycyBhbmQgYXVkaXQgdHJhaWxzLgoKIyBQYXJhbWV0ZXJzCi0gYG5ld193YXNtX2hhc2hgOiBUaGUgMzItYnl0ZSBoYXNoIG9mIHRoZSBuZXcgV0FTTSBiaW5hcnkgdG8gZGVwbG95LgoKIyBBdXRob3JpemF0aW9uClJlcXVpcmVzIGFkbWluIGF1dGhvcml6YXRpb24gdmlhIGByZXF1aXJlX2FkbWluX2F1dGgoKWAuCgojIEVycm9ycwotIGBDb250cmFjdEVycm9yOjpQYXVzZWRgIOKAlCBQcm90b2NvbCBpcyBwYXVzZWQgYnkgdGhlIGVtZXJnZW5jeSBjaXJjdWl0IGJyZWFrZXIuCi0gQXV0aCBlcnJvciDigJQgQ2FsbGVyIGlzIG5vdCB0aGUgY29uZmlndXJlZCBhZG1pAAAAB3VwZ3JhZGUAAAAAAQAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAD9BZGRzIG9yIHVwZGF0ZXMgYW4gb3JhY2xlJ3Mgd2VpZ2h0IGluIHRoZSByZWdpc3RyeS4KQWRtaW4gb25seS4AAAAACmFkZF9vcmFjbGUAAAAAAAIAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAAAAAAGd2VpZ2h0AAAAAAAEAAAAAA==",
        "AAAAAAAAACtHZXQgY29uZmlndXJlZCBib3VudHkgcG9vbCBhZGRyZXNzLCBpZiBhbnkuAAAAAApnZXRfYm91bnR5AAAAAAAAAAAAAQAAA+gAAAAT",
        "AAAAAAAAAFhDb25maWd1cmUgdGhlIGJvdW50eSBwb29sIGFkZHJlc3Mgd2hlcmUgd2l0aGRyYXduIGJvdW50eSBmZWVzIHdpbGwgYmUgc2VudCAoYWRtaW4gb25seSkuAAAACnNldF9ib3VudHkAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGYm91bnR5AAAAAAATAAAAAA==",
        "AAAAAAAAAvdEcmF3cyBjcmVkaXQgYnkgdHJhbnNmZXJyaW5nIGxpcXVpZGl0eSB0b2tlbnMgdG8gdGhlIGJvcnJvd2VyLgoKRW5mb3JjZXMgc3RhdHVzLCBsaW1pdCwgYW5kIGxpcXVpZGl0eSBjaGVja3MgYmVmb3JlIGV4ZWN1dGluZyB0aGUgdHJhbnNmZXIuCkEgcmVlbnRyYW5jeSBndWFyZCBpcyBzZXQgb24gZW50cnkgYW5kIGNsZWFyZWQgb24gZXZlcnkgZXhpdCBwYXRoIChzdWNjZXNzCmFuZCBmYWlsdXJlKS4gSWYgdGhpcyBmdW5jdGlvbiBpcyByZS1lbnRlcmVkIHdoaWxlIHRoZSBndWFyZCBpcyBhY3RpdmUsCnRoZSBjYWxsIHJldmVydHMgd2l0aCBbYENvbnRyYWN0RXJyb3I6OlJlZW50cmFuY3lgXS4KCiMgUGFyYW1ldGVycwotIGBib3Jyb3dlcmA6IFRoZSBhZGRyZXNzIGRyYXdpbmcgY3JlZGl0OyBtdXN0IGF1dGhvcml6ZSB0aGlzIGNhbGwuCi0gYGFtb3VudGA6IFRoZSBhbW91bnQgdG8gZHJhdzsgbXVzdCBiZSBwb3NpdGl2ZSBhbmQgd2l0aGluIGF2YWlsYWJsZSBsaW1pdC4KCiMgTm90ZQpOb3QgeWV0IGltcGxlbWVudGVkLiBQbGFubmVkIGxvZ2ljOiBsb2FkIGV4aXN0aW5nIHJlY29yZCwgdXBkYXRlIGZpZWxkcywKcGVyc2lzdCB1cGRhdGVkIFtgQ3JlZGl0TGluZURhdGFgXS4KQG5vdGljZSBEcmF3cyBjcmVkaXQgYnkgdHJhbnNmZXJyaW5nIGxpcXVpZGl0eSB0b2tlbnMgdG8gdGhlIGJvcnJvd2VyLgpAZGV2IEVuZm9yY2VzIHN0YXR1cy9saW1pdC9saXF1aWRpdHkgY2hlY2tzIGFuZCB1c2VzIGEgcmVlbnRyYW5jeSBndWFyZC4AAAAAC2RyYXdfY3JlZGl0AAAAAAIAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAALZ2V0X3ZlcnNpb24AAAAAAAAAAAEAAAPtAAAAAwAAAAQAAAAEAAAABA==",
        "AAAAAAAAAAAAAAAMYWNjZXB0X2FkbWluAAAAAAAAAAA=",
        "AAAAAAAAAS9NYXRlcmlhbGl6ZSBpbnRlcmVzdCBhY2NydWFsIGZvciBhIGJvdW5kZWQgbGlzdCBvZiBib3Jyb3dlcnMuCgpObyBhdXRoIGlzIHJlcXVpcmVkOiB0aGUgY2FsbCBvbmx5IHVwZGF0ZXMgYWNjb3VudGluZyBzdGF0ZSBmb3IgbGluZXMKdGhhdCBhbHJlYWR5IGV4aXN0IGFuZCBhcmUgYEFjdGl2ZWAuIE1pc3NpbmcgbGluZXMgYW5kIG5vbi1hY3RpdmUgbGluZXMKYXJlIHNraXBwZWQgd2l0aG91dCByZXZlcnRpbmcgdGhlIHdob2xlIGJhdGNoLiBPbmx5IG5vbi16ZXJvIGFjY3J1YWxzCmVtaXQgYEludGVyZXN0QWNjcnVlZEV2ZW50YC4AAAAADGFjY3J1ZV9iYXRjaAAAAAEAAAAAAAAACWJvcnJvd2VycwAAAAAAA+oAAAATAAAAAA==",
        "AAAAAAAAAM5Gb3JnaXZlIG91dHN0YW5kaW5nIGRlYnQgd2l0aG91dCB0cmFuc2ZlcnJpbmcgdG9rZW5zIChhZG1pbiBvbmx5KS4KClJlZHVjZXMgYGFjY3J1ZWRfaW50ZXJlc3RgIChhbmQgYHV0aWxpemVkX2Ftb3VudGApIGJ5IHVwIHRvIGBhbW91bnRgLgpFbWl0cyBbYERlYnRGb3JnaXZlbkV2ZW50YF0gYW5kIFtgQm9ycm93TGlmZWN5Y2xlRXZlbnRgXSBvbiBzdWNjZXNzLgAAAAAADGZvcmdpdmVfZGVidAAAAAIAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAklGcmVlemUgYWxsIGRyYXdzIGdsb2JhbGx5IChhZG1pbiBvbmx5KS4KClNldHMgW2BEYXRhS2V5OjpEcmF3c0Zyb3plbmBdIHdpdGggYGZyb3plbiA9IHRydWVgIGFuZCByZWNvcmRzIGByZWFzb25gLgoKIyBBdXRob3JpemF0aW9uClJlcXVpcmVzIGFkbWluaXN0cmF0aXZlIHByaXZpbGVnZXMuIFRoZSBjb25maWd1cmVkIGFkbWluIG11c3QgYXV0aG9yaXplIHRoaXMKY2FsbCB2aWEgYHJlcXVpcmVfYXV0aCgpYDsgdW5hdXRob3JpemVkIGNhbGxlcnMgYXJlIHJlamVjdGVkIGJlZm9yZSBhbnkKc3RvcmFnZSBtdXRhdGlvbiBvY2N1cnMuCgojIFN0b3JhZ2UKLSAqKlR5cGUqKjogSW5zdGFuY2Ugc3RvcmFnZSAoc2hhcmVkIFRUTCB3aXRoIGFsbCBpbnN0YW5jZSBrZXlzKQotICoqS2V5Kio6IGBEYXRhS2V5OjpEcmF3c0Zyb3plbmAKLSAqKlZhbHVlKio6IFtgRHJhd3NGcmVlemVTdGF0ZWBdCgojIEV2ZW50cwpFbWl0cyBbYERyYXdzRnJvemVuRXZlbnRgXSB3aXRoIGBmcm96ZW4gPSB0cnVlYC4KCiMgRXJyb3JzCi0gUGFuaWNzIHdpdGggYXV0aCBlcnJvciBpZiB0aGUgY2FsbGVyIGlzIG5vdCB0aGUgY29uZmlndXJlZCBhZG1pbi4AAAAAAAAMZnJlZXplX2RyYXdzAAAAAQAAAAAAAAAGcmVhc29uAAAAAAfQAAAADEZyZWV6ZVJlYXNvbgAAAAA=",
        "AAAAAAAAAChHZXQgY29uZmlndXJlZCB0cmVhc3VyeSBhZGRyZXNzLCBpZiBhbnkuAAAADGdldF90cmVhc3VyeQAAAAAAAAABAAAD6AAAABM=",
        "AAAAAAAAAdFSZXBheSBvdXRzdGFuZGluZyBjcmVkaXQgKHByaW5jaXBhbCArIGFjY3J1ZWQgaW50ZXJlc3QpLgoKUmVwYXltZW50IGlzIGFsbG93ZWQgb24gQWN0aXZlLCBTdXNwZW5kZWQsIGFuZCBEZWZhdWx0ZWQgbGluZXMuCkNsb3NlZCBsaW5lcyBjYW5ub3QgYWNjZXB0IHJlcGF5bWVudC4KCiMgRXJyb3JzCi0gW2BDb250cmFjdEVycm9yOjpJbnZhbGlkQW1vdW50YF0g4oCUIGBhbW91bnRgIGlzIHplcm8gb3IgbmVnYXRpdmUuCi0gW2BDb250cmFjdEVycm9yOjpDcmVkaXRMaW5lTm90Rm91bmRgXSDigJQgbm8gY3JlZGl0IGxpbmUgZXhpc3RzIGZvciBgYm9ycm93ZXJgLgotIFtgQ29udHJhY3RFcnJvcjo6Q3JlZGl0TGluZUNsb3NlZGBdIOKAlCBjcmVkaXQgbGluZSBpcyBjbG9zZWQuCi0gW2BDb250cmFjdEVycm9yOjpSZXBheUV4Y2VlZHNNYXhBbW91bnRgXSDigJQgYW1vdW50IGV4Y2VlZHMgcGVyLXR4IHJlcGF5IGNhcC4AAAAAAAAMcmVwYXlfY3JlZGl0AAAAAgAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAEZPcmFjbGVzIHJlcG9ydCB0aGVpciBvYnNlcnZlZCB2YWx1ZS4KUmVxdWlyZXMgcmVwb3J0aW5nIG9yYWNsZSdzIGF1dGguAAAAAAAMcmVwb3J0X3ZhbHVlAAAAAgAAAAAAAAAGb3JhY2xlAAAAAAATAAAAAAAAAAV2YWx1ZQAAAAAAAAoAAAAA",
        "AAAAAAAAAO1BZG1pbi1vbmx5IGJvdW5kZWQgcmV2ZXJzYWwgZm9yIGFuIGVycm9uZW91cyBkcmF3LgoKIyBTdG9yYWdlCkxvYWRzIHRoZSBjcmVkaXQgbGluZSB2aWEgYHN0b3JhZ2VfZ2V0X2NyZWRpdF9saW5lYCwgd2hpY2ggYnVtcHMgdGhlCmVudHJ5J3MgcGVyc2lzdGVudCBUVEwgb24gcmVhZCDigJQgaW5kZXBlbmRlbnQgb2Ygd2hldGhlciB0aGUgY2FsbCBnb2VzCm9uIHRvIG11dGF0ZSBhbmQgcGVyc2lzdCB0aGUgbGluZS4AAAAAAAAMcmV2ZXJzZV9kcmF3AAAABAAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAC29yaWdpbmFsX3RzAAAAAAYAAAAAAAAAC3JlYXNvbl9jb2RlAAAAAAQAAAAA",
        "AAAAAAAAAE5Db25maWd1cmUgdGhlIHRyZWFzdXJ5IGFkZHJlc3Mgd2hlcmUgd2l0aGRyYXduIGZlZXMgd2lsbCBiZSBzZW50IChhZG1pbiBvbmx5KS4AAAAAAAxzZXRfdHJlYXN1cnkAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACHRyZWFzdXJ5AAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANaXNfZGVsaW5xdWVudAAAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAB",
        "AAAAAAAAAAAAAAANcHJvcG9zZV9hZG1pbgAAAAAAAAIAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAAAAAAADWRlbGF5X3NlY29uZHMAAAAAAAAGAAAAAA==",
        "AAAAAAAAADBSZW1vdmVzIGFuIG9yYWNsZSBmcm9tIHRoZSByZWdpc3RyeS4KQWRtaW4gb25seS4AAAANcmVtb3ZlX29yYWNsZQAAAAAAAAEAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAA=",
        "AAAAAAAAAGpCbG9jayBhIHNpbmdsZSBib3Jyb3dlci4gQWRtaW4gb25seS4gSWRlbXBvdGVudC4KCiMgRXZlbnRzCkVtaXRzIGBCb3Jyb3dlckJsb2NrZWRFdmVudCB7IGJsb2NrZWQ6IHRydWUgfWAuAAAAAAAOYmxvY2tfYm9ycm93ZXIAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAA==",
        "AAAAAAAAAHVHZXQgdGhlIGN1cnJlbnQgY29sbGF0ZXJhbCBiYWxhbmNlIGZvciBhIGJvcnJvd2VyLgoKIyBSZXR1cm5zClRoZSBjb2xsYXRlcmFsIGJhbGFuY2UgaW4gdGhlIG5hdGl2ZSB0b2tlbiAoYXMgYGkxMjhgKS4AAAAAAAAOZ2V0X2NvbGxhdGVyYWwAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAL",
        "AAAAAAAAAnBVbmZyZWV6ZSBkcmF3cyBnbG9iYWxseSAoYWRtaW4gb25seSkuCgpTZXRzIFtgRGF0YUtleTo6RHJhd3NGcm96ZW5gXSB3aXRoIGBmcm96ZW4gPSBmYWxzZWAgd2hpbGUgcHJlc2VydmluZwp0aGUgb3JpZ2luYWwgZnJlZXplIHJlYXNvbiBmb3IgYXVkaXQgdHJhaWwuCgojIEF1dGhvcml6YXRpb24KUmVxdWlyZXMgYWRtaW5pc3RyYXRpdmUgcHJpdmlsZWdlcy4gVGhlIGNvbmZpZ3VyZWQgYWRtaW4gbXVzdCBhdXRob3JpemUgdGhpcwpjYWxsIHZpYSBgcmVxdWlyZV9hdXRoKClgOyB1bmF1dGhvcml6ZWQgY2FsbGVycyBhcmUgcmVqZWN0ZWQgYmVmb3JlIGFueQpzdG9yYWdlIG11dGF0aW9uIG9jY3Vycy4KCiMgU3RvcmFnZQotICoqVHlwZSoqOiBJbnN0YW5jZSBzdG9yYWdlIChzaGFyZWQgVFRMIHdpdGggYWxsIGluc3RhbmNlIGtleXMpCi0gKipLZXkqKjogYERhdGFLZXk6OkRyYXdzRnJvemVuYAotICoqVmFsdWUqKjogW2BEcmF3c0ZyZWV6ZVN0YXRlYF0KCiMgRXZlbnRzCkVtaXRzIFtgRHJhd3NGcm96ZW5FdmVudGBdIHdpdGggYGZyb3plbiA9IGZhbHNlYC4KCiMgRXJyb3JzCi0gUGFuaWNzIHdpdGggYXV0aCBlcnJvciBpZiB0aGUgY2FsbGVyIGlzIG5vdCB0aGUgY29uZmlndXJlZCBhZG1pbi4AAAAOdW5mcmVlemVfZHJhd3MAAAAAAAAAAAAA",
        "AAAAAAAAAN5SZXR1cm4gdGhlIGNyZWRpdCBsaW5lIGZvciBgYm9ycm93ZXJgLCBvciBgTm9uZWAgaWYgbm8gbGluZSBleGlzdHMuCgpObyBhdXRoZW50aWNhdGlvbiByZXF1aXJlZCDigJQgdGhpcyBpcyBhIHB1cmUgcmVhZCB3aXRoIG5vIHNpZGUgZWZmZWN0cy4KQWNjcnVhbCBpcyBsYXp5OyBwZW5kaW5nIGludGVyZXN0IHNpbmNlIHRoZSBsYXN0IGNoZWNrcG9pbnQgaXMgbm90IGFwcGxpZWQgaGVyZS4AAAAAAA9nZXRfY3JlZGl0X2xpbmUAAAAAAQAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAQAAA+gAAAfQAAAADkNyZWRpdExpbmVEYXRhAAA=",
        "AAAAAAAAAaJSZXR1cm5zIGB0cnVlYCB3aGVuIGRyYXdzIGFyZSBnbG9iYWxseSBmcm96ZW4uCgpEZWZhdWx0cyB0byBgZmFsc2VgIChkcmF3cyBhbGxvd2VkKSBpZiB0aGUga2V5IGhhcyBuZXZlciBiZWVuIHNldC4KCiMgQXV0aG9yaXphdGlvbgpObyBhdXRoZW50aWNhdGlvbiByZXF1aXJlZCDigJQgdGhpcyBpcyBhIHB1cmUgcmVhZCB3aXRoIG5vIHNpZGUgZWZmZWN0cy4KCiMgU3RvcmFnZQotICoqVHlwZSoqOiBJbnN0YW5jZSBzdG9yYWdlIChzaGFyZWQgVFRMIHdpdGggYWxsIGluc3RhbmNlIGtleXMpCi0gKipLZXkqKjogYERhdGFLZXk6OkRyYXdzRnJvemVuYAoKIyBSZXR1cm5zCi0gYHRydWVgIGlmIGRyYXdzIGFyZSBmcm96ZW4KLSBgZmFsc2VgIGlmIGRyYXdzIGFyZSBub3QgZnJvemVuIG9yIHRoZSBrZXkgaGFzIG5ldmVyIGJlZW4gc2V0AAAAAAAPaXNfZHJhd3NfZnJvemVuAAAAAAAAAAABAAAAAQ==",
        "AAAAAAAAAFNXaXRoZHJhdyBhY2N1bXVsYXRlZCBib3VudHkgcG9vbCBiYWxhbmNlIHRvIGNvbmZpZ3VyZWQgYm91bnR5IGFkZHJlc3MgKGFkbWluIG9ubHkpLgAAAAAPd2l0aGRyYXdfYm91bnR5AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAH1Db21wdXRlcyB0aGUgd2VpZ2h0ZWQgbWVkaWFuIG9mIHRoZSBsYXRlc3QgZnJlc2ggcmVwb3J0cyBmcm9tIGFwcHJvdmVkIG9yYWNsZXMuClJldHVybnMgZXJyb3IgaWYgcXVvcnVtIHRocmVzaG9sZCBpcyBub3QgbWV0LgAAAAAAABBnZXRfbWVkaWFuX3ZhbHVlAAAAAAAAAAEAAAPpAAAACgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAADNPcGVuIGEgbmV3IGNyZWRpdCBsaW5lIGZvciBhIGJvcnJvd2VyIChhZG1pbiBvbmx5KS4AAAAAEG9wZW5fY3JlZGl0X2xpbmUAAAAEAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAADGNyZWRpdF9saW1pdAAAAAsAAAAAAAAAEWludGVyZXN0X3JhdGVfYnBzAAAAAAAABAAAAAAAAAAKcmlza19zY29yZQAAAAAABAAAAAA=",
        "AAAAAAAAAG1VbmJsb2NrIGEgc2luZ2xlIGJvcnJvd2VyLiBBZG1pbiBvbmx5LiBJZGVtcG90ZW50LgoKIyBFdmVudHMKRW1pdHMgYEJvcnJvd2VyQmxvY2tlZEV2ZW50IHsgYmxvY2tlZDogZmFsc2UgfWAuAAAAAAAAEHVuYmxvY2tfYm9ycm93ZXIAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAARY2xvc2VfY3JlZGl0X2xpbmUAAAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABmNsb3NlcgAAAAAAEwAAAAA=",
        "AAAAAAAAAktDb21taXQgdG8gYSBWUkYgb3V0cHV0IGZvciBhIGJvcnJvd2VyJ3MgY3JlZGl0IHNjb3JlIGRlcml2YXRpb24gKGFkbWluIG9ubHkpLgoKVGhpcyBmdW5jdGlvbiBzdG9yZXMgYSBoYXNoIG9mIHRoZSBWUkYgb3V0cHV0LCBjcmVhdGluZyBhIGJpbmRpbmcgY29tbWl0bWVudAp0aGF0IHByZXZlbnRzIGV4LXBvc3QgbWFuaXB1bGF0aW9uIG9mIHRoZSBjcmVkaXQgc2NvcmUuIFRoZSBjb21taXRtZW50IG11c3QKYmUgc2V0IGJlZm9yZSBgdXBkYXRlX3Jpc2tfcGFyYW1ldGVyc2AgY2FuIGJlIGNhbGxlZCB3aXRoIGEgbmV3IHNjb3JlLgoKIyBQYXJhbWV0ZXJzCi0gYGJvcnJvd2VyYDogQWRkcmVzcyBvZiB0aGUgYm9ycm93ZXIgd2hvc2Ugc2NvcmUgd2lsbCBiZSBkZXJpdmVkIGZyb20gdGhpcyBWUkYuCi0gYGNvbW1pdG1lbnRfaGFzaGA6IDI1Ni1iaXQgaGFzaCBvZiB0aGUgVlJGIG91dHB1dC4KCiMgRXJyb3JzCi0gUmV2ZXJ0cyBpZiBwcm90b2NvbCBpcyBwYXVzZWQuCi0gUmV2ZXJ0cyBpZiBjYWxsZXIgaXMgbm90IGFkbWluLgotIFJldmVydHMgaWYgYSBjb21taXRtZW50IGFscmVhZHkgZXhpc3RzIGZvciB0aGlzIGJvcnJvd2VyLgAAAAARY29tbWl0X3ZyZl9vdXRwdXQAAAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAD2NvbW1pdG1lbnRfaGFzaAAAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAs1SZXR1cm4gdGhlIGNvbGxhdGVyYWwtYXdhcmUgaGVhbHRoIGZhY3RvciBmb3IgYSBib3Jyb3dlciwgZXhwcmVzc2VkIGluCmJhc2lzIHBvaW50cyAoYnBzKS4KCk9mZi1jaGFpbiBrZWVwZXJzIHVzZSB0aGlzIHNpbmdsZSBxdWVyeSB0byBkZWNpZGUgd2hldGhlciBhIGJvcnJvd2VyIGlzCnVuZGVyLWNvbGxhdGVyYWxpemVkIGFuZCBlbGlnaWJsZSBmb3IgYGRlZmF1bHRfY3JlZGl0X2xpbmVgLgoKIyBJbnRlcnByZXRhdGlvbgoKLSBSZXR1cm5zIGB1MzI6Ok1BWGAgd2hlbiBgdXRpbGl6ZWRfYW1vdW50ID09IDBgIChubyBkZWJ0IOKGkiBpbmZpbml0ZWx5CmhlYWx0aHkpLgotIEEgdmFsdWUgYmVsb3cgYDEwXzAwMGAgbWVhbnMgdGhlIHBvc2l0aW9uIGlzIHVuZGVyLWNvbGxhdGVyYWxpemVkIGFuZAplbGlnaWJsZSBmb3IgbGlxdWlkYXRpb24gKGBkZWZhdWx0X2NyZWRpdF9saW5lYCkuCi0gQSB2YWx1ZSBvZiBgMTBfMDAwYCBtZWFucyB0aGUgY29sbGF0ZXJhbCBleGFjdGx5IGNvdmVycyB0aGUgbWluaW11bQpyZXF1aXJlZCBhbW91bnQuCi0gQSB2YWx1ZSBhYm92ZSBgMTBfMDAwYCBtZWFucyB0aGUgcG9zaXRpb24gaXMgb3Zlci1jb2xsYXRlcmFsaXplZApyZWxhdGl2ZSB0byB0aGUgbWluaW11bSByYXRpby4KClNlZSBbYHF1ZXJ5OjpnZXRfaGVhbHRoX2ZhY3RvcmBdIGZvciB0aGUgZnVsbCBmb3JtdWxhIGFuZCBlZGdlLWNhc2UKZG9jdW1lbnRhdGlvbi4AAAAAAAARZ2V0X2hlYWx0aF9mYWN0b3IAAAAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAABAAAABA==",
        "AAAAAAAAADhHZXQgdGhlIGNvbmZpZ3VyZWQgZmxhdCBsYXRlIGZlZSBwZXIgbWlzc2VkIGluc3RhbGxtZW50LgAAABFnZXRfbGF0ZV9mZWVfZmxhdAAAAAAAAAAAAAABAAAACw==",
        "AAAAAAAAAEBSZXR1cm4gdGhlIGN1cnJlbnQgb3JhY2xlIGNpcmN1aXQtYnJlYWtlciBjb25maWd1cmF0aW9uLCBpZiBzZXQuAAAAEWdldF9vcmFjbGVfY29uZmlnAAAAAAAAAAAAAAEAAAPoAAAH0AAAAAxPcmFjbGVDb25maWc=",
        "AAAAAAAAADpTZXQgdGhlIGZsYXQgbGF0ZSBmZWUgcGVyIG1pc3NlZCBpbnN0YWxsbWVudCAoYWRtaW4gb25seSkuAAAAAAARc2V0X2xhdGVfZmVlX2ZsYXQAAAAAAAABAAAAAAAAAANmZWUAAAAACwAAAAA=",
        "AAAAAAAAAXtDb25maWd1cmUgdGhlIG9yYWNsZSBwcmljZS1mZWVkIGNpcmN1aXQgYnJlYWtlciB0aHJlc2hvbGRzLgoKT25jZSBzZXQsIGBzZXR0bGVfZGVmYXVsdF9saXF1aWRhdGlvbmAgcmVxdWlyZXMgYSB2YWxpZCBgb3JhY2xlX3ByaWNlYAp0aGF0IGlzIHdpdGhpbiBgbWF4X2RldmlhdGlvbl9icHNgIG9mIHRoZSBsYXN0IGFjY2VwdGVkIHByaWNlIGFuZCB3aG9zZQpzdG9yZWQgdGltZXN0YW1wIGlzIG5vIG9sZGVyIHRoYW4gYG1heF9hZ2Vfc2Vjb25kc2AuCgojIFZhbGlkYXRpb24KLSBgbWF4X2RldmlhdGlvbl9icHNgIG11c3QgYmUgaW4gYDEuLj0xMF8wMDBgLgotIGBtYXhfYWdlX3NlY29uZHNgIG11c3QgYmUgPiAwLgoKIyBBdXRob3JpemF0aW9uCkFkbWluIG9ubHkuAAAAABFzZXRfb3JhY2xlX2NvbmZpZwAAAAAAAAIAAAAAAAAAEW1heF9kZXZpYXRpb25fYnBzAAAAAAAABAAAAAAAAAAPbWF4X2FnZV9zZWNvbmRzAAAAAAYAAAAA",
        "AAAAAAAAAR5SZW1vdmUgYSB0ZW1wb3JhcnkgZnJlZXplIGJlZm9yZSBpdHMgbmF0dXJhbCBleHBpcnkgKGFkbWluIG9ubHkpLgoKSWYgbm8gZnJlZXplIGlzIGN1cnJlbnRseSBzZXQsIHRoaXMgaXMgYSBuby1vcC4gUmVwYXltZW50cyBoYXZlIG5ldmVyCmJlZW4gYWZmZWN0ZWQgYnkgdGhpcyBmbGFnLCBzbyB1bmZyZWV6aW5nIGVhcmx5IGp1c3QgcmVzdG9yZXMgZHJhdyBhY2Nlc3MuCgojIEVycm9ycwotIFJldmVydHMgd2l0aCBhdXRoIGVycm9yIGlmIGNhbGxlciBpcyBub3QgdGhlIGNvbmZpZ3VyZWQgYWRtaW4uAAAAAAARdW5mcmVlemVfYm9ycm93ZXIAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAA=",
        "AAAAAAAAAFJXaXRoZHJhdyBhY2N1bXVsYXRlZCB0cmVhc3VyeSBiYWxhbmNlIHRvIGNvbmZpZ3VyZWQgdHJlYXN1cnkgYWRkcmVzcyAoYWRtaW4gb25seSkuAAAAAAARd2l0aGRyYXdfdHJlYXN1cnkAAAAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA",
        "AAAAAAAAAS5EZXBvc2l0IGNvbGxhdGVyYWwgdG9rZW5zIGZyb20gdGhlIGJvcnJvd2VyIGludG8gdGhlIGNvbnRyYWN0LgoKIyBBdXRob3JpemF0aW9uClJlcXVpcmVzIGBib3Jyb3dlci5yZXF1aXJlX2F1dGgoKWAuCgojIEVycm9ycwoqIGBDb250cmFjdEVycm9yOjpJbnZhbGlkQW1vdW50YCBpZiBgYW1vdW50IDw9IDBgCiogYENvbnRyYWN0RXJyb3I6Ok1pc3NpbmdMaXF1aWRpdHlUb2tlbmAgaWYgY29sbGF0ZXJhbCB0b2tlbiBub3QgY29uZmlndXJlZAoqIGBDb250cmFjdEVycm9yOjpPdmVyZmxvd2Agb24gYXJpdGhtZXRpYyBvdmVyZmxvdwAAAAAAEmRlcG9zaXRfY29sbGF0ZXJhbAAAAAAAAgAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAR1GcmVlemUgYSBzaW5nbGUgY3JlZGl0IGxpbmUncyBkcmF3cyB3aXRoIGEgc3RydWN0dXJlZCByZWFzb24gKGFkbWluIG9ubHkpLgoKRG9lcyBub3QgbXV0YXRlIFtgQ3JlZGl0U3RhdHVzYF0uIFJlcGF5bWVudHMgcmVtYWluIGF2YWlsYWJsZS4KCiMgRXJyb3JzCi0gW2BDb250cmFjdEVycm9yOjpDcmVkaXRMaW5lTm90Rm91bmRgXSB3aGVuIG5vIGNyZWRpdCBsaW5lIGV4aXN0cy4KCiMgRXZlbnRzCkVtaXRzIGBDcmVkaXRMaW5lRnJlZXplRXZlbnRgIG9uIGAoImNyZWRpdCIsICJsaW5lX2ZyeiIpYC4AAAAAAAASZnJlZXplX2NyZWRpdF9saW5lAAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABnJlYXNvbgAAAAAH0AAAAAxGcmVlemVSZWFzb24AAAAA",
        "AAAAAAAAACdHZXQgdGhlIGN1cnJlbnQgc3RvcmFnZSBzY2hlbWEgdmVyc2lvbi4AAAAAEmdldF9zY2hlbWFfdmVyc2lvbgAAAAAAAAAAAAEAAAPoAAAABA==",
        "AAAAAAAAACpHZXQgdGhlIGdsb2JhbCB0b3RhbCB1dGlsaXplZCBhY2N1bXVsYXRvci4AAAAAABJnZXRfdG90YWxfdXRpbGl6ZWQAAAAAAAAAAAABAAAACw==",
        "AAAAAAAAALFHZXQgdGhlIFZSRiBjb21taXRtZW50IGZvciBhIGJvcnJvd2VyIChpZiBpdCBleGlzdHMpLgoKIyBQYXJhbWV0ZXJzCi0gYGJvcnJvd2VyYDogQWRkcmVzcyBvZiB0aGUgYm9ycm93ZXIuCgojIFJldHVybnMKVGhlIFZSRiBjb21taXRtZW50IGRhdGEsIG9yIGBOb25lYCBpZiBubyBjb21taXRtZW50IGV4aXN0cy4AAAAAAAASZ2V0X3ZyZl9jb21taXRtZW50AAAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAABAAAD6AAAB9AAAAANVnJmQ29tbWl0bWVudAAAAA==",
        "AAAAAAAAAN9DaGVjayB3aGV0aGVyIGEgYm9ycm93ZXIncyBkcmF3cyBhcmUgY3VycmVudGx5IGZyb3plbi4KClJldHVybnMgYHRydWVgIHdoZW4gYSB0ZW1wb3JhcnkgZnJlZXplIGlzIGluIGVmZmVjdCAoYG5vdyA8IGV4cGlyeV90c2ApLgpSZXR1cm5zIGBmYWxzZWAgd2hlbiBubyBmcmVlemUgaGFzIGJlZW4gc2V0LCBvciB3aGVuIHRoZSBmcmVlemUgaGFzIGV4cGlyZWQuCk5vIGF1dGggcmVxdWlyZWQuAAAAABJpc19ib3Jyb3dlcl9mcm96ZW4AAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAB",
        "AAAAAAAAAFBRdWVyeSB3aGV0aGVyIHRoZSBwcm90b2NvbCBpcyBjdXJyZW50bHkgcGF1c2VkLgoKTm8gYXV0aCByZXF1aXJlZCDigJQgcHVyZSByZWFkLgAAABJpc19wcm90b2NvbF9wYXVzZWQAAAAAAAAAAAABAAAAAQ==",
        "AAAAAAAAAl5SZXR1cm4gYSBib3Jyb3dlcidzIGN1cnJlbnQgYm9ycm93IGNhcGFiaWxpdGllcyBiaXRtYXAuCgpSZWFkLW9ubHkgdmlldyB0aGF0IHJlcG9ydHMgd2hldGhlciB0aGUgYm9ycm93ZXIgY2FuIGRyYXcsIHJlcGF5LApvciBzZWxmLXN1c3BlbmQsIGJhc2VkIG9uIHRoZSBjdXJyZW50IHByb3RvY29sIHN0YXRlIGFuZCB0aGUKYm9ycm93ZXIncyBjcmVkaXQgbGluZSBzdGF0dXMuIEFtb3VudC1kZXBlbmRlbnQgY2hlY2tzIChsaW1pdCwKY29sbGF0ZXJhbCByYXRpbywgY29vbGRvd24sIGV4cG9zdXJlIGNhcHMpIGFyZSBub3QgZXZhbHVhdGVkLgoKIyBBdXRoZW50aWNhdGlvbgpObyBhdXRoZW50aWNhdGlvbiByZXF1aXJlZC4gVGhpcyBpcyBhIHB1cmUgcmVhZC1vbmx5IHF1ZXJ5LgoKIyBSZXR1cm5zCkEgW2BCb3Jyb3dDYXBhYmlsaXRpZXNgXSBzdHJ1Y3Qgd2l0aCB0aHJlZSBib29sIGZpZWxkczoKLSBgY2FuX2RyYXdgIOKAlCBkcmF3IHByZS1mbGlnaHQgY2hlY2tzIHBhc3MKLSBgY2FuX3JlcGF5YCDigJQgcmVwYXkgcHJlLWZsaWdodCBjaGVja3MgcGFzcwotIGBjYW5fc2VsZl9zdXNwZW5kYCDigJQgc2VsZi1zdXNwZW5kIHByZS1mbGlnaHQgY2hlY2tzIHBhc3MAAAAAABNib3Jyb3dfY2FwYWJpbGl0aWVzAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAfQAAAAEkJvcnJvd0NhcGFiaWxpdGllcwAA",
        "AAAAAAAAAAAAAAATZGVmYXVsdF9jcmVkaXRfbGluZQAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAA",
        "AAAAAAAAAMtHZXQgdGhlIGN1cnJlbnRseSBjb25maWd1cmVkIHN0cnVjdHVyZWQgbGF0ZS1mZWUgY29uZmlndXJhdGlvbi4KClJldHVybnMgYE5vbmVgIHdoZW4gbm8gc3RydWN0dXJlZCBjb25maWcgaGFzIGJlZW4gc3RvcmVkLCBtZWFuaW5nIHRoZQpjb250cmFjdCB1c2VzIHRoZSBsZWdhY3kgYExhdGVGZWVGbGF0YCAvIGBQZW5hbHR5U3VyY2hhcmdlQnBzYCBrZXlzLgAAAAATZ2V0X2xhdGVfZmVlX2NvbmZpZwAAAAAAAAAAAQAAA+gAAAfQAAAADUxhdGVGZWVDb25maWcAAAA=",
        "AAAAAAAAAAAAAAATZ2V0X21heF9kcmF3X2Ftb3VudAAAAAAAAAAAAQAAA+gAAAAL",
        "AAAAAAAAAYJSZXR1cm5zIGFsbCBnbG9iYWwgcHJvdG9jb2wgY29uZmlndXJhdGlvbiBpbiBhIHNpbmdsZSBjYWxsLgoKVXNlZnVsIGZvciBpbnRlZ3JhdG9ycyB3aG8gbmVlZCB0byBpbnNwZWN0IHRoZSBjdXJyZW50IHN0YXRlIHdpdGhvdXQKbWFraW5nIG11bHRpcGxlIFJQQyBjYWxscy4gQWxsIGZpZWxkcyBhcmUgZGV0ZXJtaW5pc3RpYyByZWFkcyBmcm9tCmluc3RhbmNlIHN0b3JhZ2Ug4oCUIG5vIHNpZGUgZWZmZWN0cy4KCi0gYGxpcXVpZGl0eV90b2tlbmA6IGBOb25lYCB1bnRpbCBgc2V0X2xpcXVpZGl0eV90b2tlbmAgaXMgY2FsbGVkLgotIGBsaXF1aWRpdHlfc291cmNlYDogYE5vbmVgIHVudGlsIGBpbml0YCBpcyBjYWxsZWQgKGRlZmF1bHRzIHRvIGNvbnRyYWN0IGFkZHJlc3MpLgAAAAAAE2dldF9wcm90b2NvbF9jb25maWcAAAAAAAAAAAEAAAfQAAAADlByb3RvY29sQ29uZmlnAAA=",
        "AAAAAAAAAD9HZXQgdGhlIHV0aWxpemF0aW9uIGNhcCBpbiBiYXNpcyBwb2ludHMgZm9yIGEgYm9ycm93ZXIsIGlmIHNldC4AAAAAE2dldF91dGlsaXphdGlvbl9jYXAAAAAAAQAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAQAAA+gAAAAE",
        "AAAAAAAAAGdSZXR1cm4gdHJ1ZSBpZiBgYm9ycm93ZXJgIGlzIGN1cnJlbnRseSBvbiB0aGUgYmxvY2tsaXN0LgpSZWFkLW9ubHk7IG5vIGF1dGggcmVxdWlyZWQ7IG5vIGV2ZW50IGVtaXR0ZWQuAAAAABNpc19ib3Jyb3dlcl9ibG9ja2VkAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAB",
        "AAAAAAAAAt5TZXQgdGhlIHN0cnVjdHVyZWQgbGF0ZS1mZWUgY29uZmlndXJhdGlvbiAoZmxhdCBhbW91bnQgb3IgQVBSLWJhc2VkKS4KClBhc3MgYFNvbWUoTGF0ZUZlZUNvbmZpZzo6RmxhdChGbGF0RmVlQ29uZmlnIHsgYW1vdW50IH0pKWAgdG8gY2hhcmdlIGEKZml4ZWQgdG9rZW4gYW1vdW50IHBlciBvdmVyZHVlIGluc3RhbGxtZW50LiAgUGFzcwpgU29tZShMYXRlRmVlQ29uZmlnOjpBcHJCYXNlZChBcHJGZWVDb25maWcgeyBzdXJjaGFyZ2VfYnBzIH0pKWAgdG8gdXNlCnRoZSBleGlzdGluZyBBUFItc3VyY2hhcmdlIGJlaGF2aW91ci4gIFBhc3MgYE5vbmVgIHRvIHJlbW92ZSB0aGUKc3RydWN0dXJlZCBjb25maWcgYW5kIGZhbGwgYmFjayB0byB0aGUgbGVnYWN5IGBMYXRlRmVlRmxhdGAgLwpgUGVuYWx0eVN1cmNoYXJnZUJwc2AgaW5zdGFuY2Uga2V5cy4KCiMgQXV0aG9yaXphdGlvbgpSZXF1aXJlcyBhZG1pbiBzaWduYXR1cmUgdmlhIFtgcmVxdWlyZV9hZG1pbl9hdXRoYF0uCgojIFZhbGlkYXRpb24KLSBgRmxhdGAgbW9kZTogYGFtb3VudGAgbXVzdCBiZSBgPj0gMGA7IG5lZ2F0aXZlIGFtb3VudHMgcmV2ZXJ0IHdpdGgKW2BDb250cmFjdEVycm9yOjpJbnZhbGlkQW1vdW50YF0uCi0gYEFwckJhc2VkYCBtb2RlOiBgc3VyY2hhcmdlX2Jwc2AgbXVzdCBiZSBgPD0gMTBfMDAwYDsgdmFsdWVzIGFib3ZlCnRoZSBjYXAgcmV2ZXJ0IHdpdGggW2BDb250cmFjdEVycm9yOjpSYXRlVG9vSGlnaGBdLgAAAAAAE3NldF9sYXRlX2ZlZV9jb25maWcAAAAAAQAAAAAAAAAGY29uZmlnAAAAAAPoAAAH0AAAAA1MYXRlRmVlQ29uZmlnAAAAAAAAAA==",
        "AAAAAAAAApNTZXRzIHRoZSBTQUMgKFN0ZWxsYXIgQXNzZXQgQ29udHJhY3QpIG9yIGNvbXBhdGlibGUgdG9rZW4gY29udHJhY3QgdXNlZCBmb3IKcmVzZXJ2ZSBiYWxhbmNlIGNoZWNrcywgZHJhdyB0cmFuc2ZlcnMsIGFuZCByZXBheW1lbnQgdHJhbnNmZXJzLgoKIyBBdXRob3JpemF0aW9uClJlcXVpcmVzIGFkbWluaXN0cmF0aXZlIHByaXZpbGVnZXMuIFRoZSBjb25maWd1cmVkIGFkbWluIG11c3QgYXV0aG9yaXplIHRoaXMKY2FsbCB2aWEgYHJlcXVpcmVfYXV0aCgpYDsgdW5hdXRob3JpemVkIGNhbGxlcnMgYXJlIHJlamVjdGVkIGJlZm9yZSBhbnkKc3RvcmFnZSBtdXRhdGlvbiBvY2N1cnMuCgojIFN0b3JhZ2UKV3JpdGVzIGB0b2tlbl9hZGRyZXNzYCB0byBpbnN0YW5jZSBzdG9yYWdlIHVuZGVyIFtgRGF0YUtleTo6TGlxdWlkaXR5VG9rZW5gXS4KQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIGEgc2Vjb25kIHRpbWUgb3ZlcndyaXRlcyB0aGUgcHJldmlvdXNseSBzdG9yZWQgYWRkcmVzcy4KCiMgRXJyb3JzCi0gUGFuaWNzIHdpdGggW2BDb250cmFjdEVycm9yOjpQYXVzZWRgXSBpZiB0aGUgcHJvdG9jb2wgY2lyY3VpdC1icmVha2VyIGlzIGFjdGl2ZS4KLSBQYW5pY3Mgd2l0aCBhdXRoIGVycm9yIGlmIHRoZSBjYWxsZXIgaXMgbm90IHRoZSBjb25maWd1cmVkIGFkbWluLgAAAAATc2V0X2xpcXVpZGl0eV90b2tlbgAAAAABAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAATc2V0X21heF9kcmF3X2Ftb3VudAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAapFbWVyZ2VuY3kgcGF1c2UgdGhlIHByb3RvY29sIChhZG1pbiBvbmx5KS4KCldoZW4gcGF1c2VkLCBhbGwgbXV0YXRpbmcgZW50cnlwb2ludHMgZXhjZXB0IGByZXBheV9jcmVkaXRgIGFyZSBibG9ja2VkCndpdGggW2BDb250cmFjdEVycm9yOjpQYXVzZWRgXSAoY29kZSAxOCkuIFJlcGF5bWVudHMgYXJlIGFsd2F5cyBhbGxvd2VkCnNvIGJvcnJvd2VycyBjYW4gZGVsZXZlcmFnZSBldmVuIGR1cmluZyBhbiBlbWVyZ2VuY3kuCgojIFBhcmFtZXRlcnMKLSBgcGF1c2VkYDogYHRydWVgIHRvIHBhdXNlLCBgZmFsc2VgIHRvIHVucGF1c2UuCgojIEF1dGhvcml6YXRpb24KQWRtaW4gb25seS4KCiMgRXZlbnRzCkVtaXRzIGAoImNyZWRpdCIsICJwYXVzZWQiKWAgd2l0aCBgdHJ1ZWAgb3IgYCgiY3JlZGl0IiwgInVucGF1c2VkIilgIHdpdGggYGZhbHNlYC4AAAAAABNzZXRfcHJvdG9jb2xfcGF1c2VkAAAAAAEAAAAAAAAABnBhdXNlZAAAAAAAAQAAAAA=",
        "AAAAAAAAAUlTZXQgYSBwZXItYm9ycm93ZXIgdXRpbGl6YXRpb24gY2FwIGluIGJhc2lzIHBvaW50cyAoYWRtaW4gb25seSkuCgpXaGVuIHNldCwgYGRyYXdfY3JlZGl0YCB3aWxsIHJlamVjdCBhbnkgZHJhdyB0aGF0IHdvdWxkIHB1c2gKYHV0aWxpemVkX2Ftb3VudGAgYWJvdmUgYGNyZWRpdF9saW1pdCAqIGNhcF9icHMgLyAxMF8wMDBgLgoKIyBQYXJhbWV0ZXJzCi0gYGJvcnJvd2VyYDogVGhlIGJvcnJvd2VyIHdob3NlIGNhcCB0byBjb25maWd1cmUuCi0gYGNhcF9icHNgOiBDYXAgcmF0aW8gaW4gYmFzaXMgcG9pbnRzICgx4oCTMTBfMDAwKS4gUGFzcyAwIHRvIHJlbW92ZSB0aGUgY2FwLgAAAAAAABNzZXRfdXRpbGl6YXRpb25fY2FwAAAAAAIAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAHY2FwX2JwcwAAAAAEAAAAAA==",
        "AAAAAAAAAAAAAAATc3VzcGVuZF9jcmVkaXRfbGluZQAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAA",
        "AAAAAAAAATZXaXRoZHJhdyBjb2xsYXRlcmFsIHRva2VucyB0byB0aGUgYm9ycm93ZXIuCgojIEF1dGhvcml6YXRpb24KUmVxdWlyZXMgYGJvcnJvd2VyLnJlcXVpcmVfYXV0aCgpYC4KCiMgRXJyb3JzCiogYENvbnRyYWN0RXJyb3I6OkludmFsaWRBbW91bnRgIGlmIGBhbW91bnQgPD0gMGAKKiBgQ29udHJhY3RFcnJvcjo6SW5zdWZmaWNpZW50Q29sbGF0ZXJhbEJhbGFuY2VgIGlmIGluc3VmZmljaWVudCBiYWxhbmNlCiogYENvbnRyYWN0RXJyb3I6OkNvbGxhdGVyYWxSYXRpb0JlbG93TWluaW11bWAgaWYgd2l0aGRyYXdhbCB3b3VsZCB2aW9sYXRlIHJhdGlvAAAAAAATd2l0aGRyYXdfY29sbGF0ZXJhbAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAMBCbG9jayB1cCB0byBgQlVMS19CTE9DS19NQVhgIGJvcnJvd2VycyBpbiBhIHNpbmdsZSBjYWxsLiBBZG1pbiBvbmx5LgoKIyBQYW5pY3MKSWYgYGJvcnJvd2Vycy5sZW4oKSA+IEJVTEtfQkxPQ0tfTUFYYC4KCiMgRXZlbnRzCkVtaXRzIG9uZSBgQm9ycm93ZXJCbG9ja2VkRXZlbnQgeyBibG9ja2VkOiB0cnVlIH1gIHBlciBib3Jyb3dlci4AAAAUYnVsa19ibG9ja19ib3Jyb3dlcnMAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACWJvcnJvd2VycwAAAAAAA+oAAAATAAAAAA==",
        "AAAAAAAAAVBDbGVhciB0aGUgVlJGIGNvbW1pdG1lbnQgZm9yIGEgYm9ycm93ZXIgKGFkbWluIG9ubHkpLgoKVGhpcyBmdW5jdGlvbiByZW1vdmVzIHRoZSBWUkYgY29tbWl0bWVudCwgYWxsb3dpbmcgYSBuZXcgY29tbWl0bWVudCB0byBiZQptYWRlLiBUaGlzIGlzIGludGVuZGVkIGZvciBjYXNlcyB3aGVyZSB0aGUgVlJGIHByb2Nlc3MgbmVlZHMgdG8gYmUgcmVzdGFydGVkLgoKIyBQYXJhbWV0ZXJzCi0gYGJvcnJvd2VyYDogQWRkcmVzcyBvZiB0aGUgYm9ycm93ZXIuCgojIEVycm9ycwotIFJldmVydHMgaWYgcHJvdG9jb2wgaXMgcGF1c2VkLgotIFJldmVydHMgaWYgY2FsbGVyIGlzIG5vdCBhZG1pbi4AAAAUY2xlYXJfdnJmX2NvbW1pdG1lbnQAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAA",
        "AAAAAAAAADdSZXR1cm4gdGhlIGNvbmZpZ3VyZWQgYXVjdGlvbiBjb250cmFjdCBhZGRyZXNzLCBpZiBzZXQuAAAAABRnZXRfYXVjdGlvbl9jb250cmFjdAAAAAAAAAABAAAD6AAAABM=",
        "AAAAAAAAAHdSZXR1cm4gdGhlIGN1cnJlbnQgcHJvdG9jb2wtbGV2ZWwgbWF4IGNsb3NlIGZhY3RvciBpbiBiYXNpcyBwb2ludHMuCgpSZXR1cm5zIGAxMF8wMDBgIGlmIG5ldmVyIGNvbmZpZ3VyZWQgYnkgdGhlIGFkbWluLgAAAAAUZ2V0X2Nsb3NlX2ZhY3Rvcl9icHMAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAUZ2V0X2NvbnRyYWN0X3ZlcnNpb24AAAAAAAAAAQAAA+0AAAADAAAABAAAAAQAAAAE",
        "AAAAAAAAAAAAAAAUZ2V0X2xpcXVpZGl0eV9zb3VyY2UAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAUZ2V0X21heF9yZXBheV9hbW91bnQAAAAAAAAAAQAAA+gAAAAL",
        "AAAAAAAAAJNSZXR1cm4gcHJvb2Ytb2YtcmVzZXJ2ZSBiYWxhbmNlcyBmb3IgdGhlIHByb3RvY29sIHRyZWFzdXJ5LgoKUmVhZC1vbmx5IHZpZXcgZXhwb3NpbmcgYWNjdW11bGF0ZWQgcmVzZXJ2ZXMgZm9yIHRyYW5zcGFyZW5jeQphbmQgaW5kZXhlciBpbnRlZ3JhdGlvbi4AAAAAFGdldF9wcm9vZl9vZl9yZXNlcnZlAAAAAAAAAAEAAAfQAAAADlByb29mT2ZSZXNlcnZlAAA=",
        "AAAAAAAAADRHZXQgY29uZmlndXJlZCBwcm90b2NvbCBmZWUgaW4gYmFzaXMgcG9pbnRzLCBpZiBzZXQuAAAAFGdldF9wcm90b2NvbF9mZWVfYnBzAAAAAAAAAAEAAAPoAAAABA==",
        "AAAAAAAAAJpHZXQgcHJvdG9jb2wtbGV2ZWwgZGFzaGJvYXJkIHRvdGFscyBpbiBvbmUgcmVhZC1vbmx5IGNhbGwuCgpSZWFkcyBhZ2dyZWdhdGUgY291bnRlcnMgb25seTogbm8gYm9ycm93ZXIgcmVjb3JkcyBhcmUgbG9hZGVkIGFuZCBubyBUVEwKZW50cmllcyBhcmUgZXh0ZW5kZWQuAAAAAAAUZ2V0X3Byb3RvY29sX3N1bW1hcnkAAAAAAAAAAQAAB9AAAAAPUHJvdG9jb2xTdW1tYXJ5AA==",
        "AAAAAAAAAS1Db25maWd1cmUgdGhlIGF1Y3Rpb24gY29udHJhY3QgYWRkcmVzcyBmb3IgZGVmYXVsdC1saXF1aWRhdGlvbiBob29rcy4KCldoZW4gc2V0LCB0aGUgY3JlZGl0IGNvbnRyYWN0IHJlY29yZHMgd2hpY2ggYXVjdGlvbiBjb250cmFjdCBpcwphdXRob3JpemVkIHRvIHBhcnRpY2lwYXRlIGluIHRoZSBsaXF1aWRhdGlvbiBzZXR0bGVtZW50IGZsb3cuIFRoaXMKYWRkcmVzcyBpcyBzdG9yZWQgaW4gaW5zdGFuY2Ugc3RvcmFnZSBhbmQgY2FuIGJlIHVwZGF0ZWQgYnkgdGhlIGFkbWluLgoKIyBBdXRob3JpemF0aW9uCkFkbWluIG9ubHkuAAAAAAAAFHNldF9hdWN0aW9uX2NvbnRyYWN0AAAAAQAAAAAAAAAPYXVjdGlvbl9hZGRyZXNzAAAAABMAAAAA",
        "AAAAAAAAAfdTZXQgdGhlIHByb3RvY29sLWxldmVsIG1heCBjbG9zZSBmYWN0b3IgaW4gYmFzaXMgcG9pbnRzIChhZG1pbiBvbmx5KS4KClRoaXMgY2FwcyB0aGUgYGNsb3NlX2ZhY3Rvcl9icHNgIHBhcmFtZXRlciBhY2NlcHRlZCBieQpgc2V0dGxlX2RlZmF1bHRfbGlxdWlkYXRpb25gLiBXaGVuIHNldCB0byBlLmcuIGA1XzAwMGAsIG5vIHNpbmdsZQpzZXR0bGVtZW50IGNhbiByZWNvdmVyIG1vcmUgdGhhbiA1MCUgb2YgdGhlIG91dHN0YW5kaW5nIGRlYnQsIGV2ZW4KaWYgdGhlIGNhbGxlciBzdXBwbGllcyBhIGhpZ2hlciB2YWx1ZS4gRGVmYXVsdHMgdG8gYDEwXzAwMGAgKGZ1bGwKbGlxdWlkYXRpb24pIHdoZW4gbmV2ZXIgY29uZmlndXJlZC4KCiMgVmFsaWRhdGlvbgotIGBjbG9zZV9mYWN0b3JfYnBzYCBtdXN0IGJlIGluIGAxLi49MTBfMDAwYC4KCiMgQXV0aG9yaXphdGlvbgpBZG1pbiBvbmx5LgoKIyBFdmVudHMKRW1pdHMgYSBgY2xzZmN0cmAgZXZlbnQgd2l0aCB0aGUgbmV3IHZhbHVlLgAAAAAUc2V0X2Nsb3NlX2ZhY3Rvcl9icHMAAAABAAAAAAAAABBjbG9zZV9mYWN0b3JfYnBzAAAABAAAAAA=",
        "AAAAAAAAAAAAAAAUc2V0X2xpcXVpZGl0eV9zb3VyY2UAAAABAAAAAAAAAA9yZXNlcnZlX2FkZHJlc3MAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAUc2V0X21heF9yZXBheV9hbW91bnQAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAINTZXQgcHJvdG9jb2wgZmVlIGluIGJhc2lzIHBvaW50cyAoYXBwbGllZCB0byBpbnRlcmVzdCBwb3J0aW9uIG9mIHJlcGF5bWVudHMpLgpBZG1pbiBvbmx5LiBGZWUgaXMgYm91bmRlZCBieSBgTUFYX1BST1RPQ09MX0ZFRV9CUFNgLgAAAAAUc2V0X3Byb3RvY29sX2ZlZV9icHMAAAABAAAAAAAAAANicHMAAAAABAAAAAA=",
        "AAAAAAAAAC1TZXRzIHRoZSBxdW9ydW0gdGhyZXNob2xkIHdlaWdodC4KQWRtaW4gb25seS4AAAAAAAAUc2V0X3F1b3J1bV90aHJlc2hvbGQAAAABAAAAAAAAAAl0aHJlc2hvbGQAAAAAAAAEAAAAAA==",
        "AAAAAAAAADtTZXRzIHRoZSByZXBvcnRpbmcgZnJlc2huZXNzIHdpbmRvdyBpbiBzZWNvbmRzLgpBZG1pbiBvbmx5LgAAAAAUc2V0X3JlcG9ydGluZ193aW5kb3cAAAABAAAAAAAAAA53aW5kb3dfc2Vjb25kcwAAAAAABgAAAAA=",
        "AAAAAAAAA3NTdWJtaXQgTiBvcmFjbGUgcHJpY2VzIGFuZCByZXNvbHZlIGEgcXVvcnVtIGNhbm9uaWNhbCBwcmljZSAoYWRtaW4gb25seSkuCgpSdW5zIHRoZSBxdW9ydW0tb2YtSyBhbGdvcml0aG06CjEuIFNvcnRzIHN1Ym1pdHRlZCBwcmljZXMgYXNjZW5kaW5nLgoyLiBGaW5kcyB0aGUgZmlyc3QgSy13aWRlIHdpbmRvdyB3aG9zZSBzcHJlYWQgaXMgd2l0aGluCmBtYXhfZGV2aWF0aW9uX2Jwc2Agb2YgdGhlIGxvd2VzdCBwcmljZSBpbiB0aGF0IHdpbmRvdy4KMy4gUmV0dXJucyB0aGUgbG93ZXItbWVkaWFuIG9mIHRoYXQgd2luZG93IGFzIHRoZSBjYW5vbmljYWwgcHJpY2UuCjQuIFN0b3JlcyB0aGUgY2Fub25pY2FsIHByaWNlIGFuZCB0aGUgY3VycmVudCBsZWRnZXIgdGltZXN0YW1wLgoKVGhlIHN0b3JlZCBwcmljZSBpcyBzdWJzZXF1ZW50bHkgdXNlZCBieSBgc2V0dGxlX2RlZmF1bHRfbGlxdWlkYXRpb25gCihzdGFsZW5lc3MgaXMgcmUtY2hlY2tlZCB0aGVyZSBhZ2FpbnN0IGBtYXhfYWdlX3NlY29uZHNgKS4KCiMgVmFsaWRhdGlvbgotIE9yYWNsZSBxdW9ydW0gY29uZmlnIG11c3QgYmUgc2V0IHZpYSBgc2V0X29yYWNsZV9xdW9ydW1fY29uZmlnYCBmaXJzdC4KLSAyIOKJpCBgcHJpY2VzLmxlbigpYCDiiaQgYE1BWF9PUkFDTEVfRkVFRFNgICgyMCkuCi0gRXZlcnkgcHJpY2UgbXVzdCBiZSBzdHJpY3RseSBwb3NpdGl2ZS4KLSBBdCBsZWFzdCBgbWluX3F1b3J1bV9rYCBwcmljZXMgbXVzdCBhZ3JlZSB3aXRoaW4gYG1heF9kZXZpYXRpb25fYnBzYC4KCiMgQXV0aG9yaXphdGlvbgpBZG1pbiBvbmx5LgoKIyBFdmVudHMKRW1pdHMgYW4gYG9yY19xcHJjYCBldmVudCB3aXRoIHRoZSByZXNvbHZlZCBwcmljZSwgcXVvcnVtIEssIGFuZCB0aW1lc3RhbXAuAAAAABRzdWJtaXRfb3JhY2xlX3ByaWNlcwAAAAEAAAAAAAAABnByaWNlcwAAAAAD6gAAAAsAAAAA",
        "AAAAAAAAAFlMaWZ0IGEgcGVyLWNyZWRpdC1saW5lIGRyYXcgZnJlZXplIChhZG1pbiBvbmx5KS4KCk5vLW9wIHdoZW4gdGhlIGJvcnJvd2VyIHdhcyBub3QgZnJvemVuLgAAAAAAABR1bmZyZWV6ZV9jcmVkaXRfbGluZQAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAA=",
        "AAAAAAAAA7RUZW1wb3JhcmlseSBmcmVlemUgYSBib3Jyb3dlcidzIGRyYXdzIHVudGlsIHRoZSBnaXZlbiBleHBpcnkgdGltZXN0YW1wIChhZG1pbiBvbmx5KS4KCiMgUGFyYW1ldGVycwotIGBhZG1pbmA6IE11c3QgYmUgdGhlIGN1cnJlbnQgY29udHJhY3QgYWRtaW4gKGNoZWNrZWQgdmlhIGByZXF1aXJlX2FkbWluX2F1dGhgICsgZXhwbGljaXQgYHJlcXVpcmVfYXV0aGApLgotIGBib3Jyb3dlcmA6IFRoZSBhZGRyZXNzIHdob3NlIGRyYXcgY2FwYWJpbGl0eSBzaG91bGQgYmUgZnJvemVuLgotIGBleHBpcnlfdHNgOiBMZWRnZXIgdGltZXN0YW1wIChzZWNvbmRzKSBhdCB3aGljaCB0aGUgZnJlZXplIGF1dG8tZXhwaXJlcy4KTXVzdCBiZSBzdHJpY3RseSBncmVhdGVyIHRoYW4gdGhlIGN1cnJlbnQgbGVkZ2VyIHRpbWVzdGFtcC4KCiMgQmVoYXZpb3VyCi0gU3RvcmVzIHRoZSBleHBpcnkgdGltZXN0YW1wIGluIHBlcnNpc3RlbnQgc3RvcmFnZSB1bmRlciBbYERhdGFLZXk6OkZyb3plbkJvcnJvd2VyYF0uCi0gT25jZSBgZW52LmxlZGdlcigpLnRpbWVzdGFtcCgpID49IGV4cGlyeV90c2AsIHRoZSBmcmVlemUgYXV0by1saWZ0cyDigJQgbm8KYWRtaW4gY2FsbCBuZWVkZWQuCi0gQ2FsbGluZyBhZ2FpbiBmb3IgdGhlIHNhbWUgYm9ycm93ZXIgdXBkYXRlcyB0aGUgZXhwaXJ5IHRvIHRoZSBuZXcgdmFsdWUuCi0gUmVwYXltZW50cyBhcmUgKipuZXZlcioqIGJsb2NrZWQgYnkgYSB0ZW1wb3JhcnkgZnJlZXplLgoKIyBFcnJvcnMKLSBSZXZlcnRzIHdpdGggW2BDb250cmFjdEVycm9yOjpJbnZhbGlkQW1vdW50YF0gaWYgYGV4cGlyeV90cyA8PSBub3dgLgotIFJldmVydHMgd2l0aCBhdXRoIGVycm9yIGlmIGNhbGxlciBpcyBub3QgdGhlIGNvbmZpZ3VyZWQgYWRtaW4uCgojIEV2ZW50cwpFbWl0cyBgQm9ycm93ZXJGcm96ZW5FdmVudGAgb24gdG9waWMgYCgiYnJfZnJlZXplIiwpYC4AAAAVZnJlZXplX2JvcnJvd2VyX3VudGlsAAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAACWV4cGlyeV90cwAAAAAAAAYAAAAA",
        "AAAAAAAAAD5SZXR1cm4gdGhlIGNvbW1pdHRlZCBhdHRlc3RhdGlvbiBiYXRjaCBmb3IgYSBib3Jyb3dlciwgaWYgYW55LgAAAAAAFWdldF9hdHRlc3RhdGlvbl9iYXRjaAAAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAPoAAAH0AAAABBBdHRlc3RhdGlvbkJhdGNo",
        "AAAAAAAAAI5RdWVyeTogcmV0dXJuIHRoZSBjdXJyZW50IGNvbGxhdGVyYWwgdG9rZW4gYWxsb3dsaXN0LgpHZXQgdGhlIGxpc3Qgb2YgYWxsb3dlZCBjb2xsYXRlcmFsIHRva2Vucy4KCiMgUmV0dXJucwpWZWN0b3Igb2YgYWxsb3dlZCB0b2tlbiBhZGRyZXNzZXMuAAAAAAAVZ2V0X2NvbGxhdGVyYWxfdG9rZW5zAAAAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAACdHZXQgdGhlIG51bWJlciBvZiBpbmRleGVkIGNyZWRpdCBsaW5lcy4AAAAAFWdldF9jcmVkaXRfbGluZV9jb3VudAAAAAAAAAAAAAABAAAABA==",
        "AAAAAAAAAEBHZXQgdGhlIGNvbmZpZ3VyZWQgbWluaW11bSBkcmF3IGludGVydmFsIGJldHdlZW4gYm9ycm93ZXIgZHJhd3MuAAAAFWdldF9kcmF3X21pbl9pbnRlcnZhbAAAAAAAAAAAAAABAAAD6AAAAAY=",
        "AAAAAAAAAEpSZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBib3Jyb3dlcidzIGNyZWRpdCBsaW5lIGhhcyBhbiBhY3RpdmUgYWRtaW4gZnJlZXplLgAAAAAAFWlzX2NyZWRpdF9saW5lX2Zyb3plbgAAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAB",
        "AAAAAAAAAAAAAAAVcmVpbnN0YXRlX2NyZWRpdF9saW5lAAAAAAAAAgAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAA10YXJnZXRfc3RhdHVzAAAAAAAH0AAAAAxDcmVkaXRTdGF0dXMAAAAA",
        "AAAAAAAAAGRTZXQgdGhlIG1pbmltdW0gaW50ZXJ2YWwgYmV0d2VlbiBib3Jyb3dlciBkcmF3cy4KUGFzcyBgMGAgdG8gZGlzYWJsZSB0aGUgcGVyLWJvcnJvd2VyIGRyYXcgY29vbGRvd24uAAAAFXNldF9kcmF3X21pbl9pbnRlcnZhbAAAAAAAAAEAAAAAAAAAB3NlY29uZHMAAAAABgAAAAA=",
        "AAAAAAAAALdFbnVtZXJhdGUgY3JlZGl0IGxpbmVzIGluIHN0YWJsZSBpbnNlcnRpb24gb3JkZXIuCgpgc3RhcnRfYWZ0ZXJgIGlzIGFuIGV4Y2x1c2l2ZSBjdXJzb3Igb3ZlciB0aGUgc3RhYmxlIG51bWVyaWMgaWQuClJlc3VsdHMgYXJlIGNhcHBlZCBieSBgTUFYX0VOVU1FUkFUSU9OX0xJTUlUYCBmb3IgcHJlZGljdGFibGUgY29zdC4AAAAAFmVudW1lcmF0ZV9jcmVkaXRfbGluZXMAAAAAAAIAAAAAAAAAC3N0YXJ0X2FmdGVyAAAAA+gAAAAEAAAAAAAAAAVsaW1pdAAAAAAAAAQAAAABAAAD6gAAA+0AAAACAAAABAAAB9AAAAAOQ3JlZGl0TGluZURhdGEAAA==",
        "AAAAAAAAAEtSZXR1cm4gdGhlIHBlci1ib3Jyb3dlciBsaXF1aWRhdGlvbiBncmFjZSBwZXJpb2QgaW4gc2Vjb25kcyBmb3IgYGJvcnJvd2VyYC4AAAAAFmdldF9ib3Jyb3dlcl9saXFfZ3JhY2UAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAG",
        "AAAAAAAAAD5HZXQgdGhlIGNvbmZpZ3VyZWQgZ2xvYmFsIGV4cG9zdXJlIGNhcCwgb3IgYE5vbmVgIGlmIHVuY2FwcGVkLgAAAAAAFmdldF9tYXhfdG90YWxfZXhwb3N1cmUAAAAAAAAAAAABAAAD6AAAAAs=",
        "AAAAAAAAAAAAAAAWZ2V0X3JhdGVfY2hhbmdlX2xpbWl0cwAAAAAAAAAAAAEAAAPoAAAH0AAAABBSYXRlQ2hhbmdlQ29uZmln",
        "AAAAAAAAAAAAAAAWZ2V0X3JlcGF5bWVudF9zY2hlZHVsZQAAAAAAAQAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAQAAA+gAAAfQAAAAEVJlcGF5bWVudFNjaGVkdWxlAAAA",
        "AAAAAAAAAldSZXR1cm4gdGhlIGxpZmVjeWNsZS10cmFuc2l0aW9uIGNhcGFiaWxpdGllcyBiaXRtYXAgZm9yIGBib3Jyb3dlcmAgKHY3KS4KClJlYWQtb25seSBwcmUtZmxpZ2h0IGNoZWNrIGZvciBldmVyeSBzdGF0ZS1jaGFuZ2luZyBsaWZlY3ljbGUKZW50cnlwb2ludCAoYHN1c3BlbmRfY3JlZGl0X2xpbmVgLCBgc2VsZl9zdXNwZW5kX2NyZWRpdF9saW5lYCwKYGNsb3NlX2NyZWRpdF9saW5lYCwgYGRlZmF1bHRfY3JlZGl0X2xpbmVgLCBgcmVpbnN0YXRlX2NyZWRpdF9saW5lYCksCmRlcml2ZWQgZnJvbSB0aGUgY3JlZGl0IGxpbmUncyBjdXJyZW50IHN0YXR1cyBhbmQgdGhlIHByb3RvY29sIHBhdXNlCmZsYWcuIEV2ZXJ5IGZpZWxkIGlzIGBmYWxzZWAgd2hlbiBubyBjcmVkaXQgbGluZSBleGlzdHMgZm9yCmBib3Jyb3dlcmAuCgojIEF1dGhlbnRpY2F0aW9uCk5vIGF1dGhlbnRpY2F0aW9uIHJlcXVpcmVkLiBUaGlzIGlzIGEgcHVyZSByZWFkLW9ubHkgcXVlcnkuCgojIFJldHVybnMKQSBbYExpZmVjeWNsZUNhcGFiaWxpdGllc2BdIGJpdG1hcC4gU2VlIGl0cyBmaWVsZCBkb2NzIGZvciB0aGUgZXhhY3QKcHJlY29uZGl0aW9uIGVhY2ggZmxhZyBtaXJyb3JzLgAAAAAWbGlmZWN5Y2xlX2NhcGFiaWxpdGllcwAAAAAAAQAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAQAAB9AAAAAVTGlmZWN5Y2xlQ2FwYWJpbGl0aWVzAAAA",
        "AAAAAAAAAPhTZXQgb3IgdXBkYXRlIHRoZSBwZXItYm9ycm93ZXIgbGlxdWlkYXRpb24gZ3JhY2UgcGVyaW9kIGluIHNlY29uZHMgKGFkbWluIG9ubHkpLgoKIyBBcmd1bWVudHMKLSBgZW52YDogU29yb2JhbiBlbnZpcm9ubWVudC4KLSBgYm9ycm93ZXJgOiBCb3Jyb3dlciBhZGRyZXNzIHRvIGNvbmZpZ3VyZS4KLSBgZ3JhY2VfcGVyaW9kX3NlY29uZHNgOiBHcmFjZSBwZXJpb2QgZHVyYXRpb24gaW4gc2Vjb25kcy4gUGFzcyBgMGAgdG8gcmVtb3ZlLgAAABZzZXRfYm9ycm93ZXJfbGlxX2dyYWNlAAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAFGdyYWNlX3BlcmlvZF9zZWNvbmRzAAAABgAAAAA=",
        "AAAAAAAAAZJTZXQgdGhlIG1heGltdW0gdG90YWwgdXRpbGl6YXRpb24gYWxsb3dlZCBhY3Jvc3MgYWxsIGNyZWRpdCBsaW5lcyAoYWRtaW4gb25seSkuCgpPbmNlIHNldCwgYGRyYXdfY3JlZGl0YCByZXZlcnRzIHdpdGggW2BDb250cmFjdEVycm9yOjpFeHBvc3VyZUNhcEV4Y2VlZGVkYF0gaWYKYHRvdGFsX3V0aWxpemVkICsgYW1vdW50ID4gbWF4X3RvdGFsX2V4cG9zdXJlYC4KClBhc3MgYDBgIHRvIHJlbW92ZSB0aGUgY2FwIGVudGlyZWx5IChubyBwcm90b2NvbC13aWRlIGxpbWl0KS4KCiMgRXJyb3JzCi0gUmV2ZXJ0cyB3aXRoIFtgQ29udHJhY3RFcnJvcjo6SW52YWxpZEFtb3VudGBdIGlmIGBhbW91bnRgIGlzIG5lZ2F0aXZlLgotIFJldmVydHMgaWYgY2FsbGVyIGlzIG5vdCB0aGUgY29uZmlndXJlZCBhZG1pbi4AAAAAABZzZXRfbWF4X3RvdGFsX2V4cG9zdXJlAAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAWc2V0X3JhdGVfY2hhbmdlX2xpbWl0cwAAAAAAAgAAAAAAAAATbWF4X3JhdGVfY2hhbmdlX2JwcwAAAAAEAAAAAAAAABhyYXRlX2NoYW5nZV9taW5faW50ZXJ2YWwAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAWc2V0X3JlcGF5bWVudF9zY2hlZHVsZQAAAAAABAAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAABFhbW91bnRfcGVyX3BlcmlvZAAAAAAAAAsAAAAAAAAADnBlcmlvZF9zZWNvbmRzAAAAAAAGAAAAAAAAAAxmaXJzdF9kdWVfdHMAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAWdXBkYXRlX3Jpc2tfcGFyYW1ldGVycwAAAAAABAAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAxjcmVkaXRfbGltaXQAAAALAAAAAAAAABFpbnRlcmVzdF9yYXRlX2JwcwAAAAAAAAQAAAAAAAAACnJpc2tfc2NvcmUAAAAAAAQAAAAA",
        "AAAAAAAAADJDbGVhciBhIGJvcnJvd2VyJ3MgYXR0ZXN0YXRpb24gYmF0Y2ggKGFkbWluIG9ubHkpLgAAAAAAF2NsZWFyX2F0dGVzdGF0aW9uX2JhdGNoAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAA=",
        "AAAAAAAAADFHZXQgdGhlIHBlci1ib3Jyb3dlciBpbnRlcmVzdCByYXRlIGZsb29yLCBpZiBzZXQuAAAAAAAAF2dldF9ib3Jyb3dlcl9yYXRlX2Zsb29yAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAPoAAAABA==",
        "AAAAAAAAANNHZXQgdGhlIGNvbmZpZ3VyZWQgZ2xvYmFsIGNyZWRpdCBsaW1pdCBib3VuZHMuCgpSZXR1cm5zIHRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIGFsbG93ZWQgY3JlZGl0IGxpbWl0cywgaWYgY29uZmlndXJlZC4KCiMgUmV0dXJucwpgKG1pbl9jcmVkaXRfbGltaXQsIG1heF9jcmVkaXRfbGltaXQpYCB0dXBsZSwgb3IgYChOb25lLCBOb25lKWAgaWYgbm90IGNvbmZpZ3VyZWQuAAAAABdnZXRfY3JlZGl0X2xpbWl0X2JvdW5kcwAAAAAAAAAAAQAAA+0AAAACAAAD6AAAAAsAAAPoAAAACw==",
        "AAAAAAAAADpCYWNrd2FyZC1jb21wYXRpYmxlIGFsaWFzIGZvciBvbGRlciB0ZXN0cyBhbmQgU0RLIGNhbGxlcnMuAAAAAAAXZ2V0X2NyZWRpdF9saW5lX3N1bW1hcnkAAAAAAQAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAQAAA+gAAAfQAAAADkNyZWRpdExpbmVEYXRhAAA=",
        "AAAAAAAAAHVSZXR1cm5zIHRoZSBzdHJ1Y3R1cmVkIHJlYXNvbiBmb3IgdGhlIGFjdGl2ZSBnbG9iYWwgZHJhdyBmcmVlemUuCgpSZXR1cm5zIGBOb25lYCB3aGVuIGRyYXdzIGFyZSBub3QgY3VycmVudGx5IGZyb3plbi4AAAAAAAAXZ2V0X2RyYXdzX2ZyZWV6ZV9yZWFzb24AAAAAAAAAAAEAAAPoAAAH0AAAAAxGcmVlemVSZWFzb24=",
        "AAAAAAAAAAAAAAAXZ2V0X2dyYWNlX3BlcmlvZF9jb25maWcAAAAAAAAAAAEAAAPoAAAH0AAAABFHcmFjZVBlcmlvZENvbmZpZwAAAA==",
        "AAAAAAAAAAAAAAAXZ2V0X3JhdGVfZm9ybXVsYV9jb25maWcAAAAAAAAAAAEAAAPoAAAH0AAAABFSYXRlRm9ybXVsYUNvbmZpZwAAAA==",
        "AAAAAAAAADtHZXQgdGhlIGNvbmZpZ3VyZWQgcmlzayBhZG1pbiBjb29sZG93biBkdXJhdGlvbiBpbiBzZWNvbmRzLgAAAAAXZ2V0X3Jpc2tfYWRtaW5fY29vbGRvd24AAAAAAAAAAAEAAAAG",
        "AAAAAAAAARpTZXQgYSBwZXItYm9ycm93ZXIgaW50ZXJlc3QgcmF0ZSBmbG9vciAoYWRtaW4gb25seSkuCgpXaGVuIHNldCwgYHVwZGF0ZV9yaXNrX3BhcmFtZXRlcnNgIHdpbGwgZW5zdXJlIHRoZSBlZmZlY3RpdmUgcmF0ZQppcyBhdCBsZWFzdCBgZmxvb3JfYnBzYCBmb3IgdGhpcyBib3Jyb3dlci4KCiMgUGFyYW1ldGVycwotIGBib3Jyb3dlcmA6IEFkZHJlc3Mgb2YgdGhlIGJvcnJvd2VyLgotIGBmbG9vcl9icHNgOiBNaW5pbXVtIHJhdGUgaW4gYmFzaXMgcG9pbnRzLiBQYXNzIGBOb25lYCB0byBjbGVhci4AAAAAABdzZXRfYm9ycm93ZXJfcmF0ZV9mbG9vcgAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAACWZsb29yX2JwcwAAAAAAA+gAAAAEAAAAAA==",
        "AAAAAAAAArFTZXQgZ2xvYmFsIGNyZWRpdCBsaW1pdCBib3VuZHMgKGFkbWluIG9ubHkpLgoKQ29uZmlndXJlcyB0aGUgbWluaW11bSBhbmQgbWF4aW11bSBhbGxvd2VkIGNyZWRpdCBsaW1pdHMgZm9yIGFsbCBjcmVkaXQgbGluZXMuClRoZXNlIGJvdW5kcyBhcmUgZW5mb3JjZWQgd2hlbiBvcGVuaW5nIG5ldyBjcmVkaXQgbGluZXMgb3IgaW5jcmVhc2luZyBleGlzdGluZyBsaW1pdHMuCgojIFBhcmFtZXRlcnMKLSBgbWluYDogTWluaW11bSBhbGxvd2VkIGNyZWRpdCBsaW1pdC4gTXVzdCBiZSA+PSAwLgotIGBtYXhgOiBNYXhpbXVtIGFsbG93ZWQgY3JlZGl0IGxpbWl0LiBNdXN0IGJlID49IG1pbi4KCiMgQXV0aG9yaXphdGlvbgpSZXF1aXJlcyBhZG1pbiBhdXRob3JpemF0aW9uLgoKIyBFcnJvcnMKLSBgQ29udHJhY3RFcnJvcjo6SW52YWxpZEFtb3VudGAgaWYgYG1pbiA8IDBgCi0gYENvbnRyYWN0RXJyb3I6OkxpbWl0T3V0T2ZCb3VuZHNgIGlmIGBtYXggPCBtaW5gCi0gYENvbnRyYWN0RXJyb3I6OlBhdXNlZGAgaWYgcHJvdG9jb2wgaXMgcGF1c2VkCgojIEV4YW1wbGUKYGBgaWdub3JlCmNsaWVudC5zZXRfY3JlZGl0X2xpbWl0X2JvdW5kcygmMV8wMDAsICYxXzAwMF8wMDBfMDAwKTsKLy8gTm93IGFsbCBjcmVkaXQgbGluZXMgbXVzdCBoYXZlIGxpbWl0cyBiZXR3ZWVuIDEsMDAwIGFuZCAxLDAwMCwwMDAsMDAwCmBgYAAAAAAAABdzZXRfY3JlZGl0X2xpbWl0X2JvdW5kcwAAAAACAAAAAAAAAANtaW4AAAAACwAAAAAAAAADbWF4AAAAAAsAAAAA",
        "AAAAAAAAA/dTZXQgdGhlIG9wdGlvbmFsIGdyYWNlIHBlcmlvZCBwb2xpY3kgZm9yIFN1c3BlbmRlZCBjcmVkaXQgbGluZXMgKGFkbWluIG9ubHkpLgoKV2hlbiBjb25maWd1cmVkLCBhIFN1c3BlbmRlZCBsaW5lIGFjY3J1ZXMgaW50ZXJlc3QgYXQgYSByZWR1Y2VkIChvciB6ZXJvKQpyYXRlIGZvciBgZ3JhY2VfcGVyaW9kX3NlY29uZHNgIGFmdGVyIHRoZSBzdXNwZW5zaW9uIHRpbWVzdGFtcC4gQWZ0ZXIgdGhlCndpbmRvdyBleHBpcmVzLCBub3JtYWwgYWNjcnVhbCByZXN1bWVzIGF0IHRoZSBsaW5lJ3MgZnVsbCByYXRlLgoKIyBQYXJhbWV0ZXJzCi0gYGdyYWNlX3BlcmlvZF9zZWNvbmRzYDogRHVyYXRpb24gb2YgdGhlIGdyYWNlIHdpbmRvdy4gUGFzcyBgMGAgdG8gZGlzYWJsZQp0aGUgZ3JhY2UgcGVyaW9kIHdpdGhvdXQgcmVtb3ZpbmcgdGhlIGNvbmZpZyByZWNvcmQuCi0gYHdhaXZlcl9tb2RlYDogW2BHcmFjZVdhaXZlck1vZGU6OkZ1bGxXYWl2ZXJgXSAoemVybyBpbnRlcmVzdCkgb3IKW2BHcmFjZVdhaXZlck1vZGU6OlJlZHVjZWRSYXRlYF0gKHBhcnRpYWwgcmF0ZSkuCi0gYHJlZHVjZWRfcmF0ZV9icHNgOiBSYXRlIGFwcGxpZWQgZHVyaW5nIHRoZSB3aW5kb3cgd2hlbiBgd2FpdmVyX21vZGVgIGlzCmBSZWR1Y2VkUmF0ZWAuIE11c3QgYmUg4omkIDEwIDAwMC4gSWdub3JlZCBmb3IgYEZ1bGxXYWl2ZXJgLgoKIyBFcnJvcnMKLSBSZXZlcnRzIGlmIGNhbGxlciBpcyBub3QgdGhlIGNvbnRyYWN0IGFkbWluLgotIFJldmVydHMgd2l0aCBbYENvbnRyYWN0RXJyb3I6OlJhdGVUb29IaWdoYF0gaWYgYHJlZHVjZWRfcmF0ZV9icHMgPiAxMCAwMDBgLgoKIyBFY29ub21pY3MgYW5kIHJpc2tzClNlZSBbYEdyYWNlUGVyaW9kQ29uZmlnYF0gYW5kIFtgR3JhY2VXYWl2ZXJNb2RlYF0gZm9yIGEgZnVsbCBkaXNjdXNzaW9uIG9mCnRoZSBlY29ub21pYyB0cmFkZS1vZmZzIGFuZCBpbnRlcmFjdGlvbiB3aXRoIGBkZWZhdWx0X2NyZWRpdF9saW5lYCBhbmQKYHJlaW5zdGF0ZV9jcmVkaXRfbGluZWAuAAAAABdzZXRfZ3JhY2VfcGVyaW9kX2NvbmZpZwAAAAADAAAAAAAAABRncmFjZV9wZXJpb2Rfc2Vjb25kcwAAAAYAAAAAAAAAC3dhaXZlcl9tb2RlAAAAB9AAAAAPR3JhY2VXYWl2ZXJNb2RlAAAAAAAAAAAQcmVkdWNlZF9yYXRlX2JwcwAAAAQAAAAA",
        "AAAAAAAAAAAAAAAXc2V0X3JhdGVfZm9ybXVsYV9jb25maWcAAAAABAAAAAAAAAANYmFzZV9yYXRlX2JwcwAAAAAAAAQAAAAAAAAAE3Nsb3BlX2Jwc19wZXJfc2NvcmUAAAAABAAAAAAAAAAMbWluX3JhdGVfYnBzAAAABAAAAAAAAAAMbWF4X3JhdGVfYnBzAAAABAAAAAA=",
        "AAAAAAAAAD1TZXQgdGhlIHJpc2sgYWRtaW4gY29vbGRvd24gZHVyYXRpb24gaW4gc2Vjb25kcyAoYWRtaW4gb25seSkuAAAAAAAAF3NldF9yaXNrX2FkbWluX2Nvb2xkb3duAAAAAAEAAAAAAAAAB3NlY29uZHMAAAAABgAAAAA=",
        "AAAAAAAAALZBZG1pbi1vbmx5IGJhdGNoIGNsb3NlIG9mIG11bHRpcGxlIGNyZWRpdCBsaW5lcy4KUmV2ZXJ0cyBvbiBmaXJzdCBmYWlsdXJlLCBlbnN1cmluZyBhdG9taWNpdHkuCgojIFBhcmFtZXRlcnMKLSBgYm9ycm93ZXJzYDogTGlzdCBvZiBib3Jyb3dlciBhZGRyZXNzZXMgdG8gY2xvc2U7IG1heCBgQkFUQ0hfQ0xPU0VfTUFYYAAAAAAAGGNsb3NlX2NyZWRpdF9saW5lc19iYXRjaAAAAAEAAAAAAAAACWJvcnJvd2VycwAAAAAAA+oAAAATAAAAAA==",
        "AAAAAAAAADhDb21taXQgYW4gYXR0ZXN0YXRpb24gYmF0Y2ggZm9yIGEgYm9ycm93ZXIgKGFkbWluIG9ubHkpLgAAABhjb21taXRfYXR0ZXN0YXRpb25fYmF0Y2gAAAADAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAC21lcmtsZV9yb290AAAAA+4AAAAgAAAAAAAAAAVjb3VudAAAAAAAAAQAAAAA",
        "AAAAAAAAAc9EZXBvc2l0IGEgc3BlY2lmaWMgYWxsb3dsaXN0ZWQgY29sbGF0ZXJhbCB0b2tlbiBmcm9tIHRoZSBib3Jyb3dlci4KClJlcXVpcmVzIGJvcnJvd2VyIGByZXF1aXJlX2F1dGhgLiBSZXZlcnRzIHdpdGggYE1pc3NpbmdMaXF1aWRpdHlUb2tlbmAgaWYKYHRva2VuYCBpcyBub3Qgb24gdGhlIGFsbG93bGlzdC4KRGVwb3NpdCBhIHNwZWNpZmljIGFsbG93ZWQgY29sbGF0ZXJhbCB0b2tlbiBpbnRvIHRoZSBjb250cmFjdC4KCiMgQXV0aG9yaXphdGlvbgpSZXF1aXJlcyBgYm9ycm93ZXIucmVxdWlyZV9hdXRoKClgLgoKIyBFcnJvcnMKKiBgQ29udHJhY3RFcnJvcjo6SW52YWxpZEFtb3VudGAgaWYgYGFtb3VudCA8PSAwYAoqIGBDb250cmFjdEVycm9yOjpNaXNzaW5nTGlxdWlkaXR5VG9rZW5gIGlmIHRva2VuIG5vdCBhbGxvd2VkCiogYENvbnRyYWN0RXJyb3I6Ok92ZXJmbG93YCBvbiBhcml0aG1ldGljIG92ZXJmbG93AAAAABhkZXBvc2l0X2NvbGxhdGVyYWxfdG9rZW4AAAADAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAMlRdWVyeTogcmV0dXJuIGEgYm9ycm93ZXIncyBiYWxhbmNlIGZvciBhIHNwZWNpZmljIGNvbGxhdGVyYWwgdG9rZW4uCkdldCB0aGUgYmFsYW5jZSBvZiBhIHNwZWNpZmljIGNvbGxhdGVyYWwgdG9rZW4gZm9yIGEgYm9ycm93ZXIuCgojIFJldHVybnMKVGhlIGNvbGxhdGVyYWwgYmFsYW5jZSBmb3IgdGhlIHNwZWNpZmllZCB0b2tlbiAoYXMgYGkxMjhgKS4AAAAAAAAYZ2V0X2NvbGxhdGVyYWxfZm9yX3Rva2VuAAAAAgAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAABAAAACw==",
        "AAAAAAAAAD1SZXR1cm4gdGhlIGN1cnJlbnQgbXVsdGktb3JhY2xlIHF1b3J1bSBjb25maWd1cmF0aW9uLCBpZiBzZXQuAAAAAAAAGGdldF9vcmFjbGVfcXVvcnVtX2NvbmZpZwAAAAAAAAABAAAD6AAAB9AAAAAST3JhY2xlUXVvcnVtQ29uZmlnAAA=",
        "AAAAAAAAAAAAAAAYc2VsZl9zdXNwZW5kX2NyZWRpdF9saW5lAAAAAQAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAA==",
        "AAAAAAAAAuFDb25maWd1cmUgdGhlIG11bHRpLW9yYWNsZSBxdW9ydW0gcGFyYW1ldGVycyAoYWRtaW4gb25seSkuCgpPbmNlIHNldCwgY2FsbHMgdG8gYHN1Ym1pdF9vcmFjbGVfcHJpY2VzYCB2YWxpZGF0ZSB0aGF0IGF0IGxlYXN0CmBtaW5fcXVvcnVtX2tgIG9mIHRoZSBzdXBwbGllZCBwcmljZXMgYWdyZWUgd2l0aGluIGBtYXhfZGV2aWF0aW9uX2Jwc2AKb2YgZWFjaCBvdGhlci4gVGhlIHJlc29sdmVkIG1lZGlhbiBwcmljZSBpcyBzdG9yZWQgYW5kIHVzZWQgYnkKYHNldHRsZV9kZWZhdWx0X2xpcXVpZGF0aW9uYCAoc3RhbGVuZXNzLWNoZWNrZWQgYWdhaW5zdApgbWF4X2FnZV9zZWNvbmRzYCkuCgpRdW9ydW0gbW9kZSB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgdGhlIHNpbmdsZS1vcmFjbGUgY2lyY3VpdCBicmVha2VyOgp3aGVuIGJvdGggYXJlIGNvbmZpZ3VyZWQsIGBzZXR0bGVfZGVmYXVsdF9saXF1aWRhdGlvbmAgdXNlcyB0aGUgcXVvcnVtCnByaWNlIGFuZCBpZ25vcmVzIHRoZSBgb3JhY2xlX3ByaWNlYCBwYXJhbWV0ZXIuCgojIFZhbGlkYXRpb24KLSBgbWluX3F1b3J1bV9rYCBtdXN0IGJlIOKJpSAyLgotIGBtYXhfZGV2aWF0aW9uX2Jwc2AgbXVzdCBiZSDiiaQgMTBfMDAwLgotIGBtYXhfYWdlX3NlY29uZHNgIG11c3QgYmUgPiAwLgoKIyBBdXRob3JpemF0aW9uCkFkbWluIG9ubHkuCgojIEV2ZW50cwpFbWl0cyBhbiBgb3JjX3FjZmdgIGV2ZW50IHdpdGggdGhlIG5ldyBjb25maWd1cmF0aW9uLgAAAAAAABhzZXRfb3JhY2xlX3F1b3J1bV9jb25maWcAAAADAAAAAAAAAAxtaW5fcXVvcnVtX2sAAAAEAAAAAAAAABFtYXhfZGV2aWF0aW9uX2JwcwAAAAAAAAQAAAAAAAAAD21heF9hZ2Vfc2Vjb25kcwAAAAAGAAAAAA==",
        "AAAAAAAAAEdWZXJpZnkgYSBNZXJrbGUgaW5jbHVzaW9uIHByb29mIGFnYWluc3QgYSBib3Jyb3dlcidzIGF0dGVzdGF0aW9uIGJhdGNoLgAAAAAYdmVyaWZ5X2F0dGVzdGF0aW9uX3Byb29mAAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAARsZWFmAAAD7gAAACAAAAAAAAAABXByb29mAAAAAAAD6gAAA+4AAAAgAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAZY2xlYXJfcmF0ZV9mb3JtdWxhX2NvbmZpZwAAAAAAAAAAAAAA",
        "AAAAAAAAAOdHZXQgdGhlIGZyZWV6ZSBleHBpcnkgdGltZXN0YW1wIGZvciBhIGJvcnJvd2VyLCBpZiBvbmUgaXMgc2V0LgoKUmV0dXJucyBgU29tZShleHBpcnlfdHMpYCB3aGVuIGEgdGVtcG9yYXJ5IGZyZWV6ZSByZWNvcmQgZXhpc3RzIChldmVuIGlmCmV4cGlyZWQpLiBSZXR1cm5zIGBOb25lYCB3aGVuIG5vIGZyZWV6ZSBoYXMgZXZlciBiZWVuIHNldCBmb3IgdGhpcyBib3Jyb3dlci4KTm8gYXV0aCByZXF1aXJlZC4AAAAAGWdldF9ib3Jyb3dlcl9mcm96ZW5fdW50aWwAAAAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAABAAAD6AAAAAY=",
        "AAAAAAAAADNHZXQgdGhlIHBlci1ib3Jyb3dlciBpbnRlcmVzdCByYXRlIGNlaWxpbmcsIGlmIHNldC4AAAAAGWdldF9ib3Jyb3dlcl9yYXRlX2NlaWxpbmcAAAAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAABAAAD6AAAAAQ=",
        "AAAAAAAAADJHZXQgdGhlIGNvbmZpZ3VyZWQgY3JpdGljYWwgYWRtaW4tYWN0aW9uIGNvb2xkb3duLgAAAAAAGWdldF9ib3Jyb3dfYWRtaW5fY29vbGRvd24AAAAAAAAAAAAAAQAAA+gAAAAG",
        "AAAAAAAAADVHZXQgdGhlIGNvbmZpZ3VyZWQgcGVuYWx0eSBzdXJjaGFyZ2UgaW4gYmFzaXMgcG9pbnRzLgAAAAAAABlnZXRfcGVuYWx0eV9zdXJjaGFyZ2VfYnBzAAAAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAPNHZXQgdGhlIHN0cnVjdHVyZWQgcGF1c2UgcmVhc29uLCBpZiBvbmUgd2FzIHJlY29yZGVkIGR1cmluZyB0aGUgbGFzdCBwYXVzZS4KClJldHVybnMgYE5vbmVgIGJlZm9yZSBhbnkgcGF1c2Ugb3Igd2hlbiB0aGUgYWRtaW4gdXNlZCB0aGUgcmVhc29uLWxlc3MKYHNldF9wcm90b2NvbF9wYXVzZWQoYm9vbClgLiBUaGUgcmVhc29uIGlzIGNsZWFyZWQgb24gdW5wYXVzZS4KCk5vIGF1dGggcmVxdWlyZWQg4oCUIHB1cmUgcmVhZC4AAAAAGWdldF9wcm90b2NvbF9wYXVzZV9yZWFzb24AAAAAAAAAAAAAAQAAA+gAAAfQAAAAC1BhdXNlUmVhc29uAA==",
        "AAAAAAAAAERHZXQgcHJvdG9jb2wtbGV2ZWwgZGFzaGJvYXJkIHRvdGFscyByZXF1ZXN0ZWQgZm9yIEdyYW50Rm94IGNhbXBhaWduLgAAABlnZXRfcHJvdG9jb2xfc3VtbWFyeV92aWV3AAAAAAAAAAAAAAEAAAfQAAAAE1Byb3RvY29sU3VtbWFyeVZpZXcA",
        "AAAAAAAAARRTZXQgYSBwZXItYm9ycm93ZXIgaW50ZXJlc3QgcmF0ZSBjZWlsaW5nIChhZG1pbiBvbmx5KS4KCldoZW4gc2V0LCBgdXBkYXRlX3Jpc2tfcGFyYW1ldGVyc2Agd2lsbCBjYXAgdGhlIGVmZmVjdGl2ZSByYXRlCmF0IGBjZWlsaW5nX2Jwc2AgZm9yIHRoaXMgYm9ycm93ZXIuCgojIFBhcmFtZXRlcnMKLSBgYm9ycm93ZXJgOiBBZGRyZXNzIG9mIHRoZSBib3Jyb3dlci4KLSBgY2VpbGluZ19icHNgOiBNYXhpbXVtIHJhdGUgaW4gYmFzaXMgcG9pbnRzLiBQYXNzIGBOb25lYCB0byBjbGVhci4AAAAZc2V0X2JvcnJvd2VyX3JhdGVfY2VpbGluZwAAAAAAAAIAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAALY2VpbGluZ19icHMAAAAD6AAAAAQAAAAA",
        "AAAAAAAAAH5TZXQgdGhlIG1pbmltdW0gaW50ZXJ2YWwgYmV0d2VlbiBjcml0aWNhbCBhZG1pbiBhY3Rpb25zIGZvciBvbmUgYm9ycm93ZXIuClBhc3MgYDBgIHRvIGRpc2FibGUgdGhlIHBlci1ib3Jyb3dlciBhZG1pbiBjb29sZG93bi4AAAAAABlzZXRfYm9ycm93X2FkbWluX2Nvb2xkb3duAAAAAAAAAQAAAAAAAAAHc2Vjb25kcwAAAAAGAAAAAA==",
        "AAAAAAAAAExTZXQgdGhlIHBlbmFsdHkgc3VyY2hhcmdlIGluIGJhc2lzIHBvaW50cyBmb3IgZGVsaW5xdWVudCBsaW5lcyAoYWRtaW4gb25seSkuAAAAGXNldF9wZW5hbHR5X3N1cmNoYXJnZV9icHMAAAAAAAABAAAAAAAAAANicHMAAAAABAAAAAA=",
        "AAAAAAAAAgBXaXRoZHJhdyBhIHNwZWNpZmljIGFsbG93bGlzdGVkIGNvbGxhdGVyYWwgdG9rZW4gdG8gdGhlIGJvcnJvd2VyLgoKUmVxdWlyZXMgYm9ycm93ZXIgYHJlcXVpcmVfYXV0aGAuIFJldmVydHMgd2l0aCBgSW5zdWZmaWNpZW50Q29sbGF0ZXJhbEJhbGFuY2VgCmlmIHRoZSBib3Jyb3dlcidzIGJhbGFuY2UgZm9yIGB0b2tlbmAgaXMgYmVsb3cgYGFtb3VudGAuCldpdGhkcmF3IGEgc3BlY2lmaWMgYWxsb3dlZCBjb2xsYXRlcmFsIHRva2VuIHRvIHRoZSBib3Jyb3dlci4KCiMgQXV0aG9yaXphdGlvbgpSZXF1aXJlcyBgYm9ycm93ZXIucmVxdWlyZV9hdXRoKClgLgoKIyBFcnJvcnMKKiBgQ29udHJhY3RFcnJvcjo6SW52YWxpZEFtb3VudGAgaWYgYGFtb3VudCA8PSAwYAoqIGBDb250cmFjdEVycm9yOjpNaXNzaW5nTGlxdWlkaXR5VG9rZW5gIGlmIHRva2VuIG5vdCBhbGxvd2VkCiogYENvbnRyYWN0RXJyb3I6Okluc3VmZmljaWVudENvbGxhdGVyYWxCYWxhbmNlYCBpZiBpbnN1ZmZpY2llbnQgYmFsYW5jZQAAABl3aXRoZHJhd19jb2xsYXRlcmFsX3Rva2VuAAAAAAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAADpHZXQgdGhlIGNvbmZpZ3VyZWQgYWNjcnVhbC1jcml0aWNhbCBhZG1pbi1hY3Rpb24gY29vbGRvd24uAAAAAAAaZ2V0X2FjY3J1YWxfYWRtaW5fY29vbGRvd24AAAAAAAAAAAABAAAD6AAAAAY=",
        "AAAAAAAAA59SZXR1cm4gYSBwYWdpbmF0ZWQgdmlldyBvZiBjcmVkaXQgbGluZXMgZm9yIG9mZi1jaGFpbiByZXBvcnRpbmcuCgpVc2VzIGN1cnNvci1iYXNlZCBwYWdpbmF0aW9uIHdoZXJlIHRoZSBjdXJzb3IgaXMgdGhlIHN0YWJsZSBudW1lcmljIElECmFzc2lnbmVkIHRvIGVhY2ggYm9ycm93ZXIuIFRoaXMgYWxsb3dzIGVmZmljaWVudCwgc3RhdGVsZXNzIG5hdmlnYXRpb24KdGhyb3VnaCBsYXJnZSBzZXRzIG9mIGNyZWRpdCBsaW5lcyB3aXRob3V0IG9mZnNldC1iYXNlZCBsaW1pdGF0aW9ucy4KCiMgUGFyYW1ldGVycwoKLSBgY3Vyc29yYDogT3B0aW9uYWwgc3RhcnRpbmcgY3Vyc29yIChudW1lcmljIElEKS4gUGFzcyBgTm9uZWAgZm9yIHRoZSBmaXJzdCBwYWdlLgotIGBsaW1pdGA6IE1heGltdW0gbnVtYmVyIG9mIGNyZWRpdCBsaW5lcyB0byByZXR1cm4uIE11c3QgYmUgPD0gMTAwLgoKIyBSZXR1cm5zCgpBIFtgQ3JlZGl0TGluZXNQYWdlYF0gY29udGFpbmluZzoKLSBgY3JlZGl0X2xpbmVzYDogVmVjdG9yIG9mIGNyZWRpdCBsaW5lIGRhdGEgZm9yIHRoaXMgcGFnZS4KLSBgbmV4dF9jdXJzb3JgOiBDdXJzb3IgZm9yIHRoZSBuZXh0IHBhZ2UsIG9yIGBOb25lYCBpZiB0aGlzIGlzIHRoZSBsYXN0IHBhZ2UuCgojIEF1dGhlbnRpY2F0aW9uCgpObyBhdXRoZW50aWNhdGlvbiByZXF1aXJlZC4gVGhpcyBpcyBhIHB1cmUgcmVhZC1vbmx5IHF1ZXJ5LgoKIyBFeGFtcGxlCgpgYGB0ZXh0Ci8vIEZpcnN0IHBhZ2UKbGV0IHBhZ2UxID0gY2xpZW50LmdldF9jcmVkaXRfbGluZXNfcGFnaW5hdGVkKE5vbmUsIDEwKTsKCi8vIFNlY29uZCBwYWdlCmlmIGxldCBTb21lKGN1cnNvcikgPSBwYWdlMS5uZXh0X2N1cnNvciB7CmxldCBwYWdlMiA9IGNsaWVudC5nZXRfY3JlZGl0X2xpbmVzX3BhZ2luYXRlZChTb21lKGN1cnNvciksIDEwKTsKfQpgYGAAAAAAGmdldF9jcmVkaXRfbGluZXNfcGFnaW5hdGVkAAAAAAACAAAAAAAAAAZjdXJzb3IAAAAAA+gAAAAEAAAAAAAAAAVsaW1pdAAAAAAAAAQAAAABAAAH0AAAAA9DcmVkaXRMaW5lc1BhZ2UA",
        "AAAAAAAAAHtHZXQgY29uZmlndXJlZCB0cmVhc3VyeSBmZWUgc2hhcmUgaW4gYmFzaXMgcG9pbnRzLgoKUmV0dXJucyBgTm9uZWAgd2hlbiB1bnNldDsgY2FsbGVycyBzaG91bGQgdHJlYXQgdGhhdCBhcyAxMDAgJSB0cmVhc3VyeS4AAAAAGmdldF90cmVhc3VyeV9mZWVfc2hhcmVfYnBzAAAAAAAAAAAAAQAAA+gAAAAE",
        "AAAAAAAABABSZWxlYXNlIGEgcG9ydGlvbiBvZiBjb2xsYXRlcmFsIHRvIHRoZSBib3Jyb3dlciB3aGlsZSB0aGUgY3JlZGl0IGxpbmUKc3RheXMgYWJvdmUgdGhlIGNvbmZpZ3VyZWQgaGVhbHRoLWZhY3RvciB0aHJlc2hvbGQuCgojIFdoYXQKClRyYW5zZmVycyBleGFjdGx5IGBhbW91bnRgIGNvbGxhdGVyYWwgdG9rZW5zIGZyb20gdGhlIGNvbnRyYWN0IGJhY2sgdG8KYGJvcnJvd2VyYCwgc3ViamVjdCB0byB0d28gaW52YXJpYW50czoKCjEuICoqQmFsYW5jZSBpbnZhcmlhbnQqKiDigJQgYGFtb3VudGAgbXVzdCBub3QgZXhjZWVkIHRoZSBib3Jyb3dlcidzCmN1cnJlbnQgY29sbGF0ZXJhbCBiYWxhbmNlLgoyLiAqKkhlYWx0aC1mYWN0b3IgaW52YXJpYW50Kiog4oCUIGFmdGVyIHRoZSByZWxlYXNlLApgcmVtYWluaW5nX2NvbGxhdGVyYWwgPj0gdXRpbGl6ZWRfYW1vdW50ICogbWluX2NvbGxhdGVyYWxfcmF0aW9fYnBzIC8gMTBfMDAwYC4KV2hlbiBgdXRpbGl6ZWRfYW1vdW50ID09IDBgIHRoZSByYXRpbyBpcyBub3QgY2hlY2tlZC4KCiMgQXV0aG9yaXphdGlvbgoKYGJvcnJvd2VyLnJlcXVpcmVfYXV0aCgpYCDigJQgb25seSB0aGUgYm9ycm93ZXIgbWF5IHJlbGVhc2UgdGhlaXIgb3duCmNvbGxhdGVyYWwuCgojIFBhcmFtZXRlcnMKCi0gYGJvcnJvd2VyYCDigJQgYWRkcmVzcyB3aG9zZSBjb2xsYXRlcmFsIGJhbGFuY2UgaXMgcmVkdWNlZDsgbXVzdAphdXRob3JpemUgdGhpcyBjYWxsLgotIGBhbW91bnRgIOKAlCB0b2tlbiB1bml0cyB0byByZWxlYXNlOyBtdXN0IGJlIHN0cmljdGx5IHBvc2l0aXZlLgoKIyBFcnJvcnMKCnwgRXJyb3IgfCBDb25kaXRpb24gfAp8LS0tfC0tLXwKfCBbYENvbnRyYWN0RXJyb3I6OkludmFsaWRBbW91bnRgXSAoNSkgfCBgYW1vdW50IDw9IDBgIHwKfCBbYENvbnRyYWN0RXJyb3I6Okluc3VmZmljaWVudENvbGxhdGVyYWxCYWxhbmNlYF0gKDM5KSB8IGBhbW91bnQgPiBjdXJyZW50X2JhbGFuY2VgIHwKfCBbYENvbnRyYWN0RXJyb3I6OkNvbGxhdGVyYWxSYXRpb0JlbG93TWluAAAAGnBhcnRpYWxfcmVsZWFzZV9jb2xsYXRlcmFsAAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAWxBcHBseSBhdWN0aW9uIGxpcXVpZGF0aW9uIHByb2NlZWRzIHRvIGEgZGVmYXVsdGVkIGNyZWRpdCBsaW5lIChhZG1pbiBvbmx5KS4KClRoaXMgaXMgYWNjb3VudGluZy1vbmx5OiBubyB0b2tlbiB0cmFuc2ZlciBvY2N1cnMgaGVyZS4gT2ZmLWNoYWluCm9yY2hlc3RyYXRpb24gbXVzdCBlbnN1cmUgYXVjdGlvbiBwcm9jZWVkcyBhcmUgaW4gcHJvdG9jb2wgY3VzdG9keQpiZWZvcmUgaW52b2tpbmcgdGhpcyBmdW5jdGlvbi4KCiMgUmVlbnRyYW5jeQpQcm90ZWN0ZWQgYnkgdGhlIGNvbnRyYWN0LXdpZGUgcmVlbnRyYW5jeSBndWFyZCB0byBwcmV2ZW50IGNyb3NzLWNvbnRyYWN0CmNhbGxiYWNrIGF0dGFja3MgZHVyaW5nIHNldHRsZW1lbnQuAAAAGnNldHRsZV9kZWZhdWx0X2xpcXVpZGF0aW9uAAAAAAAFAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAEHJlY292ZXJlZF9hbW91bnQAAAALAAAAAAAAAA1zZXR0bGVtZW50X2lkAAAAAAAAEQAAAAAAAAAQY2xvc2VfZmFjdG9yX2JwcwAAAAQAAAAAAAAADG9yYWNsZV9wcmljZQAAA+gAAAALAAAAAA==",
        "AAAAAAAAAI5TZXQgdGhlIG1pbmltdW0gaW50ZXJ2YWwgYmV0d2VlbiBhY2NydWFsLWNyaXRpY2FsIGFkbWluIGFjdGlvbnMgZm9yIG9uZSBib3Jyb3dlci4KUGFzcyBgMGAgdG8gZGlzYWJsZSB0aGUgcGVyLWJvcnJvd2VyIGFjY3J1YWwgYWRtaW4gY29vbGRvd24uAAAAAAAac2V0X2FjY3J1YWxfYWRtaW5fY29vbGRvd24AAAAAAAEAAAAAAAAAB3NlY29uZHMAAAAABgAAAAA=",
        "AAAAAAAAAwhTZXQgdGhlIHJpc2sgd2VpZ2h0IGZvciBhIGNvbGxhdGVyYWwgYXNzZXQsIGluIGJhc2lzIHBvaW50cyAoYWRtaW4gb25seSkuCgpSaXNrIHdlaWdodCBzY2FsZXMgaG93IG11Y2ggYSB1bml0IG9mIHRoaXMgYXNzZXQgY291bnRzIHRvd2FyZCB0aGUKY29sbGF0ZXJhbCByYXRpbyBjaGVjay4gMTBfMDAwIGJwcyAoMTAwJSkgbWVhbnMgZnVsbCB2YWx1ZTsgbG93ZXIKdmFsdWVzIGRpc2NvdW50IHRoZSBhc3NldC4KCiMgRXJyb3JzCi0gUmV2ZXJ0cyB3aXRoIFtgQ29udHJhY3RFcnJvcjo6SW52YWxpZFJpc2tXZWlnaHRgXSBpZiBgd2VpZ2h0X2JwcyA+IDEwXzAwMGAuCi0gUmV2ZXJ0cyB3aXRoIFtgQ29udHJhY3RFcnJvcjo6QWRtaW5Db2xsYXRlcmFsQ29vbGRvd25BY3RpdmVgXSB3aGVuIHRoZQpjb25maWd1cmVkIGFkbWluIGNvbGxhdGVyYWwgY29vbC1vZmYgaGFzIG5vdCBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0CmNyaXRpY2FsIGNvbGxhdGVyYWwgYWRtaW4gYWN0aW9uLgotIFJldmVydHMgaWYgY2FsbGVyIGlzIG5vdCB0aGUgY29uZmlndXJlZCBhZG1pbi4KU2V0IHRoZSByaXNrIHdlaWdodCBmb3IgYSBjb2xsYXRlcmFsIGFzc2V0IChhZG1pbiBvbmx5KS4KCiMgQXJndW1lbnRzCiogYGFzc2V0YCAtIFRoZSBjb2xsYXRlcmFsIGFzc2V0IGFkZHJlc3MKKiBgd2VpZ2h0X2Jwc2AgLSBSaXNrIHdlaWdodCBpbiBiYXNpcyBwb2ludHMKCiMgRXJyb3JzCiogUGFuaWNzIGlmIGNhbGxlciBpcyBub3QgYWRtaW4gKGBDb250cmFjdEVycm9yOjpVbmF1dGhvcml6ZWRgKQAAABpzZXRfY29sbGF0ZXJhbF9yaXNrX3dlaWdodAAAAAAAAgAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAp3ZWlnaHRfYnBzAAAAAAAEAAAAAA==",
        "AAAAAAAAASFTZXQgdGhlIHRyZWFzdXJ5IHNoYXJlIG9mIHNraW1tZWQgcHJvdG9jb2wgZmVlcyBpbiBiYXNpcyBwb2ludHMgKGFkbWluIG9ubHkpLgoKYHRyZWFzdXJ5X3NoYXJlX2Jwc2AgbXVzdCBiZSBpbiBgMC4uPTEwXzAwMGAuIFRoZSBib3VudHkgcG9vbCByZWNlaXZlcyB0aGUKcmVtYWluZGVyIG9mIGVhY2ggZmVlIGFmdGVyIHRoZSB0cmVhc3VyeSBwb3J0aW9uIGlzIGZsb29yZWQuIFdoZW4gdW5zZXQsCnRoZSBkZWZhdWx0IGlzIGAxMF8wMDBgICgxMDAgJSB0cmVhc3VyeSwgYmFja3dhcmQgY29tcGF0aWJsZSkuAAAAAAAAGnNldF90cmVhc3VyeV9mZWVfc2hhcmVfYnBzAAAAAAABAAAAAAAAABJ0cmVhc3VyeV9zaGFyZV9icHMAAAAAAAQAAAAA",
        "AAAAAAAAAEBRdWVyeSB0aGUgY29uZmlndXJlZCBhZG1pbiBjb2xsYXRlcmFsIGNvb2wtb2ZmIGludGVydmFsLCBpZiBzZXQuAAAAG2dldF9jb2xfYWRtaW5fY29vbGRvd25fc2VjcwAAAAAAAAAAAQAAA+gAAAAG",
        "AAAAAAAAAHlTZXQgdGhlIG1pbmltdW0gaW50ZXJ2YWwgYmV0d2VlbiBjcml0aWNhbCBjb2xsYXRlcmFsIGFkbWluIGFjdGlvbnMgKGFkbWluIG9ubHkpLgoKUGFzcyBgMGAgdG8gZGlzYWJsZSB0aGUgY29vbC1vZmYgZ3VhcmQuAAAAAAAAG3NldF9jb2xfYWRtaW5fY29vbGRvd25fc2VjcwAAAAABAAAAAAAAAAdzZWNvbmRzAAAAAAYAAAAA",
        "AAAAAAAAAEhRdWVyeSB0aGUgbGVkZ2VyIHRpbWVzdGFtcCBvZiB0aGUgbGFzdCBjcml0aWNhbCBjb2xsYXRlcmFsIGFkbWluIGFjdGlvbi4AAAAcZ2V0X2xhc3RfY29sX2FkbWluX2FjdGlvbl90cwAAAAAAAAABAAAD6AAAAAY=",
        "AAAAAAAAAD5RdWVyeSB0aGUgY29uZmlndXJlZCBtaW5pbXVtIGNvbGxhdGVyYWwgcmF0aW8gaW4gYmFzaXMgcG9pbnRzLgAAAAAAHGdldF9taW5fY29sbGF0ZXJhbF9yYXRpb19icHMAAAAAAAAAAQAAA+gAAAAE",
        "AAAAAAAAAkxTZXQgdGhlIHByb3RvY29sLXdpZGUgbWluaW11bSBjb2xsYXRlcmFsIHJhdGlvIGluIGJhc2lzIHBvaW50cyAoYWRtaW4gb25seSkuCgpEaWFsIGRvd24gdG8gYDBgIHRvIGRpc2FibGUgdGhlIHJhdGlvIGNoZWNrIG9uIGRyYXdzIGFuZCB3aXRoZHJhd2Fscy4KCiMgRXJyb3JzCi0gUmV2ZXJ0cyB3aXRoIFtgQ29udHJhY3RFcnJvcjo6QWRtaW5Db2xsYXRlcmFsQ29vbGRvd25BY3RpdmVgXSB3aGVuIHRoZQpjb25maWd1cmVkIGFkbWluIGNvbGxhdGVyYWwgY29vbC1vZmYgaGFzIG5vdCBlbGFwc2VkLgpTZXQgdGhlIG1pbmltdW0gY29sbGF0ZXJhbCByYXRpbyByZXF1aXJlZCBmb3IgYm9ycm93aW5nIChhZG1pbiBvbmx5KS4KCiMgQXJndW1lbnRzCiogYHJhdGlvX2Jwc2AgLSBUaGUgbWluaW11bSBjb2xsYXRlcmFsIHJhdGlvIGluIGJhc2lzIHBvaW50cyAoZS5nLiwgMTUwMDAgPSAxNTAlKQoKIyBFcnJvcnMKKiBQYW5pY3MgaWYgY2FsbGVyIGlzIG5vdCBhZG1pbiAoYENvbnRyYWN0RXJyb3I6OlVuYXV0aG9yaXplZGApCiogUGFuaWNzIGlmIHByb3RvY29sIGlzIHBhdXNlZCAoYENvbnRyYWN0RXJyb3I6OlByb3RvY29sUGF1c2VkYCkAAAAcc2V0X21pbl9jb2xsYXRlcmFsX3JhdGlvX2JwcwAAAAEAAAAAAAAACXJhdGlvX2JwcwAAAAAAAAQAAAAA",
        "AAAAAAAAAEJSZXR1cm5zIHRoZSBzdHJ1Y3R1cmVkIGZyZWV6ZSByZWFzb24gZm9yIGEgY3JlZGl0IGxpbmUsIGlmIGZyb3plbi4AAAAAAB1nZXRfY3JlZGl0X2xpbmVfZnJlZXplX3JlYXNvbgAAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAPoAAAH0AAAAAxGcmVlemVSZWFzb24=",
        "AAAAAAAAAiFBZG1pbjogYWRkIGEgdG9rZW4gdG8gdGhlIGNvbGxhdGVyYWwgYWxsb3dsaXN0LgoKVGhlIHRva2VuIG11c3QgYmUgYSB2YWxpZCBTQUMtY29tcGF0aWJsZSBjb250cmFjdCBhZGRyZXNzLiBPbmNlIGxpc3RlZApib3Jyb3dlcnMgY2FuIGNhbGwgW2BkZXBvc2l0X2NvbGxhdGVyYWxfdG9rZW5gXSAvIFtgd2l0aGRyYXdfY29sbGF0ZXJhbF90b2tlbmBdCnVzaW5nIHRoaXMgdG9rZW4uCgojIEVycm9ycwotIFJldmVydHMgd2l0aCBbYENvbnRyYWN0RXJyb3I6OkFkbWluQ29sbGF0ZXJhbENvb2xkb3duQWN0aXZlYF0gd2hlbiB0aGUKY29uZmlndXJlZCBhZG1pbiBjb2xsYXRlcmFsIGNvb2wtb2ZmIGhhcyBub3QgZWxhcHNlZC4KU2V0IHRoZSBsaXN0IG9mIGFsbG93ZWQgY29sbGF0ZXJhbCB0b2tlbnMgKGFkbWluIG9ubHkpLgoKIyBBcmd1bWVudHMKKiBgdG9rZW5zYCAtIFZlY3RvciBvZiB0b2tlbiBhZGRyZXNzZXMgdG8gYWxsb3cKCiMgRXJyb3JzCiogUGFuaWNzIGlmIGNhbGxlciBpcyBub3QgYWRtaW4gKGBDb250cmFjdEVycm9yOjpVbmF1dGhvcml6ZWRgKQAAAAAAAB5zZXRfY29sbGF0ZXJhbF90b2tlbl9hbGxvd2xpc3QAAAAAAAEAAAAAAAAABnRva2VucwAAAAAD6gAAABMAAAAA",
        "AAAAAAAAAeZFbWVyZ2VuY3kgcGF1c2UgdGhlIHByb3RvY29sIHdpdGggYSBzdHJ1Y3R1cmVkIHJlYXNvbiAoYWRtaW4gb25seSkuCgpTYW1lIGFzIGBzZXRfcHJvdG9jb2xfcGF1c2VkYCBidXQgcmVjb3JkcyBhIGh1bWFuLXJlYWRhYmxlIHJlYXNvbiBmb3IKZ292ZXJuYW5jZSB0cmFuc3BhcmVuY3kgYW5kIG9mZi1jaGFpbiBtb25pdG9yaW5nLiBUaGUgcmVhc29uIGlzIHN0b3JlZAphbG9uZ3NpZGUgdGhlIHBhdXNlIGZsYWcgYW5kIGNsZWFyZWQgb24gdW5wYXVzZS4KCiMgUGFyYW1ldGVycwotIGBwYXVzZWRgOiBgdHJ1ZWAgdG8gcGF1c2UsIGBmYWxzZWAgdG8gdW5wYXVzZS4KLSBgcmVhc29uYDogQSBodW1hbi1yZWFkYWJsZSByZWFzb24gc3ltYm9sIChlLmcuLCAib3JhY2xlLW91dGFnZSIpLgoKIyBBdXRob3JpemF0aW9uCkFkbWluIG9ubHkuCgojIEV2ZW50cwpFbWl0cyBgKCJjcmVkaXQiLCAicGF1c2VkIilgIG9yIGAoImNyZWRpdCIsICJ1bnBhdXNlZCIpYC4AAAAAAB9zZXRfcHJvdG9jb2xfcGF1c2VkX3dpdGhfcmVhc29uAAAAAAIAAAAAAAAABnBhdXNlZAAAAAAAAQAAAAAAAAAGcmVhc29uAAAAAAARAAAAAA==",
        "AAAAAQAAAL5Pbi1jaGFpbiByZWNvcmQgZm9yIGFuIGFnZ3JlZ2F0ZWQgYXR0ZXN0YXRpb24gYmF0Y2guCgpTdG9yZXMgdGhlIE1lcmtsZSByb290IG9mIGFsbCBsZWFmIGhhc2hlcyBpbiB0aGUgYmF0Y2gsIHRoZSBudW1iZXIgb2YKbGVhdmVzLCBhbmQgdGhlIGxlZGdlciB0aW1lc3RhbXAgYXQgd2hpY2ggdGhlIGJhdGNoIHdhcyBjb21taXR0ZWQuAAAAAAAAAAAAEEF0dGVzdGF0aW9uQmF0Y2gAAAADAAAAL0xlZGdlciB0aW1lc3RhbXAgd2hlbiB0aGlzIGJhdGNoIHdhcyBjb21taXR0ZWQuAAAAAAxjb21taXR0ZWRfYXQAAAAGAAAAVU51bWJlciBvZiBsZWFmIGhhc2hlcyBjb21taXR0ZWQgaW4gdGhpcyBiYXRjaCAoaW5mb3JtYXRpb25hbDsgbm90CnZlcmlmaWVkIG9uLWNoYWluKS4AAAAAAAAFY291bnQAAAAAAAAEAAAANFNIQS0yNTYgTWVya2xlIHJvb3Qgb2YgYWxsIGxlYWYgaGFzaGVzIGluIHRoZSBiYXRjaC4AAAALbWVya2xlX3Jvb3QAAAAD7gAAACA=",
        "AAAAAQAAAVBSZWFzb24gZm9yIHByb3RvY29sIHBhdXNlIChlc2NhcGUtaGF0Y2ggYXVkaXQgdHJhaWwpLgoKU3RvcmVkIGFsb25nc2lkZSB0aGUgcGF1c2UgZmxhZyBpbiBpbnN0YW5jZSBzdG9yYWdlIHdoZW4gdGhlIGFkbWluIGludm9rZXMKYHNldF9wcm90b2NvbF9wYXVzZWRgLiBJbnRlbmRlZCBmb3IgZ292ZXJuYW5jZSB0cmFuc3BhcmVuY3kgYW5kIG9mZi1jaGFpbgptb25pdG9yaW5nIOKAlCB0aGUgcmVhc29uIGlzIGEgaHVtYW4tcmVhZGFibGUgc3ltYm9sIHRoYXQgaW5kZXhlcnMgYW5kCmRhc2hib2FyZHMgY2FuIGRpc3BsYXkgdG8gZXhwbGFpbiB3aHkgdGhlIHByb3RvY29sIGlzIHBhdXNlZC4AAAAAAAAAC1BhdXNlUmVhc29uAAAAAAMAAAAlQWRtaW4gYWRkcmVzcyB0aGF0IGludm9rZWQgdGhlIHBhdXNlLgAAAAAAAAVhY3RvcgAAAAAAABMAAABNSHVtYW4tcmVhZGFibGUgcmVhc29uIGZvciBwYXVzaW5nIChlLmcuLCAib3JhY2xlLW91dGFnZSIsICJ0b2tlbi1taWdyYXRpb24iKS4AAAAAAAAGcmVhc29uAAAAAAARAAAALkxlZGdlciB0aW1lc3RhbXAgd2hlbiB0aGUgcGF1c2Ugd2FzIGFjdGl2YXRlZC4AAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        "AAAAAwAAAmVTdGF0dXMgb2YgYSBib3Jyb3dlcidzIGNyZWRpdCBsaW5lLgoKIyBEaXNjcmltaW5hbnQgc3RhYmlsaXR5ClRoZSBkaXNjcmltaW5hbnRzIGFyZSBwYXJ0IG9mIHRoZSBjb250cmFjdCBBQkkuIFRoZXkgbXVzdCBuZXZlciBiZQpyZW9yZGVyZWQgb3IgcmVudW1iZXJlZDsgbmV3IHZhcmlhbnRzIG11c3QgYmUgYXBwZW5kZWQuCgojIFRyYW5zaXRpb25zClNlZSBbYGRvY3Mvc3RhdGUtbWFjaGluZS5tZGBdKC4uLy4uLy4uL2RvY3Mvc3RhdGUtbWFjaGluZS5tZCkgZm9yIHRoZQphdXRob3JpdGF0aXZlIHN0YXRlLXRyYW5zaXRpb24gZGlhZ3JhbS4gSW4gc2hvcnQ6CgotIGBBY3RpdmVgIGlzIHRoZSBvbmx5IHN0YXRlIHRoYXQgcGVybWl0cyBuZXcgZHJhd3MuCi0gYFJlc3RyaWN0ZWRgIGFsbG93cyBkcmF3cyBidXQgdGhlIG51bWVyaWMgbGltaXQgY2hlY2sgd2lsbCBmYWlsIHVudGlsCnRoZSBib3Jyb3dlciByZXBheXMgdW5kZXIgdGhlIHJlZHVjZWQgY2VpbGluZy4KLSBgU3VzcGVuZGVkYCBhbmQgYERlZmF1bHRlZGAgYm90aCBibG9jayBkcmF3cyBhbmQgYWxsb3cgcmVwYXltZW50cy4KLSBgQ2xvc2VkYCBpcyB0ZXJtaW5hbCDigJQgbm8gZHJhd3MsIG5vIHJlcGF5bWVudHMuAAAAAAAAAAAAAAxDcmVkaXRTdGF0dXMAAAAFAAAANENyZWRpdCBsaW5lIGlzIGFjdGl2ZTsgZHJhd3MgYW5kIHJlcGF5bWVudHMgYWxsb3dlZC4AAAAGQWN0aXZlAAAAAAAAAAAATkNyZWRpdCBsaW5lIGlzIHRlbXBvcmFyaWx5IGZyb3plbiBieSBhZG1pbi4gRHJhd3MgYmxvY2tlZCwgcmVwYXltZW50cyBhbGxvd2VkLgAAAAAACVN1c3BlbmRlZAAAAAAAAAEAAABGQ3JlZGl0IGxpbmUgaXMgaW4gZGVmYXVsdDsgZHJhd3MgYmxvY2tlZCwgcmVwYXltZW50cyBhbGxvd2VkIGZvciBjdXJlLgAAAAAACURlZmF1bHRlZAAAAAAAAAIAAABFQ3JlZGl0IGxpbmUgaXMgcGVybWFuZW50bHkgY2xvc2VkLiBEcmF3cyBibG9ja2VkLCByZXBheW1lbnRzIGJsb2NrZWQuAAAAAAAABkNsb3NlZAAAAAAAAwAAAJZDcmVkaXQgbGltaXQgd2FzIGRlY3JlYXNlZCBiZWxvdyB1dGlsaXplZCBhbW91bnQ7IGV4Y2VzcyBtdXN0IGJlIHJlcGFpZC4KRHJhd3MgYXJlIG5vdCBmbGF0LWJsb2NrZWQgYnV0IHdpbGwgZmFpbCB0aGUgbnVtZXJpYyBsaW1pdCBjaGVjayB1bnRpbCBjdXJlZC4AAAAAAApSZXN0cmljdGVkAAAAAAAE",
        "AAAAAwAAAd1TdHJ1Y3R1cmVkIHRheG9ub215IGZvciBjcmVkaXQtbGluZSBhbmQgZ2xvYmFsIGRyYXcgZnJlZXplcy4KCiMgRGlzY3JpbWluYW50IHN0YWJpbGl0eQpEaXNjcmltaW5hbnRzIGFyZSBwYXJ0IG9mIHRoZSBjb250cmFjdCBBQkkuIE5ldyB2YXJpYW50cyBtdXN0IGJlIGFwcGVuZGVkOwpleGlzdGluZyB2YWx1ZXMgbXVzdCBuZXZlciBiZSByZW9yZGVyZWQgb3IgcmVudW1iZXJlZC4KCiMgVXNhZ2UKLSBbYGNyYXRlOjpmcmVlemU6OmZyZWV6ZV9kcmF3c2BdIHJlY29yZHMgYSBnbG9iYWwgcmVhc29uIGFsb25nc2lkZSB0aGUKY29udHJhY3Qtd2lkZSBkcmF3IGtpbGwtc3dpdGNoLgotIFtgY3JhdGU6OmZyZWV6ZTo6ZnJlZXplX2NyZWRpdF9saW5lYF0gcmVjb3JkcyBhIHBlci1ib3Jyb3dlciByZWFzb24gd2l0aG91dAptdXRhdGluZyBbYENyZWRpdFN0YXR1c2BdLCBwcmVzZXJ2aW5nIGxpZmVjeWNsZSBoaXN0b3J5IGZvciBpbmRleGVycy4AAAAAAAAAAAAADEZyZWV6ZVJlYXNvbgAAAAUAAABCU2NoZWR1bGVkIHJlc2VydmUgb3IgdHJlYXN1cnkgb3BlcmF0aW9ucyBhZmZlY3RpbmcgZHJhdyBsaXF1aWRpdHkuAAAAAAAQTGlxdWlkaXR5UmVzZXJ2ZQAAAAAAAAAtUmVndWxhdG9yeSBvciBjb21wbGlhbmNlLW1hbmRhdGVkIGRyYXcgcGF1c2UuAAAAAAAACkNvbXBsaWFuY2UAAAAAAAEAAAAzQWN0aXZlIHJpc2sgaW52ZXN0aWdhdGlvbiBvciBvZmYtY2hhaW4gcmlzayBzaWduYWwuAAAAABFSaXNrSW52ZXN0aWdhdGlvbgAAAAAAAAIAAAAnUGxhbm5lZCBvcGVyYXRpb25hbCBtYWludGVuYW5jZSB3aW5kb3cuAAAAABZPcGVyYXRpb25hbE1haW50ZW5hbmNlAAAAAAADAAAAKEJvcnJvd2VyLWluaXRpYXRlZCB2b2x1bnRhcnkgZHJhdyBwYXVzZS4AAAAPQm9ycm93ZXJSZXF1ZXN0AAAAAAQ=",
        "AAAAAQAAAUVPcmFjbGUgY2lyY3VpdC1icmVha2VyIGNvbmZpZ3VyYXRpb24uCgpXaGVuIHNldCwgYHNldHRsZV9kZWZhdWx0X2xpcXVpZGF0aW9uYCB2YWxpZGF0ZXMgdGhlIHN1cHBsaWVkIGBvcmFjbGVfcHJpY2VgCmFnYWluc3QgdGhlIGxhc3QgYWNjZXB0ZWQgcHJpY2UgYW5kIHRoZSBjdXJyZW50IGxlZGdlciB0aW1lc3RhbXAgYmVmb3JlCmFwcGx5aW5nIHRoZSBzZXR0bGVtZW50LgoKIyBJbnZhcmlhbnRzCi0gYG1heF9kZXZpYXRpb25fYnBzYCBtdXN0IGJlIGluIGAxLi49MTBfMDAwYCAoMC4wMSAlIOKAkyAxMDAgJSkuCi0gYG1heF9hZ2Vfc2Vjb25kc2AgbXVzdCBiZSA+IDAuAAAAAAAAAAAAAAxPcmFjbGVDb25maWcAAAACAAAASE1heGltdW0gYWdlIG9mIGFuIG9yYWNsZSBwcmljZSBpbiBzZWNvbmRzIGJlZm9yZSBpdCBpcyBjb25zaWRlcmVkIHN0YWxlLgAAAA9tYXhfYWdlX3NlY29uZHMAAAAABgAAAF5NYXhpbXVtIGFsbG93ZWQgcHJpY2UgZGV2aWF0aW9uIGZyb20gdGhlIGxhc3QgYWNjZXB0ZWQgcHJpY2UsIGluIGJhc2lzIHBvaW50cy4KRS5nLiA1MDAgPSA1ICUuAAAAAAARbWF4X2RldmlhdGlvbl9icHMAAAAAAAAE",
        "AAAABAAABABFcnJvcnMgdGhhdCBjYW4gYmUgcmV0dXJuZWQgYnkgdGhlIENyZWRpdCBjb250cmFjdC4KCiMgU3RhYmlsaXR5IGd1YXJhbnRlZQpUaGVzZSBkaXNjcmltaW5hbnRzIGFyZSAqKnBlcm1hbmVudCoqLiBOZXZlciByZW9yZGVyIG9yIHJlbnVtYmVyIGV4aXN0aW5nCnZhcmlhbnRzIOKAlCBkb2luZyBzbyB3b3VsZCBicmVhayBkZXBsb3llZCBTREsgY2xpZW50cy4gTmV3IHZhcmlhbnRzIG11c3QgYmUKYXBwZW5kZWQgYXQgdGhlIGVuZCB3aXRoIHRoZSBuZXh0IGF2YWlsYWJsZSBpbnRlZ2VyLgoKIyBDYXRlZ29yeQpVc2UgW2BDb250cmFjdEVycm9yOjpjYXRlZ29yeWBdIHRvIG1hcCBhbnkgZXJyb3IgdG8gaXRzCltgQ29udHJhY3RFcnJvckNhdGVnb3J5YF0gZm9yIGNsaWVudC1zaWRlIGdyb3VwaW5nLiBTZWUKW2Bkb2NzL2Vycm9yLXRheG9ub215Lm1kYF0oLi4vLi4vLi4vZG9jcy9lcnJvci10YXhvbm9teS5tZCkgZm9yIHRoZQpjYXRlZ29yaXplZCByZWZlcmVuY2Ugd2l0aCByZWNvdmVyeSBhY3Rpb25zLgoKIyBEaXNjcmltaW5hbnQgdGFibGUgKHNvdXJjZSBvZiB0cnV0aCkKfCBDb2RlIHwgVmFyaWFudCAgICAgICAgICAgICAgICAgICAgICAgIHwgQ2F0ZWdvcnkgICAgICB8IERlc2NyaXB0aW9uIHwKfC0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwKfCAxICAgIHwgYFVuYXV0aG9yaXplZGAgICAgICAgICAgICAgICAgIHwgQXV0aCAgICAgICAgICB8IENhbGxlciBpcyBub3QgYXV0aG9yaXplZCB8CnwgMiAgICB8IGBOb3RBZG1pbmAgICAgICAgICAgICAgICAgICAgICB8IEF1dGggICAgICAgICAgfCBDYWxsZXIgbGFja3MgYWRtaW4gcHJpdmlsZWdlcyB8CnwgMyAgICB8IGBDcmVkaXRMaW5lTm90Rm91bmRgICAgICAgICAgICB8IE1pc2MgICAgICAgICAgfCBDcmVkaXQgbGluZSBkb2VzIG5vdCBleGlzdCB8CnwgNCAgICB8IGBDcmVkaXRMaW5lQ2xvc2VkYCAgICAgICAgICAgICB8IExpZmVjeWNsZSAgICAgfCBDcmVkAAAAAAAAAA1Db250cmFjdEVycm9yAAAAAAAAMgAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAAITm90QWRtaW4AAAACAAAAAAAAABJDcmVkaXRMaW5lTm90Rm91bmQAAAAAAAMAAAAAAAAAEENyZWRpdExpbmVDbG9zZWQAAAAEAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAABQAAAAAAAAAJT3ZlckxpbWl0AAAAAAAABgAAAAAAAAANTmVnYXRpdmVMaW1pdAAAAAAAAAcAAAAAAAAAC1JhdGVUb29IaWdoAAAAAAgAAAAAAAAADFNjb3JlVG9vSGlnaAAAAAkAAAAAAAAAElV0aWxpemF0aW9uTm90WmVybwAAAAAACgAAAAAAAAAKUmVlbnRyYW5jeQAAAAAACwAAAAAAAAAIT3ZlcmZsb3cAAAAMAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAA4AAAAAAAAAE0FkbWluQWNjZXB0VG9vRWFybHkAAAAADwAAAAAAAAAURHJhd0V4Y2VlZHNNYXhBbW91bnQAAAARAAAAAAAAAAZQYXVzZWQAAAAAABIAAAAAAAAAC0RyYXdzRnJvemVuAAAAABMAAAAAAAAAE0NyZWRpdExpbmVTdXNwZW5kZWQAAAAAFAAAAAAAAAATQ3JlZGl0TGluZURlZmF1bHRlZAAAAAAVAAAAAAAAABVNaXNzaW5nTGlxdWlkaXR5VG9rZW4AAAAAAAAWAAAAAAAAABZNaXNzaW5nTGlxdWlkaXR5U291cmNlAAAAAAAXAAAAAAAAABxJbnN1ZmZpY2llbnRMaXF1aWRpdHlSZXNlcnZlAAAAGAAAAAAAAAAVUmVwYXlFeGNlZWRzTWF4QW1vdW50AAAAAAAAHAAAAAAAAAASRHJhd0Nvb2xkb3duQWN0aXZlAAAAAAAdAAAAAAAAAA5UcmVhc3VyeU5vdFNldAAAAAAAHgAAAAAAAAATRXhwb3N1cmVDYXBFeGNlZWRlZAAAAAAfAAAAAAAAABNBZG1pbk5vdEluaXRpYWxpemVkAAAAACAAAAAAAAAAE1RpbWVzdGFtcFJlZ3Jlc3Npb24AAAAAIQAAAAAAAAAQTGltaXRPdXRPZkJvdW5kcwAAACIAAAAAAAAAG0NvbGxhdGVyYWxSYXRpb0JlbG93TWluaW11bQAAAAAjAAAAAAAAABJPcmFjbGVQcmljZUludmFsaWQAAAAAACQAAAAAAAAAEE9yYWNsZVByaWNlU3RhbGUAAAAlAAAAAAAAABRPcmFjbGVQcmljZURldmlhdGlvbgAAACYAAAAAAAAAHUluc3VmZmljaWVudENvbGxhdGVyYWxCYWxhbmNlAAAAAAAAJwAAAAAAAAAOQm9ycm93ZXJGcm96ZW4AAAAAACgAAAAAAAAADEJvdW50eU5vdFNldAAAACkAAAAAAAAAG05vUGVuZGluZ1RyZWFzdXJ5V2l0aGRyYXdhbAAAAAAqAAAAAAAAABBDcmVkaXRMaW5lRnJvemVuAAAALgAAAAAAAAAZRHJhd1JldmVyc2FsV2luZG93RXhwaXJlZAAAAAAAAC8AAAAAAAAAFE9yaWdpbmFsRHJhd05vdEZvdW5kAAAAMAAAAAAAAAAYQXR0ZXN0YXRpb25CYXRjaE5vdEZvdW5kAAAAMQAAAAAAAAAST3JhY2xlUXVvcnVtTm90TWV0AAAAAAAyAAAAAAAAAA5BbHJlYWR5U2V0dGxlZAAAAAAAMwAAAAAAAAARSW52YWxpZFJpc2tXZWlnaHQAAAAAAAA0AAAAAAAAABJJbnZhbGlkQXR0ZXN0YXRpb24AAAAAADUAAAAAAAAAF1Jpc2tBZG1pbkNvb2xkb3duQWN0aXZlAAAAADYAAAAAAAAADk9yYWNsZU5vdEZvdW5kAAAAAAA3AAAAAAAAABRGcmVlemVDb29sZG93bkFjdGl2ZQAAADkAAAAAAAAAHUFkbWluQ29sbGF0ZXJhbENvb2xkb3duQWN0aXZlAAAAAAAAOgAAAAAAAAAWTGlxdWlkYXRpb25HcmFjZUFjdGl2ZQAAAAAAOw==",
        "AAAAAQAAACdTdG9yZWQgY3JlZGl0IGxpbmUgZGF0YSBmb3IgYSBib3Jyb3dlci4AAAAAAAAAAA5DcmVkaXRMaW5lRGF0YQAAAAAACgAAAIFUb3RhbCBhY2NydWVkIGludGVyZXN0IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIHV0aWxpemVkIGFtb3VudC4KVGhpcyB0cmFja3MgdGhlIGN1bXVsYXRpdmUgaW50ZXJlc3QgdGhhdCBoYXMgYmVlbiBjYXBpdGFsaXplZC4AAAAAAAAQYWNjcnVlZF9pbnRlcmVzdAAAAAsAAAAYQWRkcmVzcyBvZiB0aGUgYm9ycm93ZXIuAAAACGJvcnJvd2VyAAAAEwAAAChNYXhpbXVtIGJvcnJvd2FibGUgYW1vdW50IGZvciB0aGlzIGxpbmUuAAAADGNyZWRpdF9saW1pdAAAAAsAAAA0QW5udWFsIGludGVyZXN0IHJhdGUgaW4gYmFzaXMgcG9pbnRzICgxIGJwID0gMC4wMSUpLgAAABFpbnRlcmVzdF9yYXRlX2JwcwAAAAAAAAQAAABpTGVkZ2VyIHRpbWVzdGFtcCBvZiB0aGUgbGFzdCBpbnRlcmVzdCBhY2NydWFsIGNhbGN1bGF0aW9uLgpaZXJvIG1lYW5zIG5vIGFjY3J1YWwgaGFzIGJlZW4gY2FsY3VsYXRlZCB5ZXQuAAAAAAAAD2xhc3RfYWNjcnVhbF90cwAAAAAGAAAAXkxlZGdlciB0aW1lc3RhbXAgb2YgdGhlIGxhc3QgaW50ZXJlc3QtcmF0ZSB1cGRhdGUuClplcm8gbWVhbnMgbm8gcmF0ZSB1cGRhdGUgaGFzIG9jY3VycmVkIHlldC4AAAAAABNsYXN0X3JhdGVfdXBkYXRlX3RzAAAAAAYAAAAeQm9ycm93ZXIncyByaXNrIHNjb3JlICgwLTEwMCkuAAAAAAAKcmlza19zY29yZQAAAAAABAAAACJDdXJyZW50IHN0YXR1cyBvZiB0aGUgY3JlZGl0IGxpbmUuAAAAAAAGc3RhdHVzAAAAAAfQAAAADENyZWRpdFN0YXR1cwAAAN1MZWRnZXIgdGltZXN0YW1wIHdoZW4gdGhlIGNyZWRpdCBsaW5lIHdhcyBtb3N0IHJlY2VudGx5IHN1c3BlbmRlZC4KWmVybyB3aGVuIHRoZSBsaW5lIGhhcyBuZXZlciBiZWVuIHN1c3BlbmRlZCBvciBoYXMgYmVlbiByZWluc3RhdGVkLgpVc2VkIGJ5IHRoZSBncmFjZSBwZXJpb2QgbG9naWMgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIHdhaXZlciB3aW5kb3cKaXMgc3RpbGwgYWN0aXZlLgAAAAAAAA1zdXNwZW5zaW9uX3RzAAAAAAAABgAAAB5DdXJyZW50IG91dHN0YW5kaW5nIHByaW5jaXBhbC4AAAAAAA91dGlsaXplZF9hbW91bnQAAAAACw==",
        "AAAAAQAAAOpQcm9vZi1vZi1yZXNlcnZlIHZpZXcgZm9yIHRoZSBwcm90b2NvbCB0cmVhc3VyeS4KCkV4cG9zZXMgdGhlIGFjY3VtdWxhdGVkIHJlc2VydmVzIGhlbGQgYnkgdGhlIHByb3RvY29sIGluIGEgc2luZ2xlCnJlYWQtb25seSBjYWxsLiBJbmRleGVycyBhbmQgZGFzaGJvYXJkcyBjYW4gdXNlIHRoaXMgdG8gdmVyaWZ5IHRoYXQKdGhlIHByb3RvY29sJ3MgYWNjb3VudGluZyBiYWxhbmNlcyBhcmUgY29uc2lzdGVudC4AAAAAAAAAAAAOUHJvb2ZPZlJlc2VydmUAAAAAAAIAAAAyQWNjdW11bGF0ZWQgYm91bnR5IHBvb2wgZmVlcyBoZWxkIGluIHRoZSBjb250cmFjdC4AAAAAAA5ib3VudHlfYmFsYW5jZQAAAAAACwAAAEBBY2N1bXVsYXRlZCBwcm90b2NvbCBmZWVzIGhlbGQgaW4gdGhlIGNvbnRyYWN0ICh0cmVhc3VyeSBzaGFyZSkuAAAAEHRyZWFzdXJ5X2JhbGFuY2UAAAAL",
        "AAAAAQAAAdpHbG9iYWwgcHJvdG9jb2wgY29uZmlndXJhdGlvbi4KCkEgcHJvamVjdGlvbiBvZiB0aGUgaW5zdGFuY2Utc3RvcmFnZSBrZXlzCltgY3JhdGU6OnN0b3JhZ2U6OkRhdGFLZXk6OkxpcXVpZGl0eVRva2VuYF0gYW5kCltgY3JhdGU6OnN0b3JhZ2U6OkRhdGFLZXk6OkxpcXVpZGl0eVNvdXJjZWBdLCByZXR1cm5lZCBieQpgZ2V0X3Byb3RvY29sX2NvbmZpZ2AgZm9yIGludGVncmF0b3JzIHdobyBuZWVkIHRvIGluc3BlY3QgYm90aAp2YWx1ZXMgaW4gYSBzaW5nbGUgY2FsbC4KCkVpdGhlciBmaWVsZCBtYXkgYmUgYE5vbmVgIGlmIHRoZSBjb3JyZXNwb25kaW5nIGtleSBoYXMgbm90IGJlZW4gc2V0OyBpbgp0aGF0IGNhc2UgdGhlIHJlbGV2YW50IGVudHJ5cG9pbnRzIHBhbmljIHdpdGgKW2BDb250cmFjdEVycm9yOjpNaXNzaW5nTGlxdWlkaXR5VG9rZW5gXSBvcgpbYENvbnRyYWN0RXJyb3I6Ok1pc3NpbmdMaXF1aWRpdHlTb3VyY2VgXS4AAAAAAAAAAAAOUHJvdG9jb2xDb25maWcAAAAAAAIAAAAcQ29uZmlndXJlZCBsaXF1aWRpdHkgc291cmNlLgAAABBsaXF1aWRpdHlfc291cmNlAAAD6AAAABMAAAAbQ29uZmlndXJlZCBsaXF1aWRpdHkgdG9rZW4uAAAAAA9saXF1aWRpdHlfdG9rZW4AAAAD6AAAABM=",
        "AAAAAQAAAEhQYWdpbmF0ZWQgbGlzdCBvZiBjcmVkaXQgbGluZXMgcmV0dXJuZWQgYnkgYGdldF9jcmVkaXRfbGluZXNfcGFnaW5hdGVkYC4AAAAAAAAAD0NyZWRpdExpbmVzUGFnZQAAAAADAAAANmB0cnVlYCBpZiB0aGVyZSBhcmUgYWRkaXRpb25hbCBsaW5lcyBiZXlvbmQgdGhpcyBwYWdlLgAAAAAACGhhc19tb3JlAAAAAQAAACNDcmVkaXQgbGluZXMgaW5jbHVkZWQgaW4gdGhpcyBwYWdlLgAAAAAFbGluZXMAAAAAAAPqAAAH0AAAAA5DcmVkaXRMaW5lRGF0YQAAAAAAN0N1cnNvciBmb3IgZmV0Y2hpbmcgdGhlIG5leHQgcGFnZSwgaWYgbW9yZSBpdGVtcyBleGlzdC4AAAAAC25leHRfY3Vyc29yAAAAA+gAAAAE",
        "AAAAAwAAABpHcmFjZSBwZXJpb2Qgd2FpdmVyIG1vZGVzLgAAAAAAAAAAAA9HcmFjZVdhaXZlck1vZGUAAAAAAgAAADBGdWxsIHdhaXZlciAtIHplcm8gaW50ZXJlc3QgZHVyaW5nIGdyYWNlIHBlcmlvZC4AAAAKRnVsbFdhaXZlcgAAAAAAAAAAADpSZWR1Y2VkIHJhdGUgLSBhcHBseSByZWR1Y2VkX3JhdGVfYnBzIGR1cmluZyBncmFjZSBwZXJpb2QuAAAAAAALUmVkdWNlZFJhdGUAAAAAAQ==",
        "AAAAAQAAAF9HbG9iYWwgcHJvdG9jb2wgYWdncmVnYXRlIGJhbGFuY2VzLgoKUmV0dXJuZWQgYnkgYGdldF9wcm90b2NvbF9zdW1tYXJ5YCBhcyBhIFNvcm9iYW4gQUJJIHZhbHVlLgAAAAAAAAAAD1Byb3RvY29sU3VtbWFyeQAAAAAFAAAAOEFjY3VtdWxhdGVkIGJvdW50eSBwb29sIGZlZXMgYXdhaXRpbmcgYm91bnR5IHdpdGhkcmF3YWwuAAAADmJvdW50eV9iYWxhbmNlAAAAAAALAAAAH051bWJlciBvZiBpbmRleGVkIGNyZWRpdCBsaW5lcy4AAAAABWNvdW50AAAAAAAABAAAACZHbG9iYWwgY29sbGF0ZXJhbCBiYWxhbmNlIGFjY3VtdWxhdG9yLgAAAAAAEHRvdGFsX2NvbGxhdGVyYWwAAAALAAAAJkdsb2JhbCB1dGlsaXplZCBwcmluY2lwYWwgYWNjdW11bGF0b3IuAAAAAAAOdG90YWxfdXRpbGl6ZWQAAAAAAAsAAAA3QWNjdW11bGF0ZWQgcHJvdG9jb2wgZmVlcyBhd2FpdGluZyB0cmVhc3VyeSB3aXRoZHJhd2FsLgAAAAAQdHJlYXN1cnlfYmFsYW5jZQAAAAs=",
        "AAAAAQAAAF1QZXJzaXN0ZWQgc3RhdGUgZm9yIHRoZSBnbG9iYWwgZHJhdy1mcmVlemUgc3dpdGNoIChbYGNyYXRlOjpzdG9yYWdlOjpEYXRhS2V5OjpEcmF3c0Zyb3plbmBdKS4AAAAAAAAAAAAAEERyYXdzRnJlZXplU3RhdGUAAAACAAAAK2B0cnVlYCB3aGVuIGFsbCBkcmF3cyBhcmUgY3VycmVudGx5IGZyb3plbi4AAAAABmZyb3plbgAAAAAAAQAAAEVTdHJ1Y3R1cmVkIHJlYXNvbiByZWNvcmRlZCBvbiB0aGUgbW9zdCByZWNlbnQgZnJlZXplL3VuZnJlZXplIGFjdGlvbi4AAAAAAAAGcmVhc29uAAAAAAfQAAAADEZyZWV6ZVJlYXNvbg==",
        "AAAAAQAAADNBZG1pbi1jb25maWd1cmFibGUgbGltaXRzIG9uIGludGVyZXN0LXJhdGUgY2hhbmdlcy4AAAAAAAAAABBSYXRlQ2hhbmdlQ29uZmlnAAAAAgAAAElNYXhpbXVtIGFic29sdXRlIGNoYW5nZSBpbiBgaW50ZXJlc3RfcmF0ZV9icHNgIGFsbG93ZWQgcGVyIHNpbmdsZSB1cGRhdGUuAAAAAAAAE21heF9yYXRlX2NoYW5nZV9icHMAAAAABAAAAD1NaW5pbXVtIGVsYXBzZWQgc2Vjb25kcyBiZXR3ZWVuIHR3byBjb25zZWN1dGl2ZSByYXRlIGNoYW5nZXMuAAAAAAAAGHJhdGVfY2hhbmdlX21pbl9pbnRlcnZhbAAAAAY=",
        "AAAAAQAAADZHcmFjZSBwZXJpb2QgY29uZmlndXJhdGlvbiBmb3IgU3VzcGVuZGVkIGNyZWRpdCBsaW5lcy4AAAAAAAAAAAARR3JhY2VQZXJpb2RDb25maWcAAAAAAAADAAAAKER1cmF0aW9uIG9mIHRoZSBncmFjZSB3aW5kb3cgaW4gc2Vjb25kcy4AAAAUZ3JhY2VfcGVyaW9kX3NlY29uZHMAAAAGAAAANlJlZHVjZWQgcmF0ZSB0byBhcHBseSB3aGVuIHdhaXZlcl9tb2RlIGlzIFJlZHVjZWRSYXRlLgAAAAAAEHJlZHVjZWRfcmF0ZV9icHMAAAAEAAAAMFR5cGUgb2Ygd2FpdmVyIHRvIGFwcGx5IGR1cmluZyB0aGUgZ3JhY2UgcGVyaW9kLgAAAAt3YWl2ZXJfbW9kZQAAAAfQAAAAD0dyYWNlV2FpdmVyTW9kZQA=",
        "AAAAAQAAAYpSZWFkLW9ubHkgY2FwYWJpbGl0aWVzIGJpdG1hcCBmb3IgdGhlIHF1ZXJ5ICh2Nykgc3Vic3lzdGVtLgoKUmV0dXJuZWQgYnkgYHF1ZXJ5X2NhcGFiaWxpdGllc2AgLyB0aGUgYGNhcGFiaWxpdGllc2AgYW5jaG9yIGluCmBjb250cmFjdHMvcXVlcnkvc3JjL3ZpZXdzLnJzYCBzbyBvZmYtY2hhaW4gY2xpZW50cyBhbmQga2VlcGVycyBjYW4KaW5zcGVjdCB3aGljaCBib3Jyb3dlci1zY29wZWQgcXVlcnkgcmVzdWx0cyBhcmUgY3VycmVudGx5IG1lYW5pbmdmdWwKd2l0aG91dCBpc3N1aW5nIG11bHRpcGxlIHNlcGFyYXRlIHJlYWRzLgoKRXZlcnkgZmllbGQgaXMgZGVyaXZlZCBwdXJlbHkgZnJvbSBzdG9yYWdlIOKAlCBubyB0b2tlbiBDUElzLCBubyBhdXRoCmNoZWNrcywgbm8gbXV0YXRpb24uAAAAAAAAAAAAEVF1ZXJ5Q2FwYWJpbGl0aWVzAAAAAAAABQAAAKpEZWxpbnF1ZW5jeSBjaGVja3MgY2FuIHJldHVybiBgdHJ1ZWAgKG9wZW4gbGluZSB3aXRoIHV0aWxpemF0aW9uIGFuZAphIGNvbmZpZ3VyZWQgcmVwYXltZW50IHNjaGVkdWxlKS4gTWlycm9ycyB0aGUgc2hvcnQtY2lyY3VpdCBnYXRlcyBpbgpbYGNyYXRlOjpxdWVyeTo6aXNfZGVsaW5xdWVudGBdLgAAAAAAFmRlbGlucXVlbmN5X2FwcGxpY2FibGUAAAAAAAEAAAAzYGdldF9jcmVkaXRfbGluZWAgcmV0dXJucyBgU29tZWAgZm9yIHRoaXMgYm9ycm93ZXIuAAAAAA9oYXNfY3JlZGl0X2xpbmUAAAAAAQAAADpgZ2V0X3JlcGF5bWVudF9zY2hlZHVsZWAgcmV0dXJucyBgU29tZWAgZm9yIHRoaXMgYm9ycm93ZXIuAAAAAAAWaGFzX3JlcGF5bWVudF9zY2hlZHVsZQAAAAAAAQAAAIRIZWFsdGggZmFjdG9yIGlzIGRlYnQtc2Vuc2l0aXZlIChgdXRpbGl6ZWRfYW1vdW50ID4gMGApLiBXaGVuCmBmYWxzZWAsIGBnZXRfaGVhbHRoX2ZhY3RvcmAgcmV0dXJucyBgdTMyOjpNQVhgIChubyBvdXRzdGFuZGluZyBkZWJ0KS4AAAAYaGVhbHRoX2ZhY3Rvcl9hcHBsaWNhYmxlAAAAAQAAAHlDdXJyZW50IGRlbGlucXVlbmN5IHN0YXR1cyBmcm9tIFtgY3JhdGU6OnF1ZXJ5Ojppc19kZWxpbnF1ZW50YF0uCkFsd2F5cyBgZmFsc2VgIHdoZW4gYGRlbGlucXVlbmN5X2FwcGxpY2FibGVgIGlzIGBmYWxzZWAuAAAAAAAADWlzX2RlbGlucXVlbnQAAAAAAAAB",
        "AAAAAQAAActBZG1pbi1jb25maWd1cmFibGUgcGllY2V3aXNlLWxpbmVhciByYXRlIGZvcm11bGEuCgpXaGVuIHN0b3JlZCBpbiBpbnN0YW5jZSBzdG9yYWdlLCBgdXBkYXRlX3Jpc2tfcGFyYW1ldGVyc2AgY29tcHV0ZXMKYGludGVyZXN0X3JhdGVfYnBzYCBmcm9tIHRoZSBib3Jyb3dlcidzIGByaXNrX3Njb3JlYCBpbnN0ZWFkIG9mIHVzaW5nCnRoZSBtYW51YWxseSBzdXBwbGllZCByYXRlLgoKIyBGb3JtdWxhCmBgYHRleHQKcmF3X3JhdGUgPSBiYXNlX3JhdGVfYnBzICsgKHJpc2tfc2NvcmUgKiBzbG9wZV9icHNfcGVyX3Njb3JlKQplZmZlY3RpdmVfcmF0ZSA9IGNsYW1wKHJhd19yYXRlLCBtaW5fcmF0ZV9icHMsIG1pbihtYXhfcmF0ZV9icHMsIDEwXzAwMCkpCmBgYAoKIyBJbnZhcmlhbnRzCi0gYG1pbl9yYXRlX2JwcyA8PSBtYXhfcmF0ZV9icHMgPD0gMTBfMDAwYAotIGBiYXNlX3JhdGVfYnBzIDw9IDEwXzAwMGAAAAAAAAAAABFSYXRlRm9ybXVsYUNvbmZpZwAAAAAAAAQAAAA0QmFzZSBpbnRlcmVzdCByYXRlIGluIGJwcyBhcHBsaWVkIGF0IHJpc2tfc2NvcmUgPSAwLgAAAA1iYXNlX3JhdGVfYnBzAAAAAAAABAAAADtNYXhpbXVtIGFsbG93ZWQgY29tcHV0ZWQgcmF0ZSAoY2VpbGluZyksIG11c3QgYmUgPD0gMTBfMDAwLgAAAAAMbWF4X3JhdGVfYnBzAAAABAAAACZNaW5pbXVtIGFsbG93ZWQgY29tcHV0ZWQgcmF0ZSAoZmxvb3IpLgAAAAAADG1pbl9yYXRlX2JwcwAAAAQAAAAwQWRkaXRpb25hbCBicHMgcGVyIHVuaXQgb2Ygcmlza19zY29yZSAoMOKAkzEwMCkuAAAAE3Nsb3BlX2Jwc19wZXJfc2NvcmUAAAAABA==",
        "AAAAAQAAAEJPcHRpb25hbCBpbnN0YWxsbWVudCByZXBheW1lbnQgc2NoZWR1bGUgYXR0YWNoZWQgdG8gYSBjcmVkaXQgbGluZS4AAAAAAAAAAAARUmVwYXltZW50U2NoZWR1bGUAAAAAAAADAAAANlJlcXVpcmVkIHJlcGF5bWVudCBhbW91bnQgZm9yIGVhY2ggaW5zdGFsbG1lbnQgcGVyaW9kLgAAAAAAEWFtb3VudF9wZXJfcGVyaW9kAAAAAAAACwAAAC9UaW1lc3RhbXAgYXQgd2hpY2ggdGhlIG5leHQgaW5zdGFsbG1lbnQgaXMgZHVlLgAAAAALbmV4dF9kdWVfdHMAAAAABgAAADNEdXJhdGlvbiBvZiBhIHNpbmdsZSBpbnN0YWxsbWVudCBwZXJpb2QgaW4gc2Vjb25kcy4AAAAADnBlcmlvZF9zZWNvbmRzAAAAAAAG",
        "AAAAAQAAAjFSZWFkLW9ubHkgY2FwYWJpbGl0aWVzIGJpdG1hcCBmb3IgYSBib3Jyb3dlcidzIGNyZWRpdCBsaW5lLgoKUmV0dXJuZWQgYnkgYGJvcnJvd19jYXBhYmlsaXRpZXNgIHRvIGxldCBvZmYtY2hhaW4gY2xpZW50cyBhbmQKb24tY2hhaW4gaW50ZWdyYXRvcnMgaW5zcGVjdCB3aGljaCBvcGVyYXRpb25zIGFyZSBjdXJyZW50bHkKcGVybWl0dGVkIGZvciBhIGJvcnJvd2VyLCB3aXRob3V0IG5lZWRpbmcgdG8gc2ltdWxhdGUgdGhlIGZ1bGwKZW50cnlwb2ludCBsb2dpYy4KCkVhY2ggYGJvb2xgIGZpZWxkIHJlcHJlc2VudHMgYSBzaW5nbGUgb3BlcmF0aW9uOyBgdHJ1ZWAgbWVhbnMgdGhlCm9wZXJhdGlvbiBzaG91bGQgc3VjY2VlZCBhc3N1bWluZyB2YWxpZCBwYXJhbWV0ZXJzIChhbW91bnQsIGV0Yy4pLgpBbW91bnQtZGVwZW5kZW50IGNoZWNrcyAoY3JlZGl0IGxpbWl0LCBjb2xsYXRlcmFsIHJhdGlvLCBkcmF3CmNvb2xkb3duLCBleHBvc3VyZSBjYXBzKSBhcmUgTk9UIGV2YWx1YXRlZCBiZWNhdXNlIHRoaXMgdmlldyBkb2VzCm5vdCBrbm93IHRoZSBpbnRlbmRlZCBkcmF3IGFtb3VudC4AAAAAAAAAAAAAEkJvcnJvd0NhcGFiaWxpdGllcwAAAAAAAwAAAN1XaGV0aGVyIHRoZSBib3Jyb3dlciBjYW4gZHJhdyBjcmVkaXQuIEZhbHNlIHdoZW4gdGhlIGNyZWRpdCBsaW5lCmRvZXMgbm90IGV4aXN0LCB0aGUgcHJvdG9jb2wgaXMgcGF1c2VkLCBkcmF3cyBhcmUgZnJvemVuLCB0aGUKYm9ycm93ZXIgaXMgYmxvY2tlZC9mcm96ZW4sIG9yIHRoZSBjcmVkaXQtbGluZSBzdGF0dXMgaXMgbm90CmRyYXctYWxsb3dlZCAoQWN0aXZlL1Jlc3RyaWN0ZWQpLgAAAAAAAAhjYW5fZHJhdwAAAAEAAABqV2hldGhlciB0aGUgYm9ycm93ZXIgY2FuIHJlcGF5IGNyZWRpdC4gRmFsc2Ugd2hlbiB0aGUgY3JlZGl0IGxpbmUKZG9lcyBub3QgZXhpc3Qgb3IgaXMgcGVybWFuZW50bHkgQ2xvc2VkLgAAAAAACWNhbl9yZXBheQAAAAAAAAEAAAB3V2hldGhlciB0aGUgYm9ycm93ZXIgY2FuIHNlbGYtc3VzcGVuZCB0aGVpciBjcmVkaXQgbGluZS4gVHJ1ZQpvbmx5IHdoZW4gdGhlIGNyZWRpdCBsaW5lIGV4aXN0cyBhbmQgaXMgY3VycmVudGx5IEFjdGl2ZS4AAAAAEGNhbl9zZWxmX3N1c3BlbmQAAAAB",
        "AAAAAQAAAXVBZ2dyZWdhdGVkLCBzaW5nbGUtY2FsbCByZWFkLW9ubHkgdmlldyBvZiBhIGJvcnJvd2VyJ3MgZnVsbCBjcmVkaXQtbGluZSBzdGF0ZS4KCkFzc2VtYmxlcyBbYENyZWRpdExpbmVEYXRhYF0sIGNvbGxhdGVyYWwgYmFsYW5jZSwgaGVhbHRoIGZhY3RvciwgcmVwYXltZW50CnNjaGVkdWxlLCBhbmQgZGVsaW5xdWVuY3kgc3RhdHVzIGluIG9uZSBjYWxsLCBhdm9pZGluZyB0aGUgbXVsdGlwbGUKcm91bmQtdHJpcHMgYSBjYWxsZXIgd291bGQgb3RoZXJ3aXNlIG5lZWQgZm9yIGBnZXRfY3JlZGl0X2xpbmVgICsKYGdldF9jb2xsYXRlcmFsYCArIGBnZXRfaGVhbHRoX2ZhY3RvcmAgKyBgZ2V0X3JlcGF5bWVudF9zY2hlZHVsZWAgKwpgaXNfZGVsaW5xdWVudGAuAAAAAAAAAAAAABJDcmVkaXRMaW5lU25hcHNob3QAAAAAAAUAAABDQ29sbGF0ZXJhbCBiYWxhbmNlIGZvciB0aGUgYm9ycm93ZXIgKHNpbmdsZS10b2tlbiBjb2xsYXRlcmFsIHBhdGgpLgAAAAASY29sbGF0ZXJhbF9iYWxhbmNlAAAAAAALAAAAV0NvbGxhdGVyYWwtYXdhcmUgaGVhbHRoIGZhY3RvciBpbiBiYXNpcyBwb2ludHMuIGB1MzI6Ok1BWGAgd2hlbgpgdXRpbGl6ZWRfYW1vdW50ID09IDBgLgAAAAARaGVhbHRoX2ZhY3Rvcl9icHMAAAAAAAAEAAAAPmB0cnVlYCB3aGVuIHRoZSBib3Jyb3dlciBpcyBwYXN0IHRoZSBkZWxpbnF1ZW5jeSBncmFjZSB3aW5kb3cuAAAAAAANaXNfZGVsaW5xdWVudAAAAAAAAAEAAAAcVGhlIGNvcmUgY3JlZGl0IGxpbmUgcmVjb3JkLgAAAARsaW5lAAAH0AAAAA5DcmVkaXRMaW5lRGF0YQAAAAABh1RoZSBib3Jyb3dlcidzIGluc3RhbGxtZW50IHJlcGF5bWVudCBzY2hlZHVsZSwgaWYgY29uZmlndXJlZC4KRW1wdHkgd2hlbiBubyBzY2hlZHVsZSBpcyBzZXQ7IGV4YWN0bHkgb25lIGVsZW1lbnQgd2hlbiBhIHNjaGVkdWxlCmlzIGNvbmZpZ3VyZWQuIFJlcHJlc2VudGVkIGFzIGEgYFZlY2AgcmF0aGVyIHRoYW4gYE9wdGlvbjxUPmAKYmVjYXVzZSB0aGUgU29yb2JhbiBTREsncyBzdHJ1Y3QtZmllbGQgWERSIGNvZGVnZW4gZG9lcyBub3Qgc3VwcG9ydApgT3B0aW9uPEN1c3RvbVN0cnVjdD5gIGZpZWxkcyAoYE9wdGlvbjxUPmAgcmVxdWlyZXMgYFQ6IEludG88U2NWYWw+YCwKd2hpY2ggYCNbY29udHJhY3R0eXBlXWAtZGVyaXZlZCBVRFRzIG9ubHkgaW1wbGVtZW50IGZhbGxpYmx5KS4AAAAAEnJlcGF5bWVudF9zY2hlZHVsZQAAAAAD6gAAB9AAAAARUmVwYXltZW50U2NoZWR1bGUAAAA=",
        "AAAAAQAAAXxNdWx0aS1vcmFjbGUgcXVvcnVtIGNvbmZpZ3VyYXRpb24uCgpXaGVuIHNldCwgYHN1Ym1pdF9vcmFjbGVfcHJpY2VzYCByZXNvbHZlcyBhIGNhbm9uaWNhbCBwcmljZSBmcm9tIHN1Ym1pdHRlZApmZWVkcyB1c2luZyBhIHF1b3J1bS1vZi1LIGFsZ29yaXRobSBpbnN0ZWFkIG9mIHRoZSBzaW5nbGUtZmVlZCBjaXJjdWl0CmJyZWFrZXIgcGF0aC4KCiMgSW52YXJpYW50cwotIGBtaW5fcXVvcnVtX2tgIG11c3QgYmUg4omlIDIgKGEgc2luZ2xlIGZlZWQgaXMgbm90IGEgcXVvcnVtKS4KLSBgbWF4X2RldmlhdGlvbl9icHNgIG11c3QgYmUgaW4gYDAuLj0xMF8wMDBgICgwID0gZXhhY3QgbWF0Y2ggcmVxdWlyZWQpLgotIGBtYXhfYWdlX3NlY29uZHNgIG11c3QgYmUgPiAwLgAAAAAAAAAST3JhY2xlUXVvcnVtQ29uZmlnAAAAAAADAAAAaE1heGltdW0gYWdlIG9mIHRoZSBzdG9yZWQgcXVvcnVtIHByaWNlIGluIHNlY29uZHMgYmVmb3JlIGl0IGlzCmNvbnNpZGVyZWQgc3RhbGUgZm9yIHNldHRsZW1lbnQgcHVycG9zZXMuAAAAD21heF9hZ2Vfc2Vjb25kcwAAAAAGAAAAhk1heGltdW0gYWxsb3dlZCBwcmljZSBkZXZpYXRpb24gYmV0d2VlbiB0aGUgaGlnaGVzdCBhbmQgbG93ZXN0IHByaWNlcwppbiB0aGUgcXVhbGlmeWluZyBxdW9ydW0gd2luZG93LCBpbiBiYXNpcyBwb2ludHMuCkUuZy4gNTAwID0gNSUuAAAAAAARbWF4X2RldmlhdGlvbl9icHMAAAAAAAAEAAAAZU1pbmltdW0gbnVtYmVyIG9mIHN1Ym1pdHRlZCBwcmljZXMgdGhhdCBtdXN0IGFncmVlIHdpdGhpbgpgbWF4X2RldmlhdGlvbl9icHNgIHRvIGZvcm0gYSB2YWxpZCBxdW9ydW0uAAAAAAAADG1pbl9xdW9ydW1fawAAAAQ=",
        "AAAAAwAAAP5TdHJ1Y3R1cmVkIGtpbmQgZGlzY3JpbWluYW50IGZvciBjb2xsYXRlcmFsIGxpZmVjeWNsZSBldmVudHMuCgojIERpc2NyaW1pbmFudCBzdGFiaWxpdHkKU2FtZSBydWxlIGFzIFtgRnJlZXplUmVhc29uYF0gLyBbYENyZWRpdFN0YXR1c2BdOiBkaXNjcmltaW5hbnRzIGFyZSBwYXJ0Cm9mIHRoZSBjb250cmFjdCBBQkkgYW5kIG11c3QgbmV2ZXIgYmUgcmVvcmRlcmVkIG9yIHJlbnVtYmVyZWQ7IG5ldwp2YXJpYW50cyBtdXN0IGJlIGFwcGVuZGVkLgAAAAAAAAAAABNDb2xsYXRlcmFsRXZlbnRLaW5kAAAAAAQAAAAuQ29sbGF0ZXJhbCB0b2tlbnMgZGVwb3NpdGVkIGludG8gdGhlIGNvbnRyYWN0LgAAAAAACURlcG9zaXRlZAAAAAAAAAAAAABGQ29sbGF0ZXJhbCB0b2tlbnMgd2l0aGRyYXduIGJ5IHRoZSBib3Jyb3dlciAoZ2VuZXJpYyB3aXRoZHJhd2FsIHBhdGgpLgAAAAAACVdpdGhkcmF3bgAAAAAAAAEAAABMQ29sbGF0ZXJhbCB0b2tlbnMgcmVsZWFzZWQgdmlhIHRoZSBoZWFsdGgtZmFjdG9yLWdhdGVkIHBhcnRpYWwgcmVsZWFzZSBwYXRoLgAAABFQYXJ0aWFsbHlSZWxlYXNlZAAAAAAAAAIAAABOQ29sbGF0ZXJhbCB0b2tlbnMgcmVsZWFzZWQgaW50ZXJuYWxseSBhcyBwYXJ0IG9mIGFuIGF0b21pYyByZXBheStyZWxlYXNlIGZsb3cuAAAAAAAIUmVsZWFzZWQAAAAD",
        "AAAAAQAAAEtQcm90b2NvbCBzdW1tYXJ5IHJldHVybmVkIGJ5IHRoZSBzcGVjaWZpYyBxdWVyeSB2aWV3IGZvciBHcmFudEZveCBjYW1wYWlnbi4AAAAAAAAAABNQcm90b2NvbFN1bW1hcnlWaWV3AAAAAAMAAAAnQ291bnQgb2YgY3VycmVudGx5IEFjdGl2ZSBjcmVkaXQgbGluZXMuAAAAABFhY3RpdmVfbGluZV9jb3VudAAAAAAAAAQAAAAmR2xvYmFsIGNvbGxhdGVyYWwgYmFsYW5jZSBhY2N1bXVsYXRvci4AAAAAABB0b3RhbF9jb2xsYXRlcmFsAAAACwAAACZHbG9iYWwgdXRpbGl6ZWQgcHJpbmNpcGFsIGFjY3VtdWxhdG9yLgAAAAAADnRvdGFsX3V0aWxpemVkAAAAAAAL",
        "AAAAAQAAAlJSZWFkLW9ubHkgY2FwYWJpbGl0aWVzIGJpdG1hcCBmb3IgYSBjcmVkaXQgbGluZSdzIGxpZmVjeWNsZSB0cmFuc2l0aW9ucyAodjcpLgoKUmV0dXJuZWQgYnkgdGhlIGBsaWZlY3ljbGVfY2FwYWJpbGl0aWVzYCB2aWV3IHRvIGxldCBvZmYtY2hhaW4gY2xpZW50cyBhbmQKb24tY2hhaW4gaW50ZWdyYXRvcnMgaW5zcGVjdCB3aGljaCBsaWZlY3ljbGUgdHJhbnNpdGlvbnMgYXJlIGN1cnJlbnRseQpwZXJtaXR0ZWQgZm9yIGEgYm9ycm93ZXIncyBjcmVkaXQgbGluZSwgd2l0aG91dCBzaW11bGF0aW5nIHRoZSBmdWxsCmVudHJ5cG9pbnQgbG9naWMgKHN0YXRlIGxvb2t1cCArIHN0YXR1cyBjaGVja3MgKyBwYXVzZSBndWFyZCkuCgpFdmVyeSBmaWVsZCBpcyBkZXJpdmVkIHB1cmVseSBmcm9tIHRoZSBjcmVkaXQgbGluZSdzIGN1cnJlbnQKW2BDcmVkaXRTdGF0dXNgXSBhbmQgdGhlIHByb3RvY29sIHBhdXNlIGZsYWcg4oCUIG5vIHRva2VuIENQSXMsIG5vIGF1dGgKY2hlY2tzLCBubyBtdXRhdGlvbi4gU2VlIFtgY3JhdGU6OmxpZmVjeWNsZWBdIGZvciB0aGUgYXV0aG9yaXRhdGl2ZQp0cmFuc2l0aW9uIHJ1bGVzIGVhY2ggZmllbGQgbWlycm9ycy4AAAAAAAAAAAAVTGlmZWN5Y2xlQ2FwYWJpbGl0aWVzAAAAAAAABgAAAMxXaGV0aGVyIGFuIGFkbWluIGNhbiBmb3JjZS1jbG9zZSB0aGlzIGxpbmUgdmlhIGBjbG9zZV9jcmVkaXRfbGluZWAKdW5jb25kaXRpb25hbGx5IChhbnkgbm9uLWBDbG9zZWRgIHN0YXR1cykuIEZhbHNlIHdoZW4gdGhlIGxpbmUgZG9lcwpub3QgZXhpc3QsIHRoZSBwcm90b2NvbCBpcyBwYXVzZWQsIG9yIHRoZSBzdGF0dXMgaXMgYWxyZWFkeSBgQ2xvc2VkYC4AAAAPY2FuX2Nsb3NlX2FkbWluAAAAAAEAAACSV2hldGhlciB0aGUgYm9ycm93ZXIgY2FuIHNlbGYtY2xvc2UgdmlhIGBjbG9zZV9jcmVkaXRfbGluZWAuIFJlcXVpcmVzCnRoZSBzYW1lIHByZWNvbmRpdGlvbnMgYXMgYGNhbl9jbG9zZV9hZG1pbmAgKipwbHVzKioKYHV0aWxpemVkX2Ftb3VudCA9PSAwYC4AAAAAABJjYW5fY2xvc2VfYm9ycm93ZXIAAAAAAAEAAAC+V2hldGhlciBhbiBhZG1pbiBjYW4gbW92ZSB0aGlzIGxpbmUgdG8gYERlZmF1bHRlZGAgdmlhCmBkZWZhdWx0X2NyZWRpdF9saW5lYC4gVHJ1ZSB3aGVuIHRoZSBsaW5lIGV4aXN0cywgdGhlIHByb3RvY29sIGlzIG5vdApwYXVzZWQsIGFuZCB0aGUgc3RhdHVzIGlzIGBBY3RpdmVgLCBgUmVzdHJpY3RlZGAsIG9yIGBTdXNwZW5kZWRgLgAAAAAAC2Nhbl9kZWZhdWx0AAAAAAEAAACbV2hldGhlciBhbiBhZG1pbiBjYW4gY3VyZSB0aGlzIGxpbmUgdmlhIGByZWluc3RhdGVfY3JlZGl0X2xpbmVgLiBUcnVlCm9ubHkgd2hlbiB0aGUgbGluZSBleGlzdHMsIHRoZSBwcm90b2NvbCBpcyBub3QgcGF1c2VkLCBhbmQgdGhlIHN0YXR1cwppcyBgRGVmYXVsdGVkYC4AAAAADWNhbl9yZWluc3RhdGUAAAAAAAABAAAAh1doZXRoZXIgdGhlIGJvcnJvd2VyIGNhbiBzZWxmLXN1c3BlbmQgdmlhIGBzZWxmX3N1c3BlbmRfY3JlZGl0X2xpbmVgLgpTYW1lIHByZWNvbmRpdGlvbiBhcyBgY2FuX3N1c3BlbmRgIChvbmx5IGBBY3RpdmVgIHNlbGYtc3VzcGVuZHMpLgAAAAAQY2FuX3NlbGZfc3VzcGVuZAAAAAEAAACpV2hldGhlciBhbiBhZG1pbiBjYW4gc3VzcGVuZCB0aGlzIGxpbmUgdmlhIGBzdXNwZW5kX2NyZWRpdF9saW5lYC4KVHJ1ZSBvbmx5IHdoZW4gdGhlIGxpbmUgZXhpc3RzLCB0aGUgcHJvdG9jb2wgaXMgbm90IHBhdXNlZCwgYW5kIHRoZQpzdGF0dXMgaXMgW2BDcmVkaXRTdGF0dXM6OkFjdGl2ZWBdLgAAAAAAAAtjYW5fc3VzcGVuZAAAAAAB",
        "AAAAAQAAAD1FdmVudCBlbWl0dGVkIHdoZW4gdGhlIHJhdGUgZm9ybXVsYSBjb25maWcgaXMgc2V0IG9yIGNsZWFyZWQuAAAAAAAAAAAAABZSYXRlRm9ybXVsYUNvbmZpZ0V2ZW50AAAAAAABAAAAM2B0cnVlYCB3aGVuIGEgY29uZmlnIHdhcyBzZXQ7IGBmYWxzZWAgd2hlbiBjbGVhcmVkLgAAAAAHZW5hYmxlZAAAAAAB",
        "AAAAAQAAAEVDb25maWd1cmF0aW9uIGVtaXR0ZWQgd2hlbiB0aGUgcmlzayBhZG1pbiBjb29sZG93biBpcyBzZXQgb3IgY2hhbmdlZC4AAAAAAAAAAAAAF1Jpc2tBZG1pbkNvb2xkb3duQ29uZmlnAAAAAAEAAAA1TmV3IGNvb2xkb3duIGR1cmF0aW9uIGluIHNlY29uZHMuIGAwYCBtZWFucyBkaXNhYmxlZC4AAAAAAAAQY29vbGRvd25fc2Vjb25kcwAAAAY=",
        "AAAAAQAAAi9BIHBlbmRpbmcgdHJlYXN1cnkgd2l0aGRyYXdhbCBwcm9wb3NhbCBjcmVhdGVkIGJ5IGBwcm9wb3NlX3RyZWFzdXJ5X3dpdGhkcmF3YWxgLgoKRXhhY3RseSBvbmUgcHJvcG9zYWwgY2FuIGV4aXN0IGF0IGEgdGltZS4gSXQgbXVzdCBiZSBleGVjdXRlZCAob3Igc3VwZXJzZWRlZApvbmx5IGFmdGVyIGEgc3VjY2Vzc2Z1bCBgZXhlY3V0ZV90cmVhc3VyeV93aXRoZHJhd2FsYCBjbGVhcnMgaXQpIG5vIHNvb25lcgp0aGFuIDI0IGhvdXJzIGFmdGVyIGl0IHdhcyBwcm9wb3NlZC4KCiMgVGltZWxvY2sKYGV4ZWN1dGVfYWZ0ZXJgIGlzIHNldCB0byBgcHJvcG9zYWxfdHMgKyA4Nl80MDBgICgyNCBob3VycyBpbiBzZWNvbmRzKSBhdApwcm9wb3NhbCB0aW1lLiBUaGUgZXhlY3V0aW9uIGVudHJ5cG9pbnQgcmVqZWN0cyBjYWxscyB3aGVuCmBlbnYubGVkZ2VyKCkudGltZXN0YW1wKCkgPCBleGVjdXRlX2FmdGVyYC4KCiMgU3RvcmFnZQpTdG9yZWQgaW4gaW5zdGFuY2Ugc3RvcmFnZSB1bmRlciBbYGNyYXRlOjpzdG9yYWdlOjpEYXRhS2V5OjpQZW5kaW5nVHJlYXN1cnlXaXRoZHJhd2FsYF0uAAAAAAAAAAAaVHJlYXN1cnlXaXRoZHJhd2FsUHJvcG9zYWwAAAAAAAUAAABEQW1vdW50IHRvIHRyYW5zZmVyIChzbmFwc2hvdCBvZiBgVHJlYXN1cnlCYWxhbmNlYCBhdCBwcm9wb3NhbCB0aW1lKS4AAAAGYW1vdW50AAAAAAALAAAAU0VhcmxpZXN0IGxlZGdlciB0aW1lc3RhbXAgYXQgd2hpY2ggZXhlY3V0aW9uIGlzIHBlcm1pdHRlZCAoYHByb3Bvc2VkX2F0ICsgODZfNDAwYCkuAAAAAA1leGVjdXRlX2FmdGVyAAAAAAAABgAAADNMZWRnZXIgdGltZXN0YW1wIGF0IHdoaWNoIHRoZSBwcm9wb3NhbCB3YXMgY3JlYXRlZC4AAAAAC3Byb3Bvc2VkX2F0AAAAAAYAAAAwQWRkcmVzcyBvZiB0aGUgYWRtaW4gd2hvIHN1Ym1pdHRlZCB0aGUgcHJvcG9zYWwuAAAACHByb3Bvc2VyAAAAEwAAADFUaGUgdHJlYXN1cnkgYWRkcmVzcyB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgZnVuZHMuAAAAAAAACXJlY2lwaWVudAAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAACkRyYXduRXZlbnQAAAAAAAQAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAABNuZXdfdXRpbGl6ZWRfYW1vdW50AAAAAAsAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAADERyYXduRXZlbnRWMgAAAAYAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAABNuZXdfdXRpbGl6ZWRfYW1vdW50AAAAAAsAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAAAAAAADnJlc2VydmVfc291cmNlAAAAAAATAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAADlJlcGF5bWVudEV2ZW50AAAAAAADAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAATbmV3X3V0aWxpemVkX2Ftb3VudAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAAD0NyZWRpdExpbmVFdmVudAAAAAAFAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAADGNyZWRpdF9saW1pdAAAAAsAAAAAAAAAEWludGVyZXN0X3JhdGVfYnBzAAAAAAAABAAAAAAAAAAKcmlza19zY29yZQAAAAAABAAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADENyZWRpdFN0YXR1cw==",
        "AAAAAQAAAAAAAAAAAAAAD0ZlZUFjY3J1ZWRFdmVudAAAAAAGAAAAAAAAAAhib3Jyb3dlcgAAABMAAABAQm91bnR5IHBvb2wgcG9ydGlvbiBvZiBgZmVlX2Ftb3VudGAgY3JlZGl0ZWQgdG8gYEJvdW50eUJhbGFuY2VgLgAAAA1ib3VudHlfYW1vdW50AAAAAAAACwAAAC5Ub3RhbCBwcm90b2NvbCBmZWUgc2tpbW1lZCBmcm9tIHRoZSByZXBheW1lbnQuAAAAAAAKZmVlX2Ftb3VudAAAAAAACwAAAAAAAAASbmV3X2JvdW50eV9iYWxhbmNlAAAAAAALAAAAAAAAABRuZXdfdHJlYXN1cnlfYmFsYW5jZQAAAAsAAAA/VHJlYXN1cnkgcG9ydGlvbiBvZiBgZmVlX2Ftb3VudGAgY3JlZGl0ZWQgdG8gYFRyZWFzdXJ5QmFsYW5jZWAuAAAAAA90cmVhc3VyeV9hbW91bnQAAAAACw==",
        "AAAAAQAAAAAAAAAAAAAAEERyYXdzRnJvemVuRXZlbnQAAAACAAAAAAAAAAZmcm96ZW4AAAAAAAEAAAAAAAAABnJlYXNvbgAAAAAH0AAAAAxGcmVlemVSZWFzb24=",
        "AAAAAQAAADFFdmVudCBlbWl0dGVkIHdoZW4gZGVidCBpcyBmb3JnaXZlbiBieSB0aGUgYWRtaW4uAAAAAAAAAAAAABFEZWJ0Rm9yZ2l2ZW5FdmVudAAAAAAAAAQAAAAAAAAAD2Ftb3VudF9mb3JnaXZlbgAAAAALAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAE25ld191dGlsaXplZF9hbW91bnQAAAAACwAAAAAAAAAacmVtYWluaW5nX2FjY3J1ZWRfaW50ZXJlc3QAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAAEURyYXdSZXZlcnNlZEV2ZW50AAAAAAAACAAAAAAAAAAPYWNjb3VudGluZ19vbmx5AAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAE25ld191dGlsaXplZF9hbW91bnQAAAAACwAAAAAAAAALb3JpZ2luYWxfdHMAAAAABgAAAAAAAAALcmVhc29uX2NvZGUAAAAABAAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAAAQAAAAAAAAAAAAAAEVRva2VuUmVzY3VlZEV2ZW50AAAAAAAAAwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAAE0JvcnJvd2VyRnJvemVuRXZlbnQAAAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAOFRpbWVzdGFtcCAobGVkZ2VyIHNlY29uZHMpIHVudGlsIHdoaWNoIGRyYXdzIGFyZSBmcm96ZW4uAAAADGZyb3plbl91bnRpbAAAAAYAAAA6TGVkZ2VyIHNlcXVlbmNlIGF0IHRpbWUgb2YgY2hhbmdlIChmb3Igb2ZmLWNoYWluIGluZGV4ZXJzKQAAAAAABmxlZGdlcgAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAE0xhdGVGZWVDaGFyZ2VkRXZlbnQAAAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAANmZWUAAAAACwAAAAAAAAARaW5zdGFsbG1lbnRfaW5kZXgAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAAFEJvcnJvd2VyQmxvY2tlZEV2ZW50AAAAAwAAAAAAAAAHYmxvY2tlZAAAAAABAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABmxlZGdlcgAAAAAABA==",
        "AAAAAQAAAEVFdmVudCBlbWl0dGVkIGR1cmluZyBib3Jyb3cgbGlmZWN5Y2xlIGNoYW5nZXMgKGRyYXcsIHJlcGF5LCBmb3JnaXZlKS4AAAAAAAAAAAAAFEJvcnJvd0xpZmVjeWNsZUV2ZW50AAAABwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAxjcmVkaXRfbGltaXQAAAALAAAAAAAAABFpbnRlcmVzdF9yYXRlX2JwcwAAAAAAAAQAAAAAAAAABXBoYXNlAAAAAAAH0AAAABRCb3Jyb3dMaWZlY3ljbGVQaGFzZQAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADENyZWRpdFN0YXR1cwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABgAAAAAAAAAPdXRpbGl6ZWRfYW1vdW50AAAAAAs=",
        "AAAAAgAAABhCb3Jyb3cgbGlmZWN5Y2xlIHBoYXNlcy4AAAAAAAAAFEJvcnJvd0xpZmVjeWNsZVBoYXNlAAAACAAAAAAAAAAAAAAABk9wZW5lZAAAAAAAAAAAAAAAAAAFRHJhd24AAAAAAAAAAAAAAAAAAAZSZXBhaWQAAAAAAAAAAAAAAAAACVN1c3BlbmRlZAAAAAAAAAAAAAAAAAAAClJlaW5zdGF0ZWQAAAAAAAAAAAAAAAAACURlZmF1bHRlZAAAAAAAAAAAAAAAAAAABkNsb3NlZAAAAAAAAAAAAAAAAAAMRGVidEZvcmdpdmVu",
        "AAAAAQAAAAAAAAAAAAAAFEludGVyZXN0QWNjcnVlZEV2ZW50AAAAAwAAAAAAAAAOYWNjcnVlZF9hbW91bnQAAAAAAAsAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAATbmV3X3V0aWxpemVkX2Ftb3VudAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAAFUNvbnRyYWN0VXBncmFkZWRFdmVudAAAAAAAAAIAAAAAAAAADW5ld193YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAANb2xkX3dhc21faGFzaAAAAAAAA+4AAAAg",
        "AAAAAQAAAD9EZWRpY2F0ZWQgbGlmZWN5Y2xlIGV2ZW50IGVtaXR0ZWQgd2hlbiBhIGNyZWRpdCBsaW5lIGlzIGNsb3NlZC4AAAAAAAAAABVDcmVkaXRMaW5lQ2xvc2VkRXZlbnQAAAAAAAAEAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABmNsb3NlcgAAAAAAEwAAAAAAAAAZcmVtYWluaW5nX3V0aWxpemVkX2Ftb3VudAAAAAAAAAsAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAAFUNyZWRpdExpbmVGcmVlemVFdmVudAAAAAAAAAQAAAAAAAAACGJvcnJvd2VyAAAAEwAAACpgdHJ1ZWAgd2hlbiBmcm96ZW47IGBmYWxzZWAgd2hlbiB1bmZyb3plbi4AAAAAAAZmcm96ZW4AAAAAAAEAAAA7TGVkZ2VyIHNlcXVlbmNlIGF0IHRpbWUgb2YgY2hhbmdlIChmb3Igb2ZmLWNoYWluIGluZGV4ZXJzKS4AAAAABmxlZGdlcgAAAAAABAAAAChTdHJ1Y3R1cmVkIHJlYXNvbiBmb3IgdGhlIGZyZWV6ZSBhY3Rpb24uAAAABnJlYXNvbgAAAAAH0AAAAAxGcmVlemVSZWFzb24=",
        "AAAAAQAAAD9EZWRpY2F0ZWQgbGlmZWN5Y2xlIGV2ZW50IGVtaXR0ZWQgd2hlbiBhIGNyZWRpdCBsaW5lIGlzIG9wZW5lZC4AAAAAAAAAABVDcmVkaXRMaW5lT3BlbmVkRXZlbnQAAAAAAAAFAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAADGNyZWRpdF9saW1pdAAAAAsAAAAAAAAAEWludGVyZXN0X3JhdGVfYnBzAAAAAAAABAAAAAAAAAAKcmlza19zY29yZQAAAAAABAAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAAAQAAAAAAAAAAAAAAFlBlbmFsdHlSYXRlRXhpdGVkRXZlbnQAAAAAAAMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAMbmV3X3JhdGVfYnBzAAAABAAAAAAAAAARcHJldmlvdXNfcmF0ZV9icHMAAAAAAAAE",
        "AAAAAQAAAAAAAAAAAAAAF0dyYWNlV2FpdmVyQXBwbGllZEV2ZW50AAAAAAMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAEbW9kZQAAB9AAAAAPR3JhY2VXYWl2ZXJNb2RlAAAAAAAAAAANd2FpdmVkX2Ftb3VudAAAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAAF1BlbmFsdHlSYXRlRW50ZXJlZEV2ZW50AAAAAAQAAAAAAAAADWJhc2VfcmF0ZV9icHMAAAAAAAAEAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAAEmVmZmVjdGl2ZV9yYXRlX2JwcwAAAAAABAAAAAAAAAAVcGVuYWx0eV9zdXJjaGFyZ2VfYnBzAAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAGENvbGxhdGVyYWxEZXBvc2l0ZWRFdmVudAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAtuZXdfYmFsYW5jZQAAAAAL",
        "AAAAAQAAAy5TdHJ1Y3R1cmVkLCB1bmlmaWVkIGxpZmVjeWNsZSBldmVudCBjb3ZlcmluZyBldmVyeSBjb2xsYXRlcmFsIHN0YXRlCmNoYW5nZSAoZGVwb3NpdCwgd2l0aGRyYXdhbCwgcGFydGlhbCByZWxlYXNlLCBpbnRlcm5hbCByZWxlYXNlKS4KCkVtaXR0ZWQgKippbiBhZGRpdGlvbiB0byoqIHRoZSBsZWdhY3kgcGVyLWFjdGlvbiBldmVudHMKKFtgQ29sbGF0ZXJhbERlcG9zaXRlZEV2ZW50YF0sIFtgQ29sbGF0ZXJhbFdpdGhkcmF3bkV2ZW50YF0sCltgQ29sbGF0ZXJhbFBhcnRpYWxSZWxlYXNlZEV2ZW50YF0pIHNvIGV4aXN0aW5nIGluZGV4ZXJzIGtlZXAgd29ya2luZwp1bm1vZGlmaWVkLCB3aGlsZSBuZXcgaW50ZWdyYXRvcnMgY2FuIHN1YnNjcmliZSB0byBhIHNpbmdsZSB0b3BpYwooYCgiY3JlZGl0IiwgImNvbF9sY2EiKWApIGFuZCBkaXNhbWJpZ3VhdGUgdmlhIFtgY3JhdGU6OnR5cGVzOjpDb2xsYXRlcmFsRXZlbnRLaW5kYF0KaW5zdGVhZCBvZiB0cmFja2luZyBtdWx0aXBsZSB0b3BpYyBzdHJpbmdzLgoKIyBGaWVsZCBub3RlcwoKLSBgdG9rZW5gIGlzIGBOb25lYCBmb3IgdGhlIHNpbmdsZS10b2tlbiBjb2xsYXRlcmFsIHBhdGggKGBDb2xsYXRlcmFsQmFsYW5jZWAKc3RvcmFnZSkgYW5kIGBTb21lKHRva2VuKWAgZm9yIHRoZSBtdWx0aS1jb2xsYXRlcmFsLCBwZXItdG9rZW4gcGF0aC4KLSBgbGVkZ2VyYCAvIGB0aW1lc3RhbXBgIGxldCBvZmYtY2hhaW4gY29uc3VtZXJzIG9yZGVyIGFuZCBjb3JyZWxhdGUKZXZlbnRzIHdpdGhvdXQgYSBzZXBhcmF0ZSBSUEMgcm91bmQtdHJpcCB0byBmZXRjaCBsZWRnZXIgbWV0YWRhdGEuAAAAAAAAAAAAGENvbGxhdGVyYWxMaWZlY3ljbGVFdmVudAAAAAcAAAAuQW1vdW50IG1vdmVkIGJ5IHRoaXMgYWN0aW9uIChhbHdheXMgcG9zaXRpdmUpLgAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAARraW5kAAAH0AAAABNDb2xsYXRlcmFsRXZlbnRLaW5kAAAAAD9MZWRnZXIgc2VxdWVuY2UgYXQgdGltZSBvZiB0aGUgYWN0aW9uIChmb3Igb2ZmLWNoYWluIGluZGV4ZXJzKS4AAAAABmxlZGdlcgAAAAAABAAAAC9Db2xsYXRlcmFsIGJhbGFuY2UgcmVtYWluaW5nIGFmdGVyIHRoaXMgYWN0aW9uLgAAAAALbmV3X2JhbGFuY2UAAAAACwAAACdMZWRnZXIgdGltZXN0YW1wIGF0IHRpbWUgb2YgdGhlIGFjdGlvbi4AAAAACXRpbWVzdGFtcAAAAAAAAAYAAABmYE5vbmVgIGZvciB0aGUgc2luZ2xlLXRva2VuIGNvbGxhdGVyYWwgYmFsYW5jZTsgYFNvbWUodG9rZW4pYCBmb3IKdGhlIG11bHRpLWNvbGxhdGVyYWwgcGVyLXRva2VuIHBhdGguAAAAAAAFdG9rZW4AAAAAAAPoAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAGENvbGxhdGVyYWxXaXRoZHJhd25FdmVudAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAtuZXdfYmFsYW5jZQAAAAAL",
        "AAAAAQAAAEJEZWRpY2F0ZWQgbGlmZWN5Y2xlIGV2ZW50IGVtaXR0ZWQgd2hlbiBhIGNyZWRpdCBsaW5lIGlzIGRlZmF1bHRlZC4AAAAAAAAAAAAYQ3JlZGl0TGluZURlZmF1bHRlZEV2ZW50AAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAA91dGlsaXplZF9hbW91bnQAAAAACw==",
        "AAAAAQAAAEJEZWRpY2F0ZWQgbGlmZWN5Y2xlIGV2ZW50IGVtaXR0ZWQgd2hlbiBhIGNyZWRpdCBsaW5lIGlzIHN1c3BlbmRlZC4AAAAAAAAAAAAYQ3JlZGl0TGluZVN1c3BlbmRlZEV2ZW50AAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAZyZWFzb24AAAAAABEAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAENEZWRpY2F0ZWQgbGlmZWN5Y2xlIGV2ZW50IGVtaXR0ZWQgd2hlbiBhIGNyZWRpdCBsaW5lIGlzIHJlaW5zdGF0ZWQuAAAAAAAAAAAZQ3JlZGl0TGluZVJlaW5zdGF0ZWRFdmVudAAAAAAAAAMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAANdGFyZ2V0X3N0YXR1cwAAAAAAB9AAAAAMQ3JlZGl0U3RhdHVzAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAAGkFkbWluUm90YXRpb25BY2NlcHRlZEV2ZW50AAAAAAABAAAAAAAAAAluZXdfYWRtaW4AAAAAAAAT",
        "AAAAAQAAAAAAAAAAAAAAGkFkbWluUm90YXRpb25Qcm9wb3NlZEV2ZW50AAAAAAACAAAAAAAAAAxhY2NlcHRfYWZ0ZXIAAAAGAAAAAAAAAA5wcm9wb3NlZF9hZG1pbgAAAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAGlJpc2tQYXJhbWV0ZXJzVXBkYXRlZEV2ZW50AAAAAAAEAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAADGNyZWRpdF9saW1pdAAAAAsAAAAAAAAAEWludGVyZXN0X3JhdGVfYnBzAAAAAAAABAAAAAAAAAAKcmlza19zY29yZQAAAAAABA==",
        "AAAAAQAAAE1QYXlsb2FkIGVtaXR0ZWQgd2hlbiBhbiBhZG1pbiBjb21taXRzIGEgbmV3IGF0dGVzdGF0aW9uIGJhdGNoIGZvciBhIGJvcnJvd2VyLgAAAAAAAAAAAAAeQXR0ZXN0YXRpb25CYXRjaENvbW1pdHRlZEV2ZW50AAAAAAADAAAALUJvcnJvd2VyIHdob3NlIGF0dGVzdGF0aW9uIGJhdGNoIHdhcyB1cGRhdGVkLgAAAAAAAAhib3Jyb3dlcgAAABMAAAAuTnVtYmVyIG9mIGxlYXZlcyBpbiB0aGUgYmF0Y2ggKGluZm9ybWF0aW9uYWwpLgAAAAAABWNvdW50AAAAAAAABAAAAD5TSEEtMjU2IE1lcmtsZSByb290IG9mIGFsbCBsZWFmIGhhc2hlcyBpbiB0aGUgY29tbWl0dGVkIGJhdGNoLgAAAAAAC21lcmtsZV9yb290AAAAA+4AAAAg",
        "AAAAAQAAAQBFdmVudCBlbWl0dGVkIGJ5IFtgY3JhdGU6OmNvbGxhdGVyYWw6OnBhcnRpYWxfcmVsZWFzZV9jb2xsYXRlcmFsYF0uCgpEaXN0aW5jdCBmcm9tIFtgQ29sbGF0ZXJhbFdpdGhkcmF3bkV2ZW50YF0gc28gaW5kZXhlcnMgY2FuIGRpc3Rpbmd1aXNoIGEKYm9ycm93ZXItaW5pdGlhdGVkIHBhcnRpYWwgcmVsZWFzZSAoaGVhbHRoLWZhY3RvciBnYXRlZCkgZnJvbSBhIGdlbmVyaWMKd2l0aGRyYXdhbCBvciBhbiBhdG9taWMgcmVwYXktYW5kLXJlbGVhc2UuAAAAAAAAAB5Db2xsYXRlcmFsUGFydGlhbFJlbGVhc2VkRXZlbnQAAAAAAAQAAAAmVG9rZW4gYW1vdW50IHJldHVybmVkIHRvIHRoZSBib3Jyb3dlci4AAAAAAA9hbW91bnRfcmVsZWFzZWQAAAAACwAAADZCb3Jyb3dlciB3aG9zZSBjb2xsYXRlcmFsIGlzIGJlaW5nIHBhcnRpYWxseSByZWxlYXNlZC4AAAAAAAhib3Jyb3dlcgAAABMAAACISGVhbHRoIGZhY3RvciAoY29sbGF0ZXJhbCAqIDEwXzAwMCAvIHV0aWxpemVkKSBhZnRlciB0aGUgcmVsZWFzZS4KYHUzMjo6TUFYYCB3aGVuIGB1dGlsaXplZF9hbW91bnQgPT0gMGAgKGZ1bGx5IHJlcGFpZCAvIHVuY29uc3RyYWluZWQpLgAAABFoZWFsdGhfZmFjdG9yX2JwcwAAAAAAAAQAAAA/Q29sbGF0ZXJhbCBiYWxhbmNlIHJlbWFpbmluZyBpbiB0aGUgY29udHJhY3QgYWZ0ZXIgdGhlIHJlbGVhc2UuAAAAAAtuZXdfYmFsYW5jZQAAAAAL",
        "AAAAAQAAAAAAAAAAAAAAHkRlZmF1bHRMaXF1aWRhdGlvblNldHRsZWRFdmVudAAAAAAABgAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAABBjbG9zZV9mYWN0b3JfYnBzAAAABAAAAAAAAAAQcmVjb3ZlcmVkX2Ftb3VudAAAAAsAAAAAAAAAGXJlbWFpbmluZ191dGlsaXplZF9hbW91bnQAAAAAAAALAAAAAAAAAA1zZXR0bGVtZW50X2lkAAAAAAAAEQAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADENyZWRpdFN0YXR1cw==",
        "AAAAAQAAAFFFbWl0dGVkIHdoZW4gYSB0cmVhc3VyeSB3aXRoZHJhd2FsIGlzIGV4ZWN1dGVkIHZpYSBgZXhlY3V0ZV90cmVhc3VyeV93aXRoZHJhd2FsYC4AAAAAAAAAAAAAH1RyZWFzdXJ5V2l0aGRyYXdhbEV4ZWN1dGVkRXZlbnQAAAAABAAAABNBbW91bnQgdHJhbnNmZXJyZWQuAAAAAAZhbW91bnQAAAAAAAsAAAAeTGVkZ2VyIHRpbWVzdGFtcCBhdCBleGVjdXRpb24uAAAAAAALZXhlY3V0ZWRfYXQAAAAABgAAACJBZG1pbiB3aG8gZXhlY3V0ZWQgdGhlIHdpdGhkcmF3YWwuAAAAAAAIZXhlY3V0b3IAAAATAAAAG1RyZWFzdXJ5IHJlY2lwaWVudCBhZGRyZXNzLgAAAAAJcmVjaXBpZW50AAAAAAAAEw==",
        "AAAAAQAAAFFFbWl0dGVkIHdoZW4gYSB0cmVhc3VyeSB3aXRoZHJhd2FsIGlzIHByb3Bvc2VkIHZpYSBgcHJvcG9zZV90cmVhc3VyeV93aXRoZHJhd2FsYC4AAAAAAAAAAAAAH1RyZWFzdXJ5V2l0aGRyYXdhbFByb3Bvc2VkRXZlbnQAAAAABQAAADJTbmFwc2hvdCBvZiB0aGUgdHJlYXN1cnkgYmFsYW5jZSBhdCBwcm9wb3NhbCB0aW1lLgAAAAAABmFtb3VudAAAAAAACwAAAEpFYXJsaWVzdCB0aW1lc3RhbXAgYXQgd2hpY2ggZXhlY3V0aW9uIGlzIHBlcm1pdHRlZCAocHJvcG9zZWRfYXQgKyA4Nl80MDApLgAAAAAADWV4ZWN1dGVfYWZ0ZXIAAAAAAAAGAAAAL0xlZGdlciB0aW1lc3RhbXAgd2hlbiB0aGUgcHJvcG9zYWwgd2FzIGNyZWF0ZWQuAAAAAAtwcm9wb3NlZF9hdAAAAAAGAAAAIUFkbWluIHdobyBzdWJtaXR0ZWQgdGhlIHByb3Bvc2FsLgAAAAAAAAhwcm9wb3NlcgAAABMAAAAbVHJlYXN1cnkgcmVjaXBpZW50IGFkZHJlc3MuAAAAAAlyZWNpcGllbnQAAAAAAAAT",
        "AAAAAQAAADtQYXlsb2FkIGVtaXR0ZWQgd2hlbiB0aGUgcmlzayBhZG1pbiBjb29sZG93biBpcyBjb25maWd1cmVkLgAAAAAAAAAAIFJpc2tBZG1pbkNvb2xkb3duQ29uZmlndXJlZEV2ZW50AAAAAQAAADVOZXcgY29vbGRvd24gZHVyYXRpb24gaW4gc2Vjb25kcy4gYDBgIG1lYW5zIGRpc2FibGVkLgAAAAAAABBjb29sZG93bl9zZWNvbmRzAAAABg==",
        "AAAAAQAAAAAAAAAAAAAADFJlcG9ydFdlaWdodAAAAAIAAAAAAAAABXZhbHVlAAAAAAAACgAAAAAAAAAGd2VpZ2h0AAAAAAAE",
        "AAAAAgAAAAAAAAAAAAAADU9yYWNsZURhdGFLZXkAAAAAAAAFAAAAAAAAAAAAAAAKT3JhY2xlTGlzdAAAAAAAAQAAAAAAAAAMT3JhY2xlV2VpZ2h0AAAAAQAAABMAAAABAAAAAAAAAAxPcmFjbGVSZXBvcnQAAAABAAAAEwAAAAAAAAAAAAAAD1F1b3J1bVRocmVzaG9sZAAAAAAAAAAAAAAAAA9SZXBvcnRpbmdXaW5kb3cA",
        "AAAAAQAAAAAAAAAAAAAAEE9yYWNsZVJlcG9ydERhdGEAAAACAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAV2YWx1ZQAAAAAAAAo=",
        "AAAAAQAAAChWUkYgY29tbWl0bWVudCBkYXRhIHN0b3JlZCBwZXIgYm9ycm93ZXIuAAAAAAAAAA1WcmZDb21taXRtZW50AAAAAAAAAgAAACRIYXNoIG9mIHRoZSBWUkYgb3V0cHV0IChjb21taXRtZW50KS4AAAAPY29tbWl0bWVudF9oYXNoAAAAA+4AAAAgAAAALkxlZGdlciB0aW1lc3RhbXAgd2hlbiB0aGUgY29tbWl0bWVudCB3YXMgbWFkZS4AAAAAAAxjb21taXR0ZWRfYXQAAAAG",
        "AAAAAQAAAFNLZXkgcGF5bG9hZCBmb3IgcGVyLWJvcnJvd2VyIHBlci10aW1lc3RhbXAgZHJhdyBhdWRpdCBhbmQgcmV2ZXJzYWwgc3RvcmFnZSBlbnRyaWVzLgAAAAAAAAAADERyYXdBdWRpdEtleQAAAAIAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAAAQAAAIRDb21wb3NpdGUga2V5IGZvciBwZXItYm9ycm93ZXIgcGVyLXRva2VuIGNvbGxhdGVyYWwgYmFsYW5jZSBlbnRyaWVzICh2MikuCldyYXBzIGAoYm9ycm93ZXIsIHRva2VuKWAgZm9yIHVzZSBhcyBhIHNpbmdsZSBzdG9yYWdlIGtleS4AAAAAAAAAFkNvbGxhdGVyYWxCYWxhbmNlVjJLZXkAAAAAAAIAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAAT",
        "AAAAAQAAAAAAAAAAAAAAD1Byb3RvY29sVmVyc2lvbgAAAAACAAAAAAAAAAVtYWpvcgAAAAAAAAQAAAAAAAAABW1pbm9yAAAAAAAABA==",
        "AAAAAQAAAMBQYXlsb2FkIGZvciB0aGUgW2BMYXRlRmVlQ29uZmlnOjpBcHJCYXNlZGBdIHZhcmlhbnQuCgpXcmFwcyB0aGUgQVBSIHN1cmNoYXJnZSBpbiBiYXNpcyBwb2ludHMgc28gdGhlIGAjW2NvbnRyYWN0dHlwZV1gIG1hY3JvIG9uCltgTGF0ZUZlZUNvbmZpZ2BdIGNhbiBzZXJpYWxpemUgdGhlIGVudW0gYXMgYW4gWERSIHRhZ2dlZCB1bmlvbi4AAAAAAAAADEFwckZlZUNvbmZpZwAAAAEAAABeRXh0cmEgYmFzaXMgcG9pbnRzIGFkZGVkIHRvIHRoZSBiYXNlIGludGVyZXN0IHJhdGUgd2hpbGUgZGVsaW5xdWVudC4KCk11c3QgYmUgaW4gYDAuLj0xMF8wMDBgLgAAAAAADXN1cmNoYXJnZV9icHMAAAAAAAAE",
        "AAAAAQAAALRQYXlsb2FkIGZvciB0aGUgW2BMYXRlRmVlQ29uZmlnOjpGbGF0YF0gdmFyaWFudC4KCldyYXBzIHRoZSBmbGF0IHN1cmNoYXJnZSBhbW91bnQgc28gdGhlIGAjW2NvbnRyYWN0dHlwZV1gIG1hY3JvIG9uCltgTGF0ZUZlZUNvbmZpZ2BdIGNhbiBzZXJpYWxpemUgdGhlIGVudW0gYXMgYW4gWERSIHRhZ2dlZCB1bmlvbi4AAAAAAAAADUZsYXRGZWVDb25maWcAAAAAAAABAAAAYVRva2VuIHVuaXRzIGNoYXJnZWQgb25jZSBwZXIgb3ZlcmR1ZSBpbnN0YWxsbWVudC4KCk11c3QgYmUgYD49IDBgLiBaZXJvIGRpc2FibGVzIHRoZSBmZWUgKG5vLW9wKS4AAAAAAAAGYW1vdW50AAAAAAAL",
        "AAAAAgAAA4dDb25maWd1cmF0aW9uIGZvciB0aGUgbGF0ZS1mZWUgcGVuYWx0eSBhcHBsaWVkIHRvIG92ZXJkdWUgaW5zdGFsbG1lbnRzLgoKIyBWYXJpYW50cwoKfCBWYXJpYW50ICAgIHwgQmVoYXZpb3VyIHwKfC0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLXwKfCBgRmxhdGAgICAgIHwgQSBmaXhlZCBgYW1vdW50YCBpbiB0b2tlbiB1bml0cyBpcyBhcHBsaWVkIG9uY2UgcGVyIG1pc3NlZCBpbnN0YWxsbWVudC4gfAp8IGBBcHJCYXNlZGAgfCBBbiBhZGRpdGl2ZSBiYXNpcy1wb2ludCBzdXJjaGFyZ2Ugb24gdGhlIHBlcmlvZGljIGludGVyZXN0IHJhdGUgd2hpbGUgdGhlIGxpbmUgaXMgZGVsaW5xdWVudC4gfAoKIyBTdG9yYWdlCgpTdG9yZWQgaW4gaW5zdGFuY2Ugc3RvcmFnZSB1bmRlciBbYGNyYXRlOjpzdG9yYWdlOjpEYXRhS2V5OjpMYXRlRmVlQ29uZmlnYF0uCkFkbWluLWNvbmZpZ3VyYWJsZSB2aWEgYHNldF9sYXRlX2ZlZV9jb25maWdgIC8gYGdldF9sYXRlX2ZlZV9jb25maWdgIG9uIHRoZQpjb250cmFjdC4gIFdoZW4gdGhlIGtleSBpcyBhYnNlbnQgdGhlIGNvbnRyYWN0IGZhbGxzIGJhY2sgdG8gdGhlIGxlZ2FjeQpgTGF0ZUZlZUZsYXRgIGFuZCBgUGVuYWx0eVN1cmNoYXJnZUJwc2AgaW5zdGFuY2Uga2V5cy4KCiMgRXhhbXBsZXMKCmBgYGlnbm9yZQovLyBGbGF0OiBjaGFyZ2UgNTAgdG9rZW5zIHBlciBtaXNzZWQgaW5zdGFsbG1lbnQKbGV0IGNmZyA9IExhdGVGZWVDb25maWc6OkZsYXQoRmxhdEZlZUNvbmZpZyB7IGFtb3VudDogNTAgfSk7CgovLyBBUFItYmFzZWQ6IGFkZCAyMDAgYnBzIHRvIHRoZSBpbnRlcmVzdCByYXRlIHdoZW4gZGVsaW5xdWVudApsZXQgY2ZnID0gTGF0ZUZlZUNvbmZpZzo6QXByQmFzZWQoQXByRmVlQ29uZmlnIHsgc3VyY2hhcmdlX2JwczogMjAwIH0pOwpgYGAAAAAAAAAAAA1MYXRlRmVlQ29uZmlnAAAAAAAAAgAAAAEAAAB+Rml4ZWQgZmxhdCBhbW91bnQgY2hhcmdlZCBvbmNlIHBlciBvdmVyZHVlIGluc3RhbGxtZW50LgoKVXNlIFtgRmxhdEZlZUNvbmZpZ2BdIHRvIHN1cHBseSB0aGUgYGFtb3VudGAuICBaZXJvIGRpc2FibGVzIHRoZSBmZWUuAAAAAAAERmxhdAAAAAEAAAfQAAAADUZsYXRGZWVDb25maWcAAAAAAAABAAAAqUFkZGl0aXZlIEFQUiBzdXJjaGFyZ2UgYXBwbGllZCB0byBkZWxpbnF1ZW50IGxpbmVzIGR1cmluZyBhY2NydWFsLgoKVGhpcyBwcmVzZXJ2ZXMgdGhlIGV4aXN0aW5nIGBQZW5hbHR5U3VyY2hhcmdlQnBzYCBiZWhhdmlvdXIuCmBzdXJjaGFyZ2VfYnBzYCBtdXN0IGJlIGluIGAwLi49MTBfMDAwYC4AAAAAAAAIQXByQmFzZWQAAAABAAAH0AAAAAxBcHJGZWVDb25maWc=" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        add_oracle: this.txFromJSON<null>,
        get_bounty: this.txFromJSON<Option<string>>,
        set_bounty: this.txFromJSON<null>,
        draw_credit: this.txFromJSON<null>,
        get_version: this.txFromJSON<readonly [u32, u32, u32]>,
        accept_admin: this.txFromJSON<null>,
        accrue_batch: this.txFromJSON<null>,
        forgive_debt: this.txFromJSON<null>,
        freeze_draws: this.txFromJSON<null>,
        get_treasury: this.txFromJSON<Option<string>>,
        repay_credit: this.txFromJSON<null>,
        report_value: this.txFromJSON<null>,
        reverse_draw: this.txFromJSON<null>,
        set_treasury: this.txFromJSON<null>,
        is_delinquent: this.txFromJSON<boolean>,
        propose_admin: this.txFromJSON<null>,
        remove_oracle: this.txFromJSON<null>,
        block_borrower: this.txFromJSON<null>,
        get_collateral: this.txFromJSON<i128>,
        unfreeze_draws: this.txFromJSON<null>,
        get_credit_line: this.txFromJSON<Option<CreditLineData>>,
        is_draws_frozen: this.txFromJSON<boolean>,
        withdraw_bounty: this.txFromJSON<null>,
        get_median_value: this.txFromJSON<Result<u128>>,
        open_credit_line: this.txFromJSON<null>,
        unblock_borrower: this.txFromJSON<null>,
        close_credit_line: this.txFromJSON<null>,
        commit_vrf_output: this.txFromJSON<null>,
        get_health_factor: this.txFromJSON<u32>,
        get_late_fee_flat: this.txFromJSON<i128>,
        get_oracle_config: this.txFromJSON<Option<OracleConfig>>,
        set_late_fee_flat: this.txFromJSON<null>,
        set_oracle_config: this.txFromJSON<null>,
        unfreeze_borrower: this.txFromJSON<null>,
        withdraw_treasury: this.txFromJSON<null>,
        deposit_collateral: this.txFromJSON<null>,
        freeze_credit_line: this.txFromJSON<null>,
        get_schema_version: this.txFromJSON<Option<u32>>,
        get_total_utilized: this.txFromJSON<i128>,
        get_vrf_commitment: this.txFromJSON<Option<VrfCommitment>>,
        is_borrower_frozen: this.txFromJSON<boolean>,
        is_protocol_paused: this.txFromJSON<boolean>,
        borrow_capabilities: this.txFromJSON<BorrowCapabilities>,
        default_credit_line: this.txFromJSON<null>,
        get_late_fee_config: this.txFromJSON<Option<LateFeeConfig>>,
        get_max_draw_amount: this.txFromJSON<Option<i128>>,
        get_protocol_config: this.txFromJSON<ProtocolConfig>,
        get_utilization_cap: this.txFromJSON<Option<u32>>,
        is_borrower_blocked: this.txFromJSON<boolean>,
        set_late_fee_config: this.txFromJSON<null>,
        set_liquidity_token: this.txFromJSON<null>,
        set_max_draw_amount: this.txFromJSON<null>,
        set_protocol_paused: this.txFromJSON<null>,
        set_utilization_cap: this.txFromJSON<null>,
        suspend_credit_line: this.txFromJSON<null>,
        withdraw_collateral: this.txFromJSON<null>,
        bulk_block_borrowers: this.txFromJSON<null>,
        clear_vrf_commitment: this.txFromJSON<null>,
        get_auction_contract: this.txFromJSON<Option<string>>,
        get_close_factor_bps: this.txFromJSON<u32>,
        get_contract_version: this.txFromJSON<readonly [u32, u32, u32]>,
        get_liquidity_source: this.txFromJSON<string>,
        get_max_repay_amount: this.txFromJSON<Option<i128>>,
        get_proof_of_reserve: this.txFromJSON<ProofOfReserve>,
        get_protocol_fee_bps: this.txFromJSON<Option<u32>>,
        get_protocol_summary: this.txFromJSON<ProtocolSummary>,
        set_auction_contract: this.txFromJSON<null>,
        set_close_factor_bps: this.txFromJSON<null>,
        set_liquidity_source: this.txFromJSON<null>,
        set_max_repay_amount: this.txFromJSON<null>,
        set_protocol_fee_bps: this.txFromJSON<null>,
        set_quorum_threshold: this.txFromJSON<null>,
        set_reporting_window: this.txFromJSON<null>,
        submit_oracle_prices: this.txFromJSON<null>,
        unfreeze_credit_line: this.txFromJSON<null>,
        freeze_borrower_until: this.txFromJSON<null>,
        get_attestation_batch: this.txFromJSON<Option<AttestationBatch>>,
        get_collateral_tokens: this.txFromJSON<Array<string>>,
        get_credit_line_count: this.txFromJSON<u32>,
        get_draw_min_interval: this.txFromJSON<Option<u64>>,
        is_credit_line_frozen: this.txFromJSON<boolean>,
        reinstate_credit_line: this.txFromJSON<null>,
        set_draw_min_interval: this.txFromJSON<null>,
        enumerate_credit_lines: this.txFromJSON<Array<readonly [u32, CreditLineData]>>,
        get_borrower_liq_grace: this.txFromJSON<u64>,
        get_max_total_exposure: this.txFromJSON<Option<i128>>,
        get_rate_change_limits: this.txFromJSON<Option<RateChangeConfig>>,
        get_repayment_schedule: this.txFromJSON<Option<RepaymentSchedule>>,
        lifecycle_capabilities: this.txFromJSON<LifecycleCapabilities>,
        set_borrower_liq_grace: this.txFromJSON<null>,
        set_max_total_exposure: this.txFromJSON<null>,
        set_rate_change_limits: this.txFromJSON<null>,
        set_repayment_schedule: this.txFromJSON<null>,
        update_risk_parameters: this.txFromJSON<null>,
        clear_attestation_batch: this.txFromJSON<null>,
        get_borrower_rate_floor: this.txFromJSON<Option<u32>>,
        get_credit_limit_bounds: this.txFromJSON<readonly [Option<i128>, Option<i128>]>,
        get_credit_line_summary: this.txFromJSON<Option<CreditLineData>>,
        get_draws_freeze_reason: this.txFromJSON<Option<FreezeReason>>,
        get_grace_period_config: this.txFromJSON<Option<GracePeriodConfig>>,
        get_rate_formula_config: this.txFromJSON<Option<RateFormulaConfig>>,
        get_risk_admin_cooldown: this.txFromJSON<u64>,
        set_borrower_rate_floor: this.txFromJSON<null>,
        set_credit_limit_bounds: this.txFromJSON<null>,
        set_grace_period_config: this.txFromJSON<null>,
        set_rate_formula_config: this.txFromJSON<null>,
        set_risk_admin_cooldown: this.txFromJSON<null>,
        close_credit_lines_batch: this.txFromJSON<null>,
        commit_attestation_batch: this.txFromJSON<null>,
        deposit_collateral_token: this.txFromJSON<null>,
        get_collateral_for_token: this.txFromJSON<i128>,
        get_oracle_quorum_config: this.txFromJSON<Option<OracleQuorumConfig>>,
        self_suspend_credit_line: this.txFromJSON<null>,
        set_oracle_quorum_config: this.txFromJSON<null>,
        verify_attestation_proof: this.txFromJSON<boolean>,
        clear_rate_formula_config: this.txFromJSON<null>,
        get_borrower_frozen_until: this.txFromJSON<Option<u64>>,
        get_borrower_rate_ceiling: this.txFromJSON<Option<u32>>,
        get_borrow_admin_cooldown: this.txFromJSON<Option<u64>>,
        get_penalty_surcharge_bps: this.txFromJSON<u32>,
        get_protocol_pause_reason: this.txFromJSON<Option<PauseReason>>,
        get_protocol_summary_view: this.txFromJSON<ProtocolSummaryView>,
        set_borrower_rate_ceiling: this.txFromJSON<null>,
        set_borrow_admin_cooldown: this.txFromJSON<null>,
        set_penalty_surcharge_bps: this.txFromJSON<null>,
        withdraw_collateral_token: this.txFromJSON<null>,
        get_accrual_admin_cooldown: this.txFromJSON<Option<u64>>,
        get_credit_lines_paginated: this.txFromJSON<CreditLinesPage>,
        get_treasury_fee_share_bps: this.txFromJSON<Option<u32>>,
        partial_release_collateral: this.txFromJSON<null>,
        settle_default_liquidation: this.txFromJSON<null>,
        set_accrual_admin_cooldown: this.txFromJSON<null>,
        set_collateral_risk_weight: this.txFromJSON<null>,
        set_treasury_fee_share_bps: this.txFromJSON<null>,
        get_col_admin_cooldown_secs: this.txFromJSON<Option<u64>>,
        set_col_admin_cooldown_secs: this.txFromJSON<null>,
        get_last_col_admin_action_ts: this.txFromJSON<Option<u64>>,
        get_min_collateral_ratio_bps: this.txFromJSON<Option<u32>>,
        set_min_collateral_ratio_bps: this.txFromJSON<null>,
        get_credit_line_freeze_reason: this.txFromJSON<Option<FreezeReason>>,
        set_collateral_token_allowlist: this.txFromJSON<null>,
        set_protocol_paused_with_reason: this.txFromJSON<null>
  }
}