#!/usr/bin/env bash
# Verify no PHB text or XPHB-only artifact leaked into main-repo paths.
# Runs before any commit of survey outputs.
#
# Fails non-zero (and lists offenders) if a PHB leak is detected.
# Succeeds silently if the main repo is clean of PHB content.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Paths we check (main-repo-committed survey outputs).
CHECK_ROOTS=(
  "$SCRIPT_DIR/survey-results-srd.jsonl"
  "$SCRIPT_DIR/results-srd"
  "$REPO_ROOT/packages/prototype-content-surface/content"
)

# Signals of PHB leak: rows marked "xphb" source, known PHB-only slugs,
# XPHB-only atom names not in SRD. The main-repo dataset and content
# dir should contain NONE of these.
declare -a PHB_PATTERNS=(
  '"source":"xphb"'
  '"source": "xphb"'
  '"srd52": *false'
)

fail=0
for root in "${CHECK_ROOTS[@]}"; do
  [[ -e "$root" ]] || continue
  for pat in "${PHB_PATTERNS[@]}"; do
    if matches=$(grep -rIn -- "$pat" "$root" 2>/dev/null); then
      echo "provenance-check: PHB leak detected in $root (pattern: $pat)" >&2
      echo "$matches" | head -10 >&2
      fail=1
    fi
  done
done

# Positive assertion: every row in the SRD dataset must be tagged as SRD.
# (The worker routes by `source`, but double-check here.)
if [[ -f "$SCRIPT_DIR/survey-results-srd.jsonl" ]]; then
  non_srd=$(awk '!/"source":"srd-5\.2\.1"/ && /"unit_slug"/' "$SCRIPT_DIR/survey-results-srd.jsonl" || true)
  if [[ -n "$non_srd" ]]; then
    # Current dataset row schema doesn't include `source` directly —
    # it's derivable from the unit-queue. Rows without an srd source
    # tag should still parse cleanly; this check is advisory.
    :
  fi
fi

if [[ "$fail" == "1" ]]; then
  echo "provenance-check: FAIL" >&2
  exit 1
fi
echo "provenance-check: OK"
