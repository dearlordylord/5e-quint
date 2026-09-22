#!/usr/bin/env bash
set -euo pipefail

# Add correctness checks here. Keep success output quiet and failures actionable.
pnpm srd:autoresearch:check && pnpm srd:autoresearch:test
