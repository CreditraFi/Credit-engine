#!/usr/bin/env bash
# Generate TypeScript clients from the compiled Soroban contract interface.
#
# The bindings are generated from WASM (not from a deployed/RPC contract), so
# generation needs no network access and no operator credentials.
#
# Usage:
#   scripts/generate-bindings.sh              # build WASM + regenerate bindings
#   scripts/generate-bindings.sh --skip-build # generate from existing WASM
#
# Pinned tooling:
#   stellar-cli 22.8.2 (matches the workspace's Soroban SDK 22 interface).
#   Override only deliberately with STELLAR_CLI_VERSION.
set -euo pipefail

cd "$(dirname "$0")/.."

PINNED_STELLAR_VERSION="22.8.2"
STELLAR_CLI_VERSION="${STELLAR_CLI_VERSION:-$PINNED_STELLAR_VERSION}"
STELLAR_BIN="${STELLAR_BIN:-stellar}"
WASM_DIR="target/wasm32-unknown-unknown/release"
BINDINGS_DIR="${BINDINGS_DIR:-bindings}"

SKIP_BUILD=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build)
            SKIP_BUILD=1
            shift
            ;;
        -h | --help)
            sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "unknown argument: $1" >&2
            echo "expected: [--skip-build]" >&2
            exit 64
            ;;
    esac
done

if ! command -v "$STELLAR_BIN" >/dev/null 2>&1; then
    echo "::error::${STELLAR_BIN} not found on PATH." >&2
    echo "Install the pinned Stellar CLI:" >&2
    echo "  https://github.com/stellar/stellar-cli/releases/tag/v${STELLAR_CLI_VERSION}" >&2
    exit 1
fi

actual_version="$("$STELLAR_BIN" --version | awk 'NR == 1 {print $2}')"
if [[ "$actual_version" != "$STELLAR_CLI_VERSION" ]]; then
    echo "::error::stellar-cli ${actual_version} does not match pinned ${STELLAR_CLI_VERSION}." >&2
    echo "Refusing to regenerate bindings with a different interface encoder." >&2
    exit 1
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
    bash scripts/build_wasm.sh all
fi

generate_one() {
    local wasm="$1"
    local output_dir="$2"
    if [[ ! -f "$wasm" ]]; then
        echo "::error::WASM artifact missing: ${wasm}" >&2
        exit 1
    fi
    rm -rf "$output_dir"
    echo "Generating TypeScript bindings: ${wasm} -> ${output_dir}"
    "$STELLAR_BIN" contract bindings typescript \
        --wasm "$wasm" \
        --output-dir "$output_dir" \
        --overwrite
}

mkdir -p "$BINDINGS_DIR"
generate_one "${WASM_DIR}/creditra_credit.wasm" "${BINDINGS_DIR}/credit-engine"
generate_one "${WASM_DIR}/gateway_auction.wasm" "${BINDINGS_DIR}/auction"

echo
echo "Generated bindings:"
find "$BINDINGS_DIR" -maxdepth 2 -type f \
    ! -path '*/node_modules/*' ! -path '*/dist/*' | sort
echo
echo "Regenerate after any contract-interface change, then commit the result."
