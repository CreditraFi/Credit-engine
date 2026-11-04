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




export type SettlementKey = {tag: "Closed", values: readonly [string]} | {tag: "LiquidationSettled", values: readonly [string]};


export interface Bid {
  amount: i128;
  bidder: string;
  timestamp: u64;
}

export type DataKey = {tag: "Status", values: void} | {tag: "HighestBidder", values: void} | {tag: "FactoryContract", values: void} | {tag: "EndTime", values: void} | {tag: "HighestBid", values: void} | {tag: "LiquidationGraceWindow", values: void};

export type AuctionKey = {tag: "Seller", values: readonly [u32]} | {tag: "Asset", values: readonly [u32]} | {tag: "MinBid", values: readonly [u32]} | {tag: "EndTime", values: readonly [u32]} | {tag: "HighestBidder", values: readonly [u32]} | {tag: "HighestBid", values: readonly [u32]} | {tag: "Status", values: readonly [u32]} | {tag: "Claimed", values: readonly [u32]};

export type AuctionMode = {tag: "English", values: void} | {tag: "Dutch", values: void};


export interface AuctionState {
  config: AuctionConfig;
  highest_bid: i128;
  highest_bidder: Option<string>;
  status: AuctionStatus;
}


export interface AuctionConfig {
  /**
 * Dutch decay shape. `DutchAuctionDecay::None` means linear (default).
 */
dutch_decay: DutchAuctionDecay;
  /**
 * Floor price for Dutch auction (only used in Dutch mode).
 */
dutch_floor_price: Option<i128>;
  /**
 * Starting price for Dutch auction (only used in Dutch mode).
 */
dutch_start_price: Option<i128>;
  /**
 * Number of equal time buckets used by [`DutchAuctionDecay::Stepped`].
 * Required for stepped Dutch auctions; ignored for all other decay kinds.
 */
dutch_step_count: Option<u32>;
  end_time: u64;
  min_bid: i128;
  /**
 * Minimum outbid increment expressed in basis points (1 bps = 0.01%).
 * Each new bid must be at least `highest * (1 + min_increment_bps / 10_000)`.
 * Capped at 10_000 (100%) on init. Use 0 to require only a 1-stroop increment.
 */
min_increment_bps: u32;
  mode: AuctionMode;
  start_time: u64;
  username_hash: Buffer;
}

export type AuctionStatus = {tag: "Open", values: void} | {tag: "Closed", values: void} | {tag: "Claimed", values: void};

export type DutchAuctionDecay = {tag: "None", values: void} | {tag: "Linear", values: void} | {tag: "Stepped", values: void} | {tag: "Exponential", values: void};

export const AuctionError = {
  /**
   * Caller is not the winning bidder for the auction being claimed.
   */
  1: {message:"NotWinner"},
  /**
   * The winning bidder has already claimed the auction proceeds.
   */
  2: {message:"AlreadyClaimed"},
  /**
   * Operation requires the auction to be in the `Closed` state.
   */
  3: {message:"NotClosed"},
  /**
   * The credit / factory contract address has not been configured.
   */
  4: {message:"NoFactoryContract"},
  /**
   * Caller is not authorized to perform this admin-only operation.
   */
  5: {message:"Unauthorized"},
  /**
   * Auction is in a state incompatible with the requested operation.
   */
  6: {message:"InvalidState"},
  /**
   * Submitted bid does not meet the minimum next-bid threshold.
   */
  7: {message:"BidTooLow"},
  /**
   * Operation requires the auction to be in the `Open` state.
   */
  8: {message:"AuctionNotOpen"},
  /**
   * Operation requires the auction to be in the `Closed` state (settlement).
   */
  9: {message:"AuctionNotClosed"},
  /**
   * Reentrant call detected through the reentrancy guard.
   */
  10: {message:"Reentrancy"},
  /**
   * Auction closed without a valid winning bid.
   */
  11: {message:"NoWinner"},
  /**
   * Auction with the requested id was not found.
   */
  12: {message:"NotFound"},
  /**
   * `settle_default_liquidation` was called a second time for the same auction.
   */
  13: {message:"AlreadySettled"},
  /**
   * The liquidation grace window has not yet elapsed; bidding is blocked.
   */
  14: {message:"GracePeriodActive"}
}


export interface BidRefundedEvent {
  amount: i128;
  prev_bidder: string;
}


export interface AuctionClosedEvent {
  amount: i128;
  auction_id: string;
  winner: Option<string>;
}


export interface DefaultLiquidationSettlementEvent {
  auction_id: string;
  borrower: string;
  credit_contract: string;
  recovered_amount: i128;
  winner: string;
}

export interface Client {
  /**
   * Construct and simulate a place_bid transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  place_bid: ({auction_id, bidder, amount}: {auction_id: string, bidder: string, amount: i128}, options?: {
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
   * Construct and simulate a init_auction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initializes a new auction.
   * 
   * # Parameters
   * - `env`: The execution environment.
   * - `auction_id`: The unique identifier for the auction.
   * - `mode`: The mode of the auction (e.g., English or Dutch).
   * - `start_time`: The timestamp when the auction starts.
   * - `end_time`: The timestamp when the auction ends.
   * - `min_bid`: The minimum initial bid (English) or floor price equivalent logic.
   * - `min_increment_bps`: The minimum bid increment in basis points (max 10000).
   * - `dutch_start_price`: The starting price for a Dutch auction.
   * - `dutch_floor_price`: The lowest possible price for a Dutch auction.
   * - `dutch_decay`: The price decay configuration for a Dutch auction.
   * - `dutch_step_count`: Required steps if decay is `Stepped`.
   * 
   * # Panics
   * Panics if `start_time >= end_time`, if `min_increment_bps > 10_000`, or if Dutch auction parameters are invalid.
   */
  init_auction: ({auction_id, mode, start_time, end_time, min_bid, min_increment_bps, dutch_start_price, dutch_floor_price, dutch_decay, dutch_step_count}: {auction_id: string, mode: AuctionMode, start_time: u64, end_time: u64, min_bid: i128, min_increment_bps: u32, dutch_start_price: Option<i128>, dutch_floor_price: Option<i128>, dutch_decay: DutchAuctionDecay, dutch_step_count: Option<u32>}, options?: {
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
   * Construct and simulate a claim_auction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claims the proceeds or assets of a closed auction by the winning bidder.
   * 
   * # Authorization
   * Requires `require_auth` from the winning bidder.
   * 
   * # Panics
   * * [`AuctionError::NotFound`] - Auction not found.
   * * [`AuctionError::AuctionNotClosed`] - Auction is not in `Closed` status.
   * * [`AuctionError::AlreadySettled`] - Auction has already been liquidated/settled.
   * * [`AuctionError::NoWinner`] - There is no winning bidder.
   * * [`AuctionError::AlreadyClaimed`] - Auction was already claimed.
   * * [`AuctionError::InvalidState`] - Bid token not found in storage.
   */
  claim_auction: ({auction_id}: {auction_id: string}, options?: {
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
   * Construct and simulate a close_auction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Closes an open auction, transitioning its status from `Open` to `Closed`.
   * 
   * The caller must be the registered factory contract.  After closing, the
   * auction is eligible for `settle_default_liquidation` (factory-only) or
   * `claim_auction` (winner-only).
   * 
   * # Authorization
   * Requires [`Address::require_auth`] from the registered factory contract.
   * 
   * # Parameters
   * - `env`: The execution environment.
   * - `auction_id`: The identifier of the auction to close.
   * 
   * # Errors
   * * [`AuctionError::NoFactoryContract`] — factory address not configured.
   * * [`AuctionError::NotFound`] — no auction found for `auction_id`.
   * * [`AuctionError::AuctionNotOpen`] — auction is already `Closed`.
   * * [`AuctionError::AlreadyClaimed`] — auction is in `Claimed` terminal state.
   */
  close_auction: ({auction_id}: {auction_id: string}, options?: {
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
   * Construct and simulate a set_factory_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sets the factory contract address.
   * 
   * # Authorization
   * Requires `require_auth` from the factory itself.
   */
  set_factory_contract: ({factory}: {factory: string}, options?: {
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
   * Settles an auction that ended in default or completes the liquidation process.
   * 
   * Transfers the highest bid amount (if any) to the credit contract.
   * 
   * # Authorization
   * Requires `require_auth` from the factory contract.
   * 
   * # Returns
   * The `highest_bid` amount that was settled.
   * 
   * # Panics
   * * [`AuctionError::NoFactoryContract`] - Factory contract not set.
   * * [`AuctionError::Unauthorized`] - Caller is not the factory contract.
   * * [`AuctionError::NotFound`] - Auction not found.
   * * [`AuctionError::NotClosed`] - Auction is not in the `Closed` state.
   * * [`AuctionError::AlreadySettled`] - Auction has already been settled.
   */
  settle_default_liquidation: ({auction_id, credit_contract, borrower}: {auction_id: string, credit_contract: string, borrower: string}, options?: {
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
      new ContractSpec([ "AAAAAAAAAAAAAAAJcGxhY2VfYmlkAAAAAAAAAwAAAAAAAAAKYXVjdGlvbl9pZAAAAAAAEQAAAAAAAAAGYmlkZGVyAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAA0dJbml0aWFsaXplcyBhIG5ldyBhdWN0aW9uLgoKIyBQYXJhbWV0ZXJzCi0gYGVudmA6IFRoZSBleGVjdXRpb24gZW52aXJvbm1lbnQuCi0gYGF1Y3Rpb25faWRgOiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBhdWN0aW9uLgotIGBtb2RlYDogVGhlIG1vZGUgb2YgdGhlIGF1Y3Rpb24gKGUuZy4sIEVuZ2xpc2ggb3IgRHV0Y2gpLgotIGBzdGFydF90aW1lYDogVGhlIHRpbWVzdGFtcCB3aGVuIHRoZSBhdWN0aW9uIHN0YXJ0cy4KLSBgZW5kX3RpbWVgOiBUaGUgdGltZXN0YW1wIHdoZW4gdGhlIGF1Y3Rpb24gZW5kcy4KLSBgbWluX2JpZGA6IFRoZSBtaW5pbXVtIGluaXRpYWwgYmlkIChFbmdsaXNoKSBvciBmbG9vciBwcmljZSBlcXVpdmFsZW50IGxvZ2ljLgotIGBtaW5faW5jcmVtZW50X2Jwc2A6IFRoZSBtaW5pbXVtIGJpZCBpbmNyZW1lbnQgaW4gYmFzaXMgcG9pbnRzIChtYXggMTAwMDApLgotIGBkdXRjaF9zdGFydF9wcmljZWA6IFRoZSBzdGFydGluZyBwcmljZSBmb3IgYSBEdXRjaCBhdWN0aW9uLgotIGBkdXRjaF9mbG9vcl9wcmljZWA6IFRoZSBsb3dlc3QgcG9zc2libGUgcHJpY2UgZm9yIGEgRHV0Y2ggYXVjdGlvbi4KLSBgZHV0Y2hfZGVjYXlgOiBUaGUgcHJpY2UgZGVjYXkgY29uZmlndXJhdGlvbiBmb3IgYSBEdXRjaCBhdWN0aW9uLgotIGBkdXRjaF9zdGVwX2NvdW50YDogUmVxdWlyZWQgc3RlcHMgaWYgZGVjYXkgaXMgYFN0ZXBwZWRgLgoKIyBQYW5pY3MKUGFuaWNzIGlmIGBzdGFydF90aW1lID49IGVuZF90aW1lYCwgaWYgYG1pbl9pbmNyZW1lbnRfYnBzID4gMTBfMDAwYCwgb3IgaWYgRHV0Y2ggYXVjdGlvbiBwYXJhbWV0ZXJzIGFyZSBpbnZhbGlkLgAAAAAMaW5pdF9hdWN0aW9uAAAACgAAAAAAAAAKYXVjdGlvbl9pZAAAAAAAEQAAAAAAAAAEbW9kZQAAB9AAAAALQXVjdGlvbk1vZGUAAAAAAAAAAApzdGFydF90aW1lAAAAAAAGAAAAAAAAAAhlbmRfdGltZQAAAAYAAAAAAAAAB21pbl9iaWQAAAAACwAAAAAAAAARbWluX2luY3JlbWVudF9icHMAAAAAAAAEAAAAAAAAABFkdXRjaF9zdGFydF9wcmljZQAAAAAAA+gAAAALAAAAAAAAABFkdXRjaF9mbG9vcl9wcmljZQAAAAAAA+gAAAALAAAAAAAAAAtkdXRjaF9kZWNheQAAAAfQAAAAEUR1dGNoQXVjdGlvbkRlY2F5AAAAAAAAAAAAABBkdXRjaF9zdGVwX2NvdW50AAAD6AAAAAQAAAAA",
        "AAAAAAAAAiJDbGFpbXMgdGhlIHByb2NlZWRzIG9yIGFzc2V0cyBvZiBhIGNsb3NlZCBhdWN0aW9uIGJ5IHRoZSB3aW5uaW5nIGJpZGRlci4KCiMgQXV0aG9yaXphdGlvbgpSZXF1aXJlcyBgcmVxdWlyZV9hdXRoYCBmcm9tIHRoZSB3aW5uaW5nIGJpZGRlci4KCiMgUGFuaWNzCiogW2BBdWN0aW9uRXJyb3I6Ok5vdEZvdW5kYF0gLSBBdWN0aW9uIG5vdCBmb3VuZC4KKiBbYEF1Y3Rpb25FcnJvcjo6QXVjdGlvbk5vdENsb3NlZGBdIC0gQXVjdGlvbiBpcyBub3QgaW4gYENsb3NlZGAgc3RhdHVzLgoqIFtgQXVjdGlvbkVycm9yOjpBbHJlYWR5U2V0dGxlZGBdIC0gQXVjdGlvbiBoYXMgYWxyZWFkeSBiZWVuIGxpcXVpZGF0ZWQvc2V0dGxlZC4KKiBbYEF1Y3Rpb25FcnJvcjo6Tm9XaW5uZXJgXSAtIFRoZXJlIGlzIG5vIHdpbm5pbmcgYmlkZGVyLgoqIFtgQXVjdGlvbkVycm9yOjpBbHJlYWR5Q2xhaW1lZGBdIC0gQXVjdGlvbiB3YXMgYWxyZWFkeSBjbGFpbWVkLgoqIFtgQXVjdGlvbkVycm9yOjpJbnZhbGlkU3RhdGVgXSAtIEJpZCB0b2tlbiBub3QgZm91bmQgaW4gc3RvcmFnZS4AAAAAAA1jbGFpbV9hdWN0aW9uAAAAAAAAAQAAAAAAAAAKYXVjdGlvbl9pZAAAAAAAEQAAAAA=",
        "AAAAAAAAAudDbG9zZXMgYW4gb3BlbiBhdWN0aW9uLCB0cmFuc2l0aW9uaW5nIGl0cyBzdGF0dXMgZnJvbSBgT3BlbmAgdG8gYENsb3NlZGAuCgpUaGUgY2FsbGVyIG11c3QgYmUgdGhlIHJlZ2lzdGVyZWQgZmFjdG9yeSBjb250cmFjdC4gIEFmdGVyIGNsb3NpbmcsIHRoZQphdWN0aW9uIGlzIGVsaWdpYmxlIGZvciBgc2V0dGxlX2RlZmF1bHRfbGlxdWlkYXRpb25gIChmYWN0b3J5LW9ubHkpIG9yCmBjbGFpbV9hdWN0aW9uYCAod2lubmVyLW9ubHkpLgoKIyBBdXRob3JpemF0aW9uClJlcXVpcmVzIFtgQWRkcmVzczo6cmVxdWlyZV9hdXRoYF0gZnJvbSB0aGUgcmVnaXN0ZXJlZCBmYWN0b3J5IGNvbnRyYWN0LgoKIyBQYXJhbWV0ZXJzCi0gYGVudmA6IFRoZSBleGVjdXRpb24gZW52aXJvbm1lbnQuCi0gYGF1Y3Rpb25faWRgOiBUaGUgaWRlbnRpZmllciBvZiB0aGUgYXVjdGlvbiB0byBjbG9zZS4KCiMgRXJyb3JzCiogW2BBdWN0aW9uRXJyb3I6Ok5vRmFjdG9yeUNvbnRyYWN0YF0g4oCUIGZhY3RvcnkgYWRkcmVzcyBub3QgY29uZmlndXJlZC4KKiBbYEF1Y3Rpb25FcnJvcjo6Tm90Rm91bmRgXSDigJQgbm8gYXVjdGlvbiBmb3VuZCBmb3IgYGF1Y3Rpb25faWRgLgoqIFtgQXVjdGlvbkVycm9yOjpBdWN0aW9uTm90T3BlbmBdIOKAlCBhdWN0aW9uIGlzIGFscmVhZHkgYENsb3NlZGAuCiogW2BBdWN0aW9uRXJyb3I6OkFscmVhZHlDbGFpbWVkYF0g4oCUIGF1Y3Rpb24gaXMgaW4gYENsYWltZWRgIHRlcm1pbmFsIHN0YXRlLgAAAAANY2xvc2VfYXVjdGlvbgAAAAAAAAEAAAAAAAAACmF1Y3Rpb25faWQAAAAAABEAAAAA",
        "AAAAAgAAAAAAAAAAAAAADVNldHRsZW1lbnRLZXkAAAAAAAACAAAAAQAAAAAAAAAGQ2xvc2VkAAAAAAABAAAAEQAAAAEAAAAAAAAAEkxpcXVpZGF0aW9uU2V0dGxlZAAAAAAAAQAAABE=",
        "AAAAAAAAAGRTZXRzIHRoZSBmYWN0b3J5IGNvbnRyYWN0IGFkZHJlc3MuCgojIEF1dGhvcml6YXRpb24KUmVxdWlyZXMgYHJlcXVpcmVfYXV0aGAgZnJvbSB0aGUgZmFjdG9yeSBpdHNlbGYuAAAAFHNldF9mYWN0b3J5X2NvbnRyYWN0AAAAAQAAAAAAAAAHZmFjdG9yeQAAAAATAAAAAA==",
        "AAAAAAAAAl1TZXR0bGVzIGFuIGF1Y3Rpb24gdGhhdCBlbmRlZCBpbiBkZWZhdWx0IG9yIGNvbXBsZXRlcyB0aGUgbGlxdWlkYXRpb24gcHJvY2Vzcy4KClRyYW5zZmVycyB0aGUgaGlnaGVzdCBiaWQgYW1vdW50IChpZiBhbnkpIHRvIHRoZSBjcmVkaXQgY29udHJhY3QuCgojIEF1dGhvcml6YXRpb24KUmVxdWlyZXMgYHJlcXVpcmVfYXV0aGAgZnJvbSB0aGUgZmFjdG9yeSBjb250cmFjdC4KCiMgUmV0dXJucwpUaGUgYGhpZ2hlc3RfYmlkYCBhbW91bnQgdGhhdCB3YXMgc2V0dGxlZC4KCiMgUGFuaWNzCiogW2BBdWN0aW9uRXJyb3I6Ok5vRmFjdG9yeUNvbnRyYWN0YF0gLSBGYWN0b3J5IGNvbnRyYWN0IG5vdCBzZXQuCiogW2BBdWN0aW9uRXJyb3I6OlVuYXV0aG9yaXplZGBdIC0gQ2FsbGVyIGlzIG5vdCB0aGUgZmFjdG9yeSBjb250cmFjdC4KKiBbYEF1Y3Rpb25FcnJvcjo6Tm90Rm91bmRgXSAtIEF1Y3Rpb24gbm90IGZvdW5kLgoqIFtgQXVjdGlvbkVycm9yOjpOb3RDbG9zZWRgXSAtIEF1Y3Rpb24gaXMgbm90IGluIHRoZSBgQ2xvc2VkYCBzdGF0ZS4KKiBbYEF1Y3Rpb25FcnJvcjo6QWxyZWFkeVNldHRsZWRgXSAtIEF1Y3Rpb24gaGFzIGFscmVhZHkgYmVlbiBzZXR0bGVkLgAAAAAAABpzZXR0bGVfZGVmYXVsdF9saXF1aWRhdGlvbgAAAAAAAwAAAAAAAAAKYXVjdGlvbl9pZAAAAAAAEQAAAAAAAAAPY3JlZGl0X2NvbnRyYWN0AAAAABMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAAL",
        "AAAAAQAAAAAAAAAAAAAAA0JpZAAAAAADAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABmJpZGRlcgAAAAAAEwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABlN0YXR1cwAAAAAAAAAAAAAAAAANSGlnaGVzdEJpZGRlcgAAAAAAAAAAAAAAAAAAD0ZhY3RvcnlDb250cmFjdAAAAAAAAAAAAAAAAAdFbmRUaW1lAAAAAAAAAAAAAAAACkhpZ2hlc3RCaWQAAAAAAAAAAAB0Q29udHJhY3QtbGV2ZWwgZ3JhY2Ugd2luZG93IChpbiBzZWNvbmRzKSB0aGF0IG11c3QgZWxhcHNlIGFmdGVyCmF1Y3Rpb24gY3JlYXRpb24gYmVmb3JlIHRoZSBmaXJzdCBiaWQgY2FuIGJlIHBsYWNlZC4AAAAWTGlxdWlkYXRpb25HcmFjZVdpbmRvdwAA",
        "AAAAAgAAAAAAAAAAAAAACkF1Y3Rpb25LZXkAAAAAAAgAAAABAAAAAAAAAAZTZWxsZXIAAAAAAAEAAAAEAAAAAQAAAAAAAAAFQXNzZXQAAAAAAAABAAAABAAAAAEAAAAAAAAABk1pbkJpZAAAAAAAAQAAAAQAAAABAAAAAAAAAAdFbmRUaW1lAAAAAAEAAAAEAAAAAQAAAAAAAAANSGlnaGVzdEJpZGRlcgAAAAAAAAEAAAAEAAAAAQAAAAAAAAAKSGlnaGVzdEJpZAAAAAAAAQAAAAQAAAABAAAAAAAAAAZTdGF0dXMAAAAAAAEAAAAEAAAAAQAAAAAAAAAHQ2xhaW1lZAAAAAABAAAABA==",
        "AAAAAgAAAAAAAAAAAAAAC0F1Y3Rpb25Nb2RlAAAAAAIAAAAAAAAAPEVuZ2xpc2ggYXVjdGlvbjogYXNjZW5kaW5nIHByaWNlLCBoaWdoZXN0IGJpZGRlciB3aW5zIGF0IGVuZAAAAAdFbmdsaXNoAAAAAAAAAAA6RHV0Y2ggYXVjdGlvbjogZGVzY2VuZGluZyBwcmljZSwgZmlyc3QgcXVhbGlmeWluZyBiaWQgd2lucwAAAAAABUR1dGNoAAAA",
        "AAAAAQAAAAAAAAAAAAAADEF1Y3Rpb25TdGF0ZQAAAAQAAAAAAAAABmNvbmZpZwAAAAAH0AAAAA1BdWN0aW9uQ29uZmlnAAAAAAAAAAAAAAtoaWdoZXN0X2JpZAAAAAALAAAAAAAAAA5oaWdoZXN0X2JpZGRlcgAAAAAD6AAAABMAAAAAAAAABnN0YXR1cwAAAAAH0AAAAA1BdWN0aW9uU3RhdHVzAAAA",
        "AAAAAQAAAAAAAAAAAAAADUF1Y3Rpb25Db25maWcAAAAAAAAKAAAARER1dGNoIGRlY2F5IHNoYXBlLiBgRHV0Y2hBdWN0aW9uRGVjYXk6Ok5vbmVgIG1lYW5zIGxpbmVhciAoZGVmYXVsdCkuAAAAC2R1dGNoX2RlY2F5AAAAB9AAAAARRHV0Y2hBdWN0aW9uRGVjYXkAAAAAAAA4Rmxvb3IgcHJpY2UgZm9yIER1dGNoIGF1Y3Rpb24gKG9ubHkgdXNlZCBpbiBEdXRjaCBtb2RlKS4AAAARZHV0Y2hfZmxvb3JfcHJpY2UAAAAAAAPoAAAACwAAADtTdGFydGluZyBwcmljZSBmb3IgRHV0Y2ggYXVjdGlvbiAob25seSB1c2VkIGluIER1dGNoIG1vZGUpLgAAAAARZHV0Y2hfc3RhcnRfcHJpY2UAAAAAAAPoAAAACwAAAIxOdW1iZXIgb2YgZXF1YWwgdGltZSBidWNrZXRzIHVzZWQgYnkgW2BEdXRjaEF1Y3Rpb25EZWNheTo6U3RlcHBlZGBdLgpSZXF1aXJlZCBmb3Igc3RlcHBlZCBEdXRjaCBhdWN0aW9uczsgaWdub3JlZCBmb3IgYWxsIG90aGVyIGRlY2F5IGtpbmRzLgAAABBkdXRjaF9zdGVwX2NvdW50AAAD6AAAAAQAAAAAAAAACGVuZF90aW1lAAAABgAAAAAAAAAHbWluX2JpZAAAAAALAAAA3E1pbmltdW0gb3V0YmlkIGluY3JlbWVudCBleHByZXNzZWQgaW4gYmFzaXMgcG9pbnRzICgxIGJwcyA9IDAuMDElKS4KRWFjaCBuZXcgYmlkIG11c3QgYmUgYXQgbGVhc3QgYGhpZ2hlc3QgKiAoMSArIG1pbl9pbmNyZW1lbnRfYnBzIC8gMTBfMDAwKWAuCkNhcHBlZCBhdCAxMF8wMDAgKDEwMCUpIG9uIGluaXQuIFVzZSAwIHRvIHJlcXVpcmUgb25seSBhIDEtc3Ryb29wIGluY3JlbWVudC4AAAARbWluX2luY3JlbWVudF9icHMAAAAAAAAEAAAAAAAAAARtb2RlAAAH0AAAAAtBdWN0aW9uTW9kZQAAAAAAAAAACnN0YXJ0X3RpbWUAAAAAAAYAAAAAAAAADXVzZXJuYW1lX2hhc2gAAAAAAAPuAAAAIA==",
        "AAAAAgAAAAAAAAAAAAAADUF1Y3Rpb25TdGF0dXMAAAAAAAADAAAAAAAAAAAAAAAET3BlbgAAAAAAAAAAAAAABkNsb3NlZAAAAAAAAAAAAAAAAAAHQ2xhaW1lZAA=",
        "AAAAAgAAAAAAAAAAAAAAEUR1dGNoQXVjdGlvbkRlY2F5AAAAAAAABAAAAAAAAABhTm8gZGVjYXkgY29uZmlndXJlZCDigJQgdXNlZCBmb3IgRW5nbGlzaCBhdWN0aW9ucyBvciBEdXRjaCBhdWN0aW9ucwp0aGF0IGRlZmF1bHQgdG8gbGluZWFyIGRlY2F5LgAAAAAAAAROb25lAAAAAAAAAEBDb250aW51b3VzIGxpbmVhciBpbnRlcnBvbGF0aW9uIGZyb20gc3RhcnQgcHJpY2UgdG8gZmxvb3IgcHJpY2UuAAAABkxpbmVhcgAAAAAAAAAAAEdQaWVjZXdpc2UtY29uc3RhbnQgc3RhaXJjYXNlIGRlY2F5IHdpdGggYGR1dGNoX3N0ZXBfY291bnRgIGVxdWFsIGRyb3BzLgAAAAAHU3RlcHBlZAAAAAAAAAAALk11bHRpcGxpY2F0aXZlIH4xJS1wZXItc3RlcCBleHBvbmVudGlhbCBkZWNheS4AAAAAAAtFeHBvbmVudGlhbAA=",
        "AAAABAAAAAAAAAAAAAAADEF1Y3Rpb25FcnJvcgAAAA4AAAA/Q2FsbGVyIGlzIG5vdCB0aGUgd2lubmluZyBiaWRkZXIgZm9yIHRoZSBhdWN0aW9uIGJlaW5nIGNsYWltZWQuAAAAAAlOb3RXaW5uZXIAAAAAAAABAAAAPFRoZSB3aW5uaW5nIGJpZGRlciBoYXMgYWxyZWFkeSBjbGFpbWVkIHRoZSBhdWN0aW9uIHByb2NlZWRzLgAAAA5BbHJlYWR5Q2xhaW1lZAAAAAAAAgAAADtPcGVyYXRpb24gcmVxdWlyZXMgdGhlIGF1Y3Rpb24gdG8gYmUgaW4gdGhlIGBDbG9zZWRgIHN0YXRlLgAAAAAJTm90Q2xvc2VkAAAAAAAAAwAAAD5UaGUgY3JlZGl0IC8gZmFjdG9yeSBjb250cmFjdCBhZGRyZXNzIGhhcyBub3QgYmVlbiBjb25maWd1cmVkLgAAAAAAEU5vRmFjdG9yeUNvbnRyYWN0AAAAAAAABAAAAD5DYWxsZXIgaXMgbm90IGF1dGhvcml6ZWQgdG8gcGVyZm9ybSB0aGlzIGFkbWluLW9ubHkgb3BlcmF0aW9uLgAAAAAADFVuYXV0aG9yaXplZAAAAAUAAABAQXVjdGlvbiBpcyBpbiBhIHN0YXRlIGluY29tcGF0aWJsZSB3aXRoIHRoZSByZXF1ZXN0ZWQgb3BlcmF0aW9uLgAAAAxJbnZhbGlkU3RhdGUAAAAGAAAAO1N1Ym1pdHRlZCBiaWQgZG9lcyBub3QgbWVldCB0aGUgbWluaW11bSBuZXh0LWJpZCB0aHJlc2hvbGQuAAAAAAlCaWRUb29Mb3cAAAAAAAAHAAAAOU9wZXJhdGlvbiByZXF1aXJlcyB0aGUgYXVjdGlvbiB0byBiZSBpbiB0aGUgYE9wZW5gIHN0YXRlLgAAAAAAAA5BdWN0aW9uTm90T3BlbgAAAAAACAAAAEhPcGVyYXRpb24gcmVxdWlyZXMgdGhlIGF1Y3Rpb24gdG8gYmUgaW4gdGhlIGBDbG9zZWRgIHN0YXRlIChzZXR0bGVtZW50KS4AAAAQQXVjdGlvbk5vdENsb3NlZAAAAAkAAAA1UmVlbnRyYW50IGNhbGwgZGV0ZWN0ZWQgdGhyb3VnaCB0aGUgcmVlbnRyYW5jeSBndWFyZC4AAAAAAAAKUmVlbnRyYW5jeQAAAAAACgAAACtBdWN0aW9uIGNsb3NlZCB3aXRob3V0IGEgdmFsaWQgd2lubmluZyBiaWQuAAAAAAhOb1dpbm5lcgAAAAsAAAAsQXVjdGlvbiB3aXRoIHRoZSByZXF1ZXN0ZWQgaWQgd2FzIG5vdCBmb3VuZC4AAAAITm90Rm91bmQAAAAMAAAAS2BzZXR0bGVfZGVmYXVsdF9saXF1aWRhdGlvbmAgd2FzIGNhbGxlZCBhIHNlY29uZCB0aW1lIGZvciB0aGUgc2FtZSBhdWN0aW9uLgAAAAAOQWxyZWFkeVNldHRsZWQAAAAAAA0AAABFVGhlIGxpcXVpZGF0aW9uIGdyYWNlIHdpbmRvdyBoYXMgbm90IHlldCBlbGFwc2VkOyBiaWRkaW5nIGlzIGJsb2NrZWQuAAAAAAAAEUdyYWNlUGVyaW9kQWN0aXZlAAAAAAAADg==",
        "AAAAAQAAAAAAAAAAAAAAEEJpZFJlZnVuZGVkRXZlbnQAAAACAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAC3ByZXZfYmlkZGVyAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAAEkF1Y3Rpb25DbG9zZWRFdmVudAAAAAAAAwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAphdWN0aW9uX2lkAAAAAAARAAAAAAAAAAZ3aW5uZXIAAAAAA+gAAAAT",
        "AAAAAQAAAAAAAAAAAAAAIURlZmF1bHRMaXF1aWRhdGlvblNldHRsZW1lbnRFdmVudAAAAAAAAAUAAAAAAAAACmF1Y3Rpb25faWQAAAAAABEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAPY3JlZGl0X2NvbnRyYWN0AAAAABMAAAAAAAAAEHJlY292ZXJlZF9hbW91bnQAAAALAAAAAAAAAAZ3aW5uZXIAAAAAABM=" ]),
      options
    )
  }
  public readonly fromJSON = {
    place_bid: this.txFromJSON<null>,
        init_auction: this.txFromJSON<null>,
        claim_auction: this.txFromJSON<null>,
        close_auction: this.txFromJSON<null>,
        set_factory_contract: this.txFromJSON<null>,
        settle_default_liquidation: this.txFromJSON<i128>
  }
}