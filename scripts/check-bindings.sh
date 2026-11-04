#!/usr/bin/env bash
# Fail when committed TypeScript bindings drift from the contract interface.
#
# Regenerates both clients into a temporary directory (using the pinned
# stellar-cli) and diffs them against bindings/. No network access, no
# credentials, and no working-tree mutations.
#
# Usage:
#   scripts/check-bindings.sh              # build WASM, then check drift
#   scripts/check-bindings.sh --skip-build # check drift using existing WASM
set -euo pipefail

cd "$(dirname "$0")/.."

SKIP_BUILD=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build)
            SKIP_BUILD=1
            shift
            ;;
        -h | --help)
            sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "unknown argument: $1" >&2
            echo "expected: [--skip-build]" >&2
            exit 64
            ;;
    esac
done

if [[ ! -d bindings/credit-engine || ! -d bindings/auction ]]; then
    echo "::error::Committed bindings are missing." >&2
    echo "Run scripts/generate-bindings.sh and commit the output." >&2
    exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

generate_args=(--skip-build)
if [[ "$SKIP_BUILD" -eq 0 ]]; then
    generate_args=()
fi

BINDINGS_DIR="${tmp_dir}/bindings" bash scripts/generate-bindings.sh "${generate_args[@]}" >/dev/null

if diff -ru --exclude=node_modules --exclude=dist --exclude=smoke.test.mjs \
    bindings "${tmp_dir}/bindings"; then
    echo "Bindings are up to date with the contract interface."
    exit 0
fi

echo >&2
echo "::error::Generated TypeScript bindings are stale." >&2
echo "Regenerate and commit them:" >&2
echo "  scripts/generate-bindings.sh" >&2
exit 1
