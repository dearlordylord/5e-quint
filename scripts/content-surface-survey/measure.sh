#!/usr/bin/env bash
# measure.sh — evaluate the loop against the historical loop acceptance
# criteria. Emits one line per criterion
# with ✓ (pass) or ✗ (fail) + the underlying number. One-shot, no args.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="$REPO_ROOT/.output/content-surface-closure"
INTEGRATION_BRANCH="${AUTO_INTEGRATION_BRANCH:-auto-close-loop-integration}"
QUEUE="$SCRIPT_DIR/unit-queue.jsonl"
HISTORY="$OUT_DIR/auto-close-loop.history.jsonl"
FAILED="$OUT_DIR/failed-surface-attempts.jsonl"

pass() { printf "  ✓ %-40s %s\n" "$1" "$2"; }
fail() { printf "  ✗ %-40s %s\n" "$1" "$2"; }
info() { printf "  · %-40s %s\n" "$1" "$2"; }

now_utc=$(date -u -Iseconds)
hour_ago_utc=$(date -u -d "1 hour ago" -Iseconds)
printf "measure.sh — %s\n\n" "$now_utc"

# --- pace criteria ---
printf "PACE (criteria 1-6)\n"

# 1. commit_rate_1h >= 20
cr=$(git -C "$REPO_ROOT" log --since="1 hour ago" --oneline "$INTEGRATION_BRANCH" ^master 2>/dev/null | wc -l | tr -d ' ')
[[ "$cr" -ge 20 ]] && pass "commit_rate_1h" "$cr (≥ 20)" || fail "commit_rate_1h" "$cr (need ≥ 20)"

# 2. cluster_diversity_last20 >= 6
cd20=$(git -C "$REPO_ROOT" log -20 --format=%s "$INTEGRATION_BRANCH" 2>/dev/null \
  | sed -nE 's/^chore\(survey\): close-loop batch [0-9]+ //p' \
  | sort -u | wc -l | tr -d ' ')
[[ "$cd20" -ge 6 ]] && pass "cluster_diversity_last20" "$cd20 unique (≥ 6)" || fail "cluster_diversity_last20" "$cd20 unique (need ≥ 6)"

# 3. revert_rate_1h <= 10
if [[ -f "$FAILED" ]]; then
  rr=$(jq -r --arg t "$hour_ago_utc" 'select(.recordedAt >= $t) | .recordedAt' "$FAILED" 2>/dev/null | wc -l | tr -d ' ')
else
  rr=0
fi
[[ "$rr" -le 10 ]] && pass "revert_rate_1h" "$rr (≤ 10)" || fail "revert_rate_1h" "$rr (need ≤ 10)"

# 4. worker_productivity_pct >= 30 per worker
printf "  worker_productivity_pct (≥ 30 each):\n"
for f in "$OUT_DIR"/*.state.json; do
  [[ -f "$f" ]] || continue
  name=$(basename "$f" .state.json)
  # improvedBatches is cumulative across recycles; batch resets. Denominator =
  # max(current batch, improvedBatches + noImproveStreak + errorStreak) so the
  # ratio reflects lifetime work while capping at 100 %.
  pct=$(jq -r '
    (.improvedBatches // 0) as $imp
    | (.batch // 0) as $b
    | (.noImproveStreak // 0) as $no
    | (.errorStreak // 0) as $er
    | ([$b, $imp + $no + $er] | max) as $denom
    | if $denom == 0 then 0 else ([100, ($imp / $denom * 100 | floor)] | min) end
  ' "$f")
  kind=$(jq -r '.kind // "all"' "$f")
  if [[ "$pct" -ge 30 ]]; then
    printf "    ✓ %-32s %3d %% (kind=%s)\n" "$name" "$pct" "$kind"
  else
    printf "    ✗ %-32s %3d %% (kind=%s, need ≥ 30)\n" "$name" "$pct" "$kind"
  fi
done

# 5. stuck_cluster_max_retries <= 3
max_retry=0
max_retry_key=""
for f in "$OUT_DIR"/*.state.json; do
  [[ -f "$f" ]] || continue
  row=$(jq -r '(.clusterFailures // {}) | to_entries | max_by(.value) | "\(.key // "-"):\(.value // 0)"' "$f" 2>/dev/null)
  val="${row##*:}"
  if [[ -n "$val" && "$val" =~ ^[0-9]+$ && "$val" -gt "$max_retry" ]]; then
    max_retry="$val"
    max_retry_key="$(basename "$f" .state.json)/${row%:*}"
  fi
done
[[ "$max_retry" -le 3 ]] && pass "stuck_cluster_max_retries" "$max_retry ($max_retry_key)" || fail "stuck_cluster_max_retries" "$max_retry ($max_retry_key, need ≤ 3)"

# 6. kind_debt_range_last15 < 5 per active kind
if [[ -f "$HISTORY" ]]; then
  printf "  kind_debt_range_last15 (floor if < 5):\n"
  jq -r '.kind // "all"' "$HISTORY" | sort -u | while read -r kind; do
    [[ -z "$kind" ]] && continue
    range=$(jq -r --arg k "$kind" 'select((.kind // "all") == $k) | .weightedDebt' "$HISTORY" | tail -15 \
      | awk 'BEGIN{mn=99999;mx=-1} {if($1<mn)mn=$1; if($1>mx)mx=$1} END{if(NR>0)print mx-mn; else print "na"}')
    if [[ "$range" == "na" ]]; then
      printf "    · %-32s no data\n" "$kind"
    elif [[ "$range" -lt 5 ]]; then
      printf "    ✓ %-32s range=%d (floor reached)\n" "$kind" "$range"
    else
      printf "    · %-32s range=%d (still descending)\n" "$kind" "$range"
    fi
  done
fi

printf "\nSESSION EXIT (success criteria)\n"

# integration_commits_vs_master
ic=$(git -C "$REPO_ROOT" log --oneline "$INTEGRATION_BRANCH" ^master 2>/dev/null | wc -l | tr -d ' ')
[[ "$ic" -ge 300 ]] && pass "integration_commits_vs_master" "$ic (≥ 300)" || info "integration_commits_vs_master" "$ic (goal 300)"

# cluster_diversity_all
cd_all=$(git -C "$REPO_ROOT" log --format=%s "$INTEGRATION_BRANCH" ^master 2>/dev/null \
  | sed -nE 's/^chore\(survey\): close-loop batch [0-9]+ //p' \
  | sort -u | wc -l | tr -d ' ')
[[ "$cd_all" -ge 20 ]] && pass "cluster_diversity_all" "$cd_all unique (≥ 20)" || info "cluster_diversity_all" "$cd_all unique (goal 20)"

# parked_clusters_total
pt=$(for f in "$OUT_DIR"/*.state.json; do jq -r '(.parkedClusters // []) | length' "$f" 2>/dev/null; done | awk '{s+=$1} END{print s+0}')
[[ "$pt" -ge 1 ]] && pass "parked_clusters_total" "$pt (≥ 1, Layer 2 engaged)" || info "parked_clusters_total" "$pt (goal ≥ 1)"

# verdict_coverage_pct
if [[ -f "$QUEUE" ]]; then
  total=$(wc -l < "$QUEUE" | tr -d ' ')
  covered=$(find "$SCRIPT_DIR/results-srd" -name verdict.json 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$total" -gt 0 ]]; then
    pct=$(( covered * 100 / total ))
    [[ "$pct" -ge 80 ]] && pass "verdict_coverage_pct" "$pct% ($covered/$total, ≥ 80)" || info "verdict_coverage_pct" "$pct% ($covered/$total, goal 80)"
  fi
fi

printf "\nANTI-PATTERNS\n"

# dominant_cluster_share in last 30 min (>= 0.5 is bad — simpler proxy than 3-window)
thirty_ago=$(date -u -d "30 minutes ago" -Iseconds)
readarray -t recent_msgs < <(git -C "$REPO_ROOT" log --since="30 minutes ago" --format=%s "$INTEGRATION_BRANCH" 2>/dev/null \
  | sed -nE 's/^chore\(survey\): close-loop batch [0-9]+ //p')
if [[ "${#recent_msgs[@]}" -gt 0 ]]; then
  top_count=$(printf "%s\n" "${recent_msgs[@]}" | sort | uniq -c | sort -rn | head -1 | awk '{print $1}')
  total_msgs=${#recent_msgs[@]}
  share=$(( top_count * 100 / total_msgs ))
  top_cluster=$(printf "%s\n" "${recent_msgs[@]}" | sort | uniq -c | sort -rn | head -1 | sed -E 's/^ +[0-9]+ +//')
  if [[ "$share" -ge 50 && "$total_msgs" -ge 6 ]]; then
    fail "dominant_cluster_share_30m" "$share% (\"$top_cluster\" claims $top_count/$total_msgs)"
  else
    pass "dominant_cluster_share_30m" "$share% (\"$top_cluster\" $top_count/$total_msgs)"
  fi
else
  info "dominant_cluster_share_30m" "0 commits in window"
fi

# commits_per_kind_imbalance (max/min over pools ≥ 10 queue units)
declare -A kind_commits=()
readarray -t all_msgs < <(git -C "$REPO_ROOT" log --format=%s "$INTEGRATION_BRANCH" ^master 2>/dev/null)
# we don't tag kind in commit msg; read from history.jsonl instead
if [[ -f "$HISTORY" ]]; then
  max_k=0; min_k=999999; max_kind=""; min_kind=""
  for kind in $(jq -r '.kind // "all"' "$HISTORY" | sort -u); do
    [[ -z "$kind" || "$kind" == "all" ]] && continue
    # commits per kind ≈ improved batches for that kind
    c=$(jq -r --arg k "$kind" 'select((.kind // "all") == $k) | .summary.improved // 0' "$HISTORY" \
      | awk '{s+=$1} END{print s+0}')
    queue_count=$(jq -r --arg k "$kind" 'select(.kind == $k) | .unit_slug // empty' "$QUEUE" 2>/dev/null | wc -l | tr -d ' ')
    [[ "$queue_count" -lt 10 ]] && continue
    if [[ "$c" -gt "$max_k" ]]; then max_k="$c"; max_kind="$kind"; fi
    if [[ "$c" -lt "$min_k" && "$c" -gt 0 ]]; then min_k="$c"; min_kind="$kind"; fi
  done
  if [[ "$min_k" == 999999 || "$max_k" == 0 ]]; then
    info "commits_per_kind_imbalance" "insufficient data"
  else
    ratio=$(( max_k / min_k ))
    if [[ "$ratio" -gt 5 ]]; then
      fail "commits_per_kind_imbalance" "$ratio× (max=$max_k($max_kind), min=$min_k($min_kind))"
    else
      pass "commits_per_kind_imbalance" "$ratio× (max=$max_k($max_kind), min=$min_k($min_kind))"
    fi
  fi
fi

# integration_branch_diverged
bh=$(git -C "$REPO_ROOT" rev-parse "$INTEGRATION_BRANCH" 2>/dev/null)
iwt="$REPO_ROOT/.worktrees/auto-close-loop-integration"
if [[ -d "$iwt" ]]; then
  ih=$(git -C "$iwt" rev-parse HEAD 2>/dev/null)
  [[ "$bh" == "$ih" ]] && pass "integration_branch_diverged" "branch and worktree match ($bh)" || fail "integration_branch_diverged" "branch=$bh worktree=$ih"
else
  info "integration_branch_diverged" "no integration worktree"
fi

# slug_regression_committed — scan closure reports for committed regressions
# (reports represent BATCHES that may have been reverted; we consider only those
#  where summary.improved > 0 or changed > 0 and there's a slug going from better
#  to worse weight. The keep-or-revert should prevent this on committed batches,
#  but we sanity-check the whole .output/ trail.)
regressions=$(
  for f in "$OUT_DIR"/*.json; do
    [[ -f "$f" ]] || continue
    jq -r '
      . as $r
      | ($r.summary.improved // 0) as $imp
      | select($imp > 0 or ($r.summary.changed // 0) == 0)  # only committed-like reports
      | ($r.deltas // []) | map(
          . as $d
          | {
              "clean":0, "dm_agenda":0, "refused":1, "surface_widening":2,
              "invalid":2, "atom_widening":3, "structural_widening":4
            } as $w
          | if ($w[$d.before // ""] // null) != null and
               ($w[$d.after  // ""] // null) != null and
               $w[$d.after] > $w[$d.before]
            then "\($d.slug):\($d.before)→\($d.after)"
            else empty
            end
        ) | .[]
    ' "$f" 2>/dev/null
  done | head -5
)
if [[ -z "$regressions" ]]; then
  pass "slug_regression_committed" "none found"
else
  fail "slug_regression_committed" "found"
  echo "$regressions" | sed 's/^/    /'
fi

printf "\n"
