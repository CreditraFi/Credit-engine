// Offline smoke test for the generated TypeScript bindings.
//
// This harness never contacts a network and never needs a secret. It
// instantiates each generated client with the public testnet passphrase and
// verifies that the embedded contract spec exposes the entrypoints that the
// Rust interface declares. That catches stale or malformed bindings without
// requiring a deployed contract.
import assert from "node:assert/strict";
import test from "node:test";

import { Networks, StrKey } from "@stellar/stellar-sdk";

import { Client as AuctionClient } from "./auction/dist/index.js";
import { Client as CreditClient } from "./credit-engine/dist/index.js";

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32));

const options = {
  contractId: CONTRACT_ID,
  networkPassphrase: Networks.TESTNET,
  rpcUrl: TESTNET_RPC_URL,
};

function entrypointNames(client) {
  return client.spec.funcs().map((fn) => fn.name().toString());
}

test("credit-engine bindings target testnet and expose the credit interface", () => {
  const client = new CreditClient(options);

  assert.equal(client.options.networkPassphrase, Networks.TESTNET);
  assert.equal(client.options.rpcUrl, TESTNET_RPC_URL);

  const names = entrypointNames(client);
  for (const entrypoint of [
    "init",
    "open_credit_line",
    "draw_credit",
    "repay_credit",
    "set_liquidity_token",
    "get_credit_line",
    "settle_default_liquidation",
  ]) {
    assert.ok(
      names.includes(entrypoint),
      `credit bindings are missing entrypoint ${entrypoint}`,
    );
  }

  assert.ok(names.length >= 40, `expected a full interface, got ${names.length} entrypoints`);
});

test("auction bindings target testnet and expose the auction interface", () => {
  const client = new AuctionClient(options);

  assert.equal(client.options.networkPassphrase, Networks.TESTNET);
  assert.equal(client.options.rpcUrl, TESTNET_RPC_URL);

  const names = entrypointNames(client);
  for (const entrypoint of [
    "init_auction",
    "place_bid",
    "close_auction",
    "claim_auction",
    "settle_default_liquidation",
  ]) {
    assert.ok(
      names.includes(entrypoint),
      `auction bindings are missing entrypoint ${entrypoint}`,
    );
  }
});
