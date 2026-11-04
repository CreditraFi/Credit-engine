# Testnet Build, Deployment, and TypeScript Bindings

This guide is the reproducible workflow for building the two deployable
Soroban contracts (`creditra-credit` and `gateway-auction`), deploying them to
**Stellar testnet**, and generating the TypeScript client bindings used by
local integration tests.

> **Testnet only.** This repository intentionally has no mainnet network
> option, deployment script, secret, wallet implementation, or credential.
> Do not add a mainnet passphrase, a funded mainnet key, or a mainnet RPC URL
> to this repository, its docs, or its CI.

For the post-deploy contract configuration sequence, see
[`docs/deploy.md`](./deploy.md).

---

## 1. Prerequisites

| Tool | Version | Why |
| ---- | ------- | --- |
| Rust | toolchain selected by `rust-toolchain.toml` | Builds the workspace |
| `wasm32-unknown-unknown` | installed via rustup | Soroban target |
| Stellar CLI | **22.8.2** | Builds bindings and sends testnet transactions |
| Node.js | 20+ | Builds and smoke-tests generated TypeScript clients |

Install the Rust target:

```bash
rustup target add wasm32-unknown-unknown
```

Install the pinned Stellar CLI. Pick one method:

```bash
# Prebuilt binary (recommended for CI and clean machines)
curl -sSL \
  https://github.com/stellar/stellar-cli/releases/download/v22.8.2/stellar-cli-22.8.2-x86_64-unknown-linux-gnu.tar.gz \
  | tar -xz -C /usr/local/bin stellar
stellar --version   # stellar 22.8.2
```

```bash
# Or build from source (slower)
cargo install stellar-cli --version 22.8.2 --locked
```

The binding scripts refuse to run with any other CLI version so a different
interface encoder cannot silently change committed output.

---

## 2. Reproducible WASM build

```bash
scripts/build_wasm.sh all
```

The script:

- builds with the workspace `Cargo.lock` (`cargo build --locked`),
- targets `wasm32-unknown-unknown` in the size-optimized `release` profile,
- builds exactly the two deployable packages,
- fails if either artifact is missing,
- prints each artifact's byte size and SHA-256.

Output:

```text
target/wasm32-unknown-unknown/release/creditra_credit.wasm
target/wasm32-unknown-unknown/release/gateway_auction.wasm
```

Verify an existing build without rebuilding:

```bash
scripts/build_wasm.sh --check
```

Build a single contract:

```bash
scripts/build_wasm.sh credit
scripts/build_wasm.sh auction
```

### Reproducibility notes

- `Cargo.lock` is committed, so dependency versions do not float between a
  developer machine and CI.
- `rust-toolchain.toml` selects the toolchain and required components.
- The committed bindings are generated from WASM, not from a live RPC node,
  so generation is offline and deterministic.

To compare two builds, run the build twice from clean `target/` directories
and compare the printed `sha256` values. If the hashes differ, inspect the
toolchain and `Cargo.lock` first; do not "fix" the baseline silently.

---

## 3. Generate TypeScript bindings

```bash
scripts/generate-bindings.sh
```

The script builds both WASMs and writes:

```text
bindings/credit-engine/   # generated from creditra_credit.wasm
bindings/auction/         # generated from gateway_auction.wasm
```

Each generated package contains `src/index.ts`, `package.json`, `tsconfig.json`,
and a generated `README.md`.

Regenerate from an existing WASM build:

```bash
scripts/generate-bindings.sh --skip-build
```

### Check for drift

```bash
scripts/check-bindings.sh
```

The check regenerates both clients into a temporary directory with the pinned
CLI and diffs them against `bindings/`. It fails if a contract interface changed
without the committed bindings being regenerated. It never contacts a network
and never mutates the working tree.

**When the contract interface changes, run `scripts/generate-bindings.sh` and
commit the regenerated `bindings/` output in the same pull request.**

### Build and smoke-test the bindings

```bash
npm ci
npm test
```

The smoke test (`bindings/smoke.test.mjs`) instantiates both generated clients
with the public testnet passphrase and an unreachable/offline configuration. It
then verifies the embedded contract spec exposes the expected entrypoints
(`init`, `open_credit_line`, `draw_credit`, `repay_credit`, and the auction
entrypoints). No network call, funded account, or secret is required.

---

## 4. Configure testnet

All state below lives in the Stellar CLI's local config or OS keychain. Nothing
in this section goes into the repository.

```bash
# Register the public testnet RPC endpoint and passphrase once.
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

stellar network use testnet
```

Create a **testnet-only** operator identity. `--fund` requests friendbot
funding; keep the identity in the CLI's local store or OS secure store:

```bash
stellar keys generate operator --network testnet --fund
stellar keys public-key operator
```

> Never commit seed phrases, secret keys, or `.env` files. `.env` is ignored by
> this repository. The deployment commands below read the identity name from
> the local CLI store, not from a repository file.

---

## 5. Deploy to testnet

Deploy the credit contract first, then the auction contract:

```bash
export CREDIT_WASM=target/wasm32-unknown-unknown/release/creditra_credit.wasm
export AUCTION_WASM=target/wasm32-unknown-unknown/release/gateway_auction.wasm

stellar contract deploy \
  --wasm "$CREDIT_WASM" \
  --source operator \
  --network testnet \
  --alias credit

stellar contract deploy \
  --wasm "$AUCTION_WASM" \
  --source operator \
  --network testnet \
  --alias auction
```

`--alias` stores the returned contract ID under `credit` / `auction` in the
local CLI config. You can read it later with:

```bash
stellar contract alias show credit
```

Alternatively, pass the contract ID explicitly with `--id` in every invoke.

---

## 6. Initialize and invoke on testnet

The deployment sequence is **ordered**. The full invariant list lives in
[`docs/deploy.md`](./deploy.md); the minimum testnet path is:

```bash
export ADMIN_ADDRESS="$(stellar keys public-key operator)"
export TOKEN_ADDRESS="<testnet SAC or compatible token contract address>"

# 1. One-time initialization. Re-running reverts with AlreadyInitialized (14).
stellar contract invoke \
  --id credit --source operator --network testnet \
  -- init --admin "$ADMIN_ADDRESS"

# 2. Point the credit contract at the liquidity token.
stellar contract invoke \
  --id credit --source operator --network testnet \
  -- set_liquidity_token --token_address "$TOKEN_ADDRESS"

# 3. Wire the auction contract to the credit contract (factory auth).
stellar contract invoke \
  --id auction --source operator --network testnet \
  -- set_factory_contract --factory "$(stellar contract alias show credit)"
```

Read-only checks do not need a funded source account:

```bash
stellar contract invoke \
  --id credit --source operator --network testnet --send=no \
  -- get_version

stellar contract invoke \
  --id credit --source operator --network testnet --send=no \
  -- get_credit_line --borrower "$ADMIN_ADDRESS"
```

Open and draw a credit line (admin + borrower auth):

```bash
stellar contract invoke \
  --id credit --source operator --network testnet \
  -- open_credit_line \
     --borrower "$ADMIN_ADDRESS" \
     --credit_limit 1000000 \
     --interest_rate_bps 500 \
     --risk_score 40

stellar contract invoke \
  --id credit --source operator --network testnet \
  -- draw_credit --borrower "$ADMIN_ADDRESS" --amount 1000
```

Use `stellar contract invoke --id credit --network testnet -- --help` to see the
exact argument names generated from the deployed contract spec.

### Auction invocation example

```bash
export AUCTION_ID="$(stellar contract alias show auction)"
export CREDIT_ID="$(stellar contract alias show credit)"

# English auction: start now, end in one hour, minimum bid 100.
stellar contract invoke \
  --id auction --source operator --network testnet \
  -- init_auction \
     --auction_id auction_1 \
     --mode English \
     --start_time "$(date +%s)" \
     --end_time "$(( $(date +%s) + 3600 ))" \
     --min_bid 100 \
     --min_increment_bps 500 \
     --dutch_start_price null \
     --dutch_floor_price null \
     --dutch_decay None \
     --dutch_step_count null
```

> The concrete `AuctionMode` / `DutchAuctionDecay` arguments are enum strings;
> use `-- --help` on the deployed contract to confirm the exact spelling for
> the interface version you deployed.

---

## 7. CI validation

`.github/workflows/build-wasm.yml` runs on every pull request and on
pushes to `main`:

1. installs the toolchain from `rust-toolchain.toml`,
2. installs the pinned Stellar CLI **without any credentials**,
3. runs `scripts/build_wasm.sh all`,
4. runs `scripts/check-bindings.sh --skip-build`,
5. runs `npm ci && npm run build:bindings && npm test`.

No repository secrets are required for ordinary build, test, or binding jobs.
Deployment is a manual operator action against testnet only.

---

## 8. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `Expected WASM artifact not found` | Run `scripts/build_wasm.sh all`; do not point at a different target profile. |
| `stellar-cli X does not match pinned 22.8.2` | Install the pinned CLI or set `STELLAR_CLI_VERSION` deliberately for an interface-breaking migration. |
| `Generated TypeScript bindings are stale` | Run `scripts/generate-bindings.sh`, review the diff, and commit it with the interface change. |
| `npm` cannot resolve `@stellar/stellar-sdk` | Run `npm ci` from the repository root (the bindings are npm workspaces). |
| `AlreadyInitialized` (error 14) on deploy | `init` is one-time; deploy a fresh contract ID instead of re-initializing. |
| `NoFactoryContract` on auction calls | Call `set_factory_contract` from the credit contract before closing or settling. |

---

## 9. Explicit non-goals

- No mainnet passphrase, RPC URL, deployment path, or example.
- No deploy script that reads a secret from the repository.
- No wallet implementation, key generation code, or committed credentials.
- No new contract dependencies for build/deploy tooling.
