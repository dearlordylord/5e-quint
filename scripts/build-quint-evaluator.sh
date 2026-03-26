#!/usr/bin/env bash
# Build the Quint Rust evaluator from source for GLIBC compatibility.
#
# The pre-built evaluator binaries from GitHub require GLIBC 2.39+,
# but Debian 12 ships GLIBC 2.36. Building locally links against the
# system GLIBC, guaranteeing compatibility.
#
# Prerequisites: curl, gcc, make (all present in Debian 12 default image)
# Installs Rust toolchain via rustup if not already present.

set -euo pipefail

EVALUATOR_VERSION="v0.5.0"
QUINT_HOME="${QUINT_HOME:-$HOME/.quint}"
TARGET_DIR="$QUINT_HOME/rust-evaluator-$EVALUATOR_VERSION"
TARGET_BIN="$TARGET_DIR/quint_evaluator"
BUILD_DIR="/tmp/quint-evaluator-build"

# Check if the current binary already works
if [ -f "$TARGET_BIN" ] && "$TARGET_BIN" --help >/dev/null 2>&1; then
  echo "Rust evaluator at $TARGET_BIN already works — skipping build."
  exit 0
fi

echo "Building Quint Rust evaluator $EVALUATOR_VERSION from source..."

# Install Rust if needed
if ! command -v cargo >/dev/null 2>&1; then
  echo "Installing Rust toolchain..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck source=/dev/null
  . "$HOME/.cargo/env"
fi

# Clone and build
rm -rf "$BUILD_DIR"
git clone --depth 1 https://github.com/informalsystems/quint.git "$BUILD_DIR"
cd "$BUILD_DIR/evaluator"
cargo build --release

# Install
mkdir -p "$TARGET_DIR"
cp "$BUILD_DIR/evaluator/target/release/quint_evaluator" "$TARGET_BIN"
chmod +x "$TARGET_BIN"

# Verify
if "$TARGET_BIN" --help >/dev/null 2>&1; then
  echo "Success: $TARGET_BIN"
else
  echo "ERROR: built binary does not run" >&2
  exit 1
fi

# Clean up
rm -rf "$BUILD_DIR"
echo "Done."
