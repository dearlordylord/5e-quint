#!/usr/bin/env bash
# Per-unit worker. Processes ONE queue row end-to-end:
#   1. Extract unit text from its anchor.
#   2. Build prompt from template + substitutions.
#   3. Spawn a per-worker scratch prototype dir.
#   4. Invoke the LLM backend (Claude or Codex) against the scratch.
#   5. Run the harness validator against the scratch.
#   6. Promote content/<slug>.{dhall,json,trace.md} back to the template dir.
#   7. Move result-<slug>.json / proposal-<slug>.md to the results dir.
#   8. Append the verdict row to the provenance-correct dataset.
#
# Invocation:
#   worker.sh '<one JSONL queue row>'
#
# Required environment:
#   REPO_ROOT              — absolute path to the repo root
#   SCRIPTS_DIR            — absolute path to this script's directory
#
# Backend selection (env):
#   SURVEY_BACKEND         — "claude" (default) or "codex"
#
# Claude-specific:
#   CLAUDE_CMD             — claude CLI command (default: "claude")
#   CLAUDE_MODEL           — model name (default: "sonnet")
#   CLAUDE_TIMEOUT_SECONDS — hard timeout (default: 600)
#
# Codex-specific:
#   CODEX_CMD              — codex CLI command (default: "codex")
#   CODEX_MODEL            — model name (default: unset → codex default)
#   CODEX_TIMEOUT_SECONDS  — hard timeout (default: 600)
#
# Shared:
#   DHALL_TO_JSON_CMD      — dhall-to-json command (default: "dhall-to-json")
#   MOCK_ENCODING_SRC      — optional; if set, skip LLM and copy this file
#                            into content/<slug>.json (for pipeline testing)

set -euo pipefail

REPO_ROOT="${REPO_ROOT:?REPO_ROOT must be set}"
SCRIPTS_DIR="${SCRIPTS_DIR:?SCRIPTS_DIR must be set}"
SURVEY_BACKEND="${SURVEY_BACKEND:-claude}"
CLAUDE_CMD="${CLAUDE_CMD:-claude}"
CLAUDE_MODEL="${CLAUDE_MODEL:-sonnet}"
CLAUDE_TIMEOUT_SECONDS="${CLAUDE_TIMEOUT_SECONDS:-600}"
CODEX_CMD="${CODEX_CMD:-codex}"
CODEX_MODEL="${CODEX_MODEL:-}"
CODEX_TIMEOUT_SECONDS="${CODEX_TIMEOUT_SECONDS:-600}"
DHALL_TO_JSON_CMD="${DHALL_TO_JSON_CMD:-dhall-to-json}"
FORCE="${FORCE:-0}"
export PATH="$HOME/.local/bin:$PATH"

ROW="${1:?usage: worker.sh '<queue row JSON>'}"

slug=$(jq -r .slug <<<"$ROW")
name=$(jq -r .name <<<"$ROW")
source=$(jq -r .source <<<"$ROW")
kind=$(jq -r .kind <<<"$ROW")
anchor_json=$(jq -c .anchor <<<"$ROW")

# -------- provenance routing --------
# PHB units go to the research repo, never main repo. TEMPLATE_DIR is
# the canonical prototype (where successful encodings accumulate);
# WORKSPACE is the per-worker scratch so parallel workers don't clobber
# each other's result.json / content writes.

if [[ "$source" == "srd-5.2.1" ]]; then
  TEMPLATE_DIR="$REPO_ROOT/packages/surface"
  RESULTS_DIR="$SCRIPTS_DIR/results-srd"
  DATASET="$SCRIPTS_DIR/survey-results-srd.jsonl"
else
  # Any non-SRD source (xphb-only, tce, xge, phb, scc, ...) routes into
  # the research workspace per the provenance rule. PHB / supplementary
  # text never enters the main repo.
  TEMPLATE_DIR="$REPO_ROOT/.references/xphb-srd-pairing/phb-survey/workspace"
  RESULTS_DIR="$REPO_ROOT/.references/xphb-srd-pairing/phb-survey/results"
  DATASET="$REPO_ROOT/.references/xphb-srd-pairing/phb-survey/survey-results-phb.jsonl"
  if [[ ! -d "$TEMPLATE_DIR" ]]; then
    mkdir -p "$TEMPLATE_DIR"
    rsync -a --exclude node_modules --exclude 'content/*.trace.md' \
      "$REPO_ROOT/packages/surface/" "$TEMPLATE_DIR/"
  fi
  ln -sfn "$REPO_ROOT/packages/surface/node_modules" "$TEMPLATE_DIR/node_modules"
fi

mkdir -p "$RESULTS_DIR/$slug"

# -------- per-worker scratch directory --------
# Keyed on slug+PID so concurrent retries don't collide. Cleaned on
# exit. node_modules is symlinked so we don't copy the big pnpm tree.

WORKSPACE="$SCRIPTS_DIR/workers/$$-$slug"
cleanup() { rm -rf "$WORKSPACE"; }
trap cleanup EXIT

mkdir -p "$(dirname "$WORKSPACE")"
rm -rf "$WORKSPACE"
mkdir -p "$WORKSPACE"
# Seed scratch from the canonical template. Exclude node_modules (large
# and symlinked instead), trace files (regenerated), and any stray
# result*/proposal* files from prior worker runs so the new worker
# starts with a clean slate.
rsync -a \
  --exclude node_modules \
  --exclude 'content/*.trace.md' \
  --exclude 'result.json' --exclude 'result-*.json' \
  --exclude 'proposal.md' --exclude 'proposal-*.md' \
  "$TEMPLATE_DIR/" "$WORKSPACE/"
ln -sfn "$TEMPLATE_DIR/node_modules" "$WORKSPACE/node_modules"
# Start each rerun from a clean slate for the target slug. Otherwise a
# previously promoted content/<slug>.json can survive in the scratch and
# masquerade as a freshly-authored artifact when the model intentionally
# stops before writing one.
rm -f \
  "$WORKSPACE/content/$slug.dhall" \
  "$WORKSPACE/content/$slug.json" \
  "$WORKSPACE/content/$slug.trace.md"

# -------- extract unit text --------

text=$(pnpm --filter @dnd/surface exec tsx \
  "$SCRIPTS_DIR/extract-unit-text.ts" --anchor-json "$anchor_json")

# -------- build prompt --------

prompt_path="$RESULTS_DIR/$slug/prompt.md"

# -------- inline reference files into prompt (cache-friendly) --------
# All reference material is inlined so the agent never needs Read tool
# calls for context. The static prefix is identical across all units,
# enabling Anthropic prompt caching (5-min TTL).

PROTO_DIR="$REPO_ROOT/packages/surface"
REF_TYPES_TS=$(cat "$PROTO_DIR/src/surface/types.ts")
REF_TRACER_TS=$(cat "$PROTO_DIR/src/interpreter/tracer.ts")
REF_BLESS_DHALL=$(cat "$PROTO_DIR/content/bless.dhall")
REF_BLESS_JSON=$(cat "$PROTO_DIR/content/bless.json")
REF_ACTION_SURGE_DHALL=$(cat "$PROTO_DIR/content/action_surge.dhall")
REF_ACTION_SURGE_JSON=$(cat "$PROTO_DIR/content/action_surge.json")
REF_TAXONOMY_MD=$(cat "$REPO_ROOT/.references/xphb-srd-pairing/TAXONOMY_atoms_graph.md")

# awk can't handle multi-line gsub with embedded newlines in variables.
# Use a two-pass approach: awk for single-line subs, then sed for
# multi-line reference blocks via placeholder markers.
awk -v name="$name" -v slug="$slug" -v kind="$kind" -v prov="$source" -v text="$text" '
  {
    gsub(/\{\{UNIT_NAME\}\}/, name)
    gsub(/\{\{UNIT_SLUG\}\}/, slug)
    gsub(/\{\{UNIT_KIND\}\}/, kind)
    gsub(/\{\{UNIT_PROVENANCE\}\}/, prov)
    gsub(/\{\{UNIT_TEXT\}\}/, text)
    print
  }
' "$SCRIPTS_DIR/prompt-template.md" > "$prompt_path.tmp"

# Replace multi-line reference placeholders using python (handles
# arbitrary content without sed escaping issues).
python3 -c "
import sys
template = open(sys.argv[1]).read()
subs = {
    '{{TYPES_TS}}': open(sys.argv[2]).read(),
    '{{TRACER_TS}}': open(sys.argv[3]).read(),
    '{{BLESS_DHALL}}': open(sys.argv[4]).read(),
    '{{BLESS_JSON}}': open(sys.argv[5]).read(),
    '{{ACTION_SURGE_DHALL}}': open(sys.argv[6]).read(),
    '{{ACTION_SURGE_JSON}}': open(sys.argv[7]).read(),
    '{{ALERT_DHALL}}': open(sys.argv[8]).read(),
    '{{ALERT_JSON}}': open(sys.argv[9]).read(),
    '{{DARKVISION_ELF_DHALL}}': open(sys.argv[10]).read(),
    '{{DARKVISION_ELF_JSON}}': open(sys.argv[11]).read(),
    '{{CLOAK_OF_PROTECTION_DHALL}}': open(sys.argv[12]).read(),
    '{{CLOAK_OF_PROTECTION_JSON}}': open(sys.argv[13]).read(),
    '{{TAXONOMY_MD}}': open(sys.argv[14]).read(),
}
for k, v in subs.items():
    template = template.replace(k, v)
print(template, end='')
" "$prompt_path.tmp" \
  "$PROTO_DIR/src/surface/types.ts" \
  "$PROTO_DIR/src/interpreter/tracer.ts" \
  "$PROTO_DIR/content/bless.dhall" \
  "$PROTO_DIR/content/bless.json" \
  "$PROTO_DIR/content/action_surge.dhall" \
  "$PROTO_DIR/content/action_surge.json" \
  "$PROTO_DIR/content/alert.dhall" \
  "$PROTO_DIR/content/alert.json" \
  "$PROTO_DIR/content/darkvision_elf.dhall" \
  "$PROTO_DIR/content/darkvision_elf.json" \
  "$PROTO_DIR/content/cloak_of_protection.dhall" \
  "$PROTO_DIR/content/cloak_of_protection.json" \
  "$REPO_ROOT/.references/xphb-srd-pairing/TAXONOMY_atoms_graph.md" \
  > "$prompt_path"
rm -f "$prompt_path.tmp"

# -------- invoke LLM backend (or mock) --------
# timeout(1) kills the subprocess tree (--kill-after adds SIGKILL 10s
# after SIGTERM if the CLI ignores the term). Exit code 124 = timeout.
#
# Rate-limit handling (Claude): api_error_status 429 in claude-out.json
# → sleep RATE_LIMIT_SLEEP then retry up to MAX_RETRIES times.
# Rate-limit handling (Codex): no structured 429 detection yet; exit
# code ≠ 0 falls through to a refused verdict.

RATE_LIMIT_SLEEP="${RATE_LIMIT_SLEEP:-19800}"   # 5.5 hours (default)
MAX_RETRIES="${MAX_RETRIES:-3}"

backend_log="$RESULTS_DIR/$slug/${SURVEY_BACKEND}-out.json"

invoke_backend() {
  set +e
  case "$SURVEY_BACKEND" in
    claude)
      (
        cd "$WORKSPACE"
        # Prompt is piped on stdin — `"$(cat ...)"` as argv exceeds ARG_MAX
        # once inline reference material grows past ~100KB.
        #
        # --strict-mcp-config with no --mcp-config = no MCP servers loaded.
        # Prevents the per-invocation MCP child process leak that
        # accumulated GB of memory across parallel workers and
        # OOM-killed prior re-mine runs.
        # (--bare was considered but it disables keychain auth, forcing
        # ANTHROPIC_API_KEY; dropping it keeps OAuth login working.)
        timeout --kill-after=10s "$CLAUDE_TIMEOUT_SECONDS" \
          "$CLAUDE_CMD" --model "$CLAUDE_MODEL" --print --output-format json \
            --dangerously-skip-permissions \
            --strict-mcp-config \
            --exclude-dynamic-system-prompt-sections \
            < "$prompt_path" \
            > "$backend_log" 2>&1
      )
      backend_exit=$?
      ;;
    codex)
      local -a codex_args=(exec --dangerously-bypass-approvals-and-sandbox
        -C "$WORKSPACE" --ephemeral)
      [[ -n "$CODEX_MODEL" ]] && codex_args+=(-m "$CODEX_MODEL")
      timeout --kill-after=10s "$CODEX_TIMEOUT_SECONDS" \
        "$CODEX_CMD" "${codex_args[@]}" - \
        < "$prompt_path" \
        > "$backend_log" 2>&1
      backend_exit=$?
      ;;
    *)
      echo "worker.sh: unknown SURVEY_BACKEND=$SURVEY_BACKEND" >&2
      exit 2
      ;;
  esac
  set -e
}

is_rate_limited() {
  case "$SURVEY_BACKEND" in
    claude) grep -q '"api_error_status":429' "$backend_log" 2>/dev/null ;;
    codex)  false ;;  # no structured 429 detection for codex yet
  esac
}

result_file="result-$slug.json"
proposal_file="proposal-$slug.md"
verdict_file="$RESULTS_DIR/$slug/verdict.json"

backend_exit=0
if [[ -n "${MOCK_ENCODING_SRC:-}" ]]; then
  cp "$MOCK_ENCODING_SRC" "$WORKSPACE/content/$slug.json"
  cat > "$WORKSPACE/$result_file" <<EOF
{"unit_slug":"$slug","outcome":"clean","atoms_used":[],"relations_used":[],"proposed_widenings":[],"confidence":"high","notes":"mock mode — encoding copied from $MOCK_ENCODING_SRC"}
EOF
else
  retry=0
  while true; do
    invoke_backend
    if [[ $backend_exit -eq 0 ]]; then break; fi
    if is_rate_limited && [[ $retry -lt $MAX_RETRIES ]]; then
      retry=$((retry + 1))
      echo "worker.sh: rate limit on $slug (retry $retry/$MAX_RETRIES); sleeping ${RATE_LIMIT_SLEEP}s" >&2
      sleep "$RATE_LIMIT_SLEEP"
      continue
    fi
    break
  done

  if [[ $backend_exit -eq 124 ]]; then
    echo "worker.sh: $SURVEY_BACKEND timed out after timeout for $slug" >&2
    cat > "$WORKSPACE/$result_file" <<EOF
{"unit_slug":"$slug","outcome":"refused","atoms_used":[],"relations_used":[],"proposed_widenings":[],"confidence":"low","notes":"$SURVEY_BACKEND timed out"}
EOF
  elif [[ $backend_exit -ne 0 ]]; then
    if is_rate_limited; then
      echo "worker.sh: $SURVEY_BACKEND rate-limited on $slug after $MAX_RETRIES retries" >&2
      cat > "$WORKSPACE/$result_file" <<EOF
{"unit_slug":"$slug","outcome":"refused","atoms_used":[],"relations_used":[],"proposed_widenings":[],"confidence":"low","notes":"$SURVEY_BACKEND rate-limited after $MAX_RETRIES retries"}
EOF
    else
      echo "worker.sh: $SURVEY_BACKEND exited $backend_exit for $slug" >&2
      cat > "$WORKSPACE/$result_file" <<EOF
{"unit_slug":"$slug","outcome":"refused","atoms_used":[],"relations_used":[],"proposed_widenings":[],"confidence":"low","notes":"$SURVEY_BACKEND exited $backend_exit"}
EOF
    fi
  fi
fi

# -------- harvest result/proposal from template if claude resolved relative paths there --------
# Claude CLI may resolve a relative filename to the template dir (the
# ancestor with CLAUDE.md / .claude/) regardless of the subshell's
# actual cwd. Move files whose unit_slug matches this worker's slug
# into WORKSPACE so validate.ts can read them. Only move slug-matching
# files — unprefixed/mismatched ones belong to a concurrent worker.

harvest_from_template() {
  local dest="$1"
  for candidate in "$TEMPLATE_DIR/result-$slug.json" "$TEMPLATE_DIR/result.json"; do
    if [[ -f "$candidate" ]]; then
      local file_slug
      file_slug=$(jq -r '.unit_slug // ""' "$candidate" 2>/dev/null || echo "")
      if [[ "$file_slug" == "$slug" ]]; then
        mv "$candidate" "$dest/result-$slug.json"
        return 0
      fi
    fi
  done
  return 1
}

harvest_proposal_from_template() {
  # proposal.md has no unit_slug field; we can only harvest the
  # slug-prefixed variant (unprefixed is unattributable).
  local candidate="$TEMPLATE_DIR/proposal-$slug.md"
  if [[ -f "$candidate" ]]; then
    mv "$candidate" "$WORKSPACE/proposal-$slug.md"
  fi
}

harvest_from_template "$WORKSPACE" || true
harvest_proposal_from_template

# -------- harvest content files from template dir --------
# Claude CLI resolves its project root via CLAUDE.md ancestry, which
# points at TEMPLATE_DIR rather than the per-worker WORKSPACE. Content
# files (dhall, json, trace.md) therefore land in the template dir.
# Move them into WORKSPACE so validation finds them.

for ext in dhall json trace.md; do
  candidate="$TEMPLATE_DIR/content/$slug.$ext"
  if [[ -f "$candidate" ]]; then
    mv "$candidate" "$WORKSPACE/content/$slug.$ext"
  fi
done

# -------- fallback: extract result from Claude text output --------
# When inline context lets Claude classify without tool use, it reports
# the verdict in its text output but skips writing result-<slug>.json.
# Extract the outcome from the text and synthesize a result file.

if [[ ! -f "$WORKSPACE/$result_file" ]] && [[ -f "$backend_log" ]]; then
  claude_text=$(jq -r '.result // ""' "$backend_log" 2>/dev/null)
  if [[ -n "$claude_text" ]]; then
    # Priority 1: match an explicit self-verdict statement, e.g.
    #   "outcome: **`surface_widening`**"
    #   "verdict: surface_widening"
    # These agent-author statements are the canonical verdict; the raw
    # keyword may appear many times in the reasoning (e.g. "previously
    # classified as structural_widening" when the real verdict is
    # surface_widening). A declarative line wins over a keyword scan.
    extracted_outcome=$(
      echo "$claude_text" \
      | grep -iEo '(outcome|verdict|classification)[[:space:]]*[:=][[:space:]]*[*`]*(dm_agenda|structural_widening|atom_widening|surface_widening|clean|refused)[*`]*' \
      | head -1 \
      | grep -iEo '(dm_agenda|structural_widening|atom_widening|surface_widening|clean|refused)'
    )
    # Priority 2: fall back to keyword scan in NARROWEST-first order so
    # an agent discussing multiple outcome tiers picks the most specific
    # label when no explicit verdict statement exists.
    if [[ -z "$extracted_outcome" ]]; then
      for outcome in clean dm_agenda surface_widening atom_widening structural_widening refused; do
        if echo "$claude_text" | grep -qi "$outcome"; then
          extracted_outcome="$outcome"
          break
        fi
      done
    fi
    if [[ -n "$extracted_outcome" ]]; then
      echo "worker.sh: synthesizing $result_file from text output (outcome=$extracted_outcome)" >&2
      cat > "$WORKSPACE/$result_file" <<EOF
{"unit_slug":"$slug","outcome":"$extracted_outcome","atoms_used":[],"relations_used":[],"proposed_widenings":[],"confidence":"medium","notes":"auto-extracted from Claude text output — agent did not write result file"}
EOF
    fi
  fi
fi

# -------- validate --------

if [[ -f "$WORKSPACE/content/$slug.dhall" ]]; then
  "$DHALL_TO_JSON_CMD" \
    --file "$WORKSPACE/content/$slug.dhall" \
    --output "$WORKSPACE/content/$slug.json"
fi

pnpm --filter @dnd/surface exec tsx \
  "$SCRIPTS_DIR/validate.ts" \
  --slug "$slug" \
  --prototype-dir "$WORKSPACE" \
  --out "$verdict_file"

# -------- promote successful encoding back to template --------
# Only copy if the worker actually wrote a JSON file. This lets future
# workers reference the new encoding from bless.json / acid_splash.json /
# etc., and keeps the template directory as the accumulated SRD corpus.

if [[ -f "$WORKSPACE/content/$slug.dhall" ]]; then
  cp "$WORKSPACE/content/$slug.dhall" "$TEMPLATE_DIR/content/$slug.dhall"
fi

if [[ -f "$WORKSPACE/content/$slug.json" ]]; then
  cp "$WORKSPACE/content/$slug.json" "$TEMPLATE_DIR/content/$slug.json"
  # Regenerate the trace in the template so reviewers see up-to-date
  # mermaid. Ignore failures — the template may have stale types.ts
  # relative to the worker's view (unlikely in normal operation).
  (
    cd "$TEMPLATE_DIR"
    pnpm exec tsx src/run.ts "content/$slug.json" \
      --out "content/$slug.trace.md" >/dev/null 2>&1 || true
  )
fi

# -------- overwrite dataset row on force, append only successful verdicts --------
# Failed units (refused / invalid) should not claim a dataset row; they
# remain eligible for rerun on the next orchestrator invocation. Forced
# reruns first remove any existing row for this slug, then re-add it
# only if the new verdict is successful.

verdict=$(jq -r '.verdict // ""' "$verdict_file")
should_record=0
case "$verdict" in
  clean|surface_widening|atom_widening|structural_widening|dm_agenda)
    should_record=1
    ;;
  refused|invalid)
    echo "worker.sh: not recording failed verdict for $slug (verdict=$verdict)" >&2
    ;;
  *)
    echo "worker.sh: unknown verdict '$verdict' for $slug; not recording dataset row" >&2
    ;;
esac

{
  flock -w 30 200
  # Only replace the prior row if we actually have a new row to record.
  # Without this guard, a `--force` re-mine whose fresh verdict is
  # `refused`/`invalid` deletes the old row but appends nothing, losing
  # the slug entirely from the dataset.
  if [[ "$FORCE" == "1" && "$should_record" == "1" && -f "$DATASET" ]]; then
    tmp_dataset=$(mktemp "${DATASET}.tmp.XXXXXX")
    # Dataset rows are one-line JSON objects separated by blank lines.
    # Remove any prior row for this slug, leaving other rows untouched.
    awk -v slug="$slug" '
      $0 ~ "\"unit_slug\":\"" slug "\"" { next }
      { print }
    ' "$DATASET" > "$tmp_dataset"
    mv "$tmp_dataset" "$DATASET"
  fi

  if [[ "$should_record" == "1" ]]; then
      cat "$verdict_file" >> "$DATASET"
      echo "" >> "$DATASET"
  fi
} 200>"$DATASET.lock"

# -------- move result-<slug>.json / proposal-<slug>.md alongside the verdict --------
# Claude is prompted to write slug-prefixed names; fall back to plain
# names (for paranoia / legacy behavior) and rename them on move. Also
# sweep the template dir in case Claude resolved a relative path there.

move_if_exists() {
  local src="$1"; local dest="$2"
  [[ -f "$src" ]] && mv "$src" "$dest"
}

move_if_exists "$WORKSPACE/$result_file" "$RESULTS_DIR/$slug/result.json"
move_if_exists "$WORKSPACE/$proposal_file" "$RESULTS_DIR/$slug/proposal.md"
# Fallback: any unprefixed result.json / proposal.md the model wrote.
move_if_exists "$WORKSPACE/result.json" "$RESULTS_DIR/$slug/result.json"
move_if_exists "$WORKSPACE/proposal.md" "$RESULTS_DIR/$slug/proposal.md"
# Older runs sometimes wrote into a nested survey path under the
# prototype package itself. Sweep both workspace and template copies.
for base in "$WORKSPACE" "$TEMPLATE_DIR"; do
  nested="$base/scripts/content-surface-survey/results-srd/$slug"
  move_if_exists "$nested/result.json" "$RESULTS_DIR/$slug/result.json"
  move_if_exists "$nested/proposal.md" "$RESULTS_DIR/$slug/proposal.md"
  move_if_exists "$nested/verdict.json" "$RESULTS_DIR/$slug/verdict.json"
done
# Defensive: sweep the template dir of any result/proposal file whose
# unit_slug matches this worker's slug. Do NOT sweep mismatched slugs —
# those belong to a concurrent worker.
for candidate in "$TEMPLATE_DIR/result-$slug.json" "$TEMPLATE_DIR/proposal-$slug.md"; do
  if [[ -f "$candidate" ]]; then
    ext="${candidate##*.}"
    if [[ "$ext" == "json" ]]; then
      move_if_exists "$candidate" "$RESULTS_DIR/$slug/result.json"
    else
      move_if_exists "$candidate" "$RESULTS_DIR/$slug/proposal.md"
    fi
  fi
done
# Also sweep unprefixed template result.json if its unit_slug matches.
if [[ -f "$TEMPLATE_DIR/result.json" ]]; then
  file_slug=$(jq -r '.unit_slug // ""' "$TEMPLATE_DIR/result.json" 2>/dev/null || echo "")
  if [[ "$file_slug" == "$slug" ]]; then
    move_if_exists "$TEMPLATE_DIR/result.json" "$RESULTS_DIR/$slug/result.json"
    move_if_exists "$TEMPLATE_DIR/proposal.md" "$RESULTS_DIR/$slug/proposal.md"
  fi
fi

echo "worker.sh: done $slug (source=$source, backend=$SURVEY_BACKEND, exit=$backend_exit)" >&2
