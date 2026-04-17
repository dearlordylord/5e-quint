# Survey Convergence Workflow

Purpose: define the workflow that supersedes the current ad hoc
`survey -> human intuition -> types -> dhall -> rerun` loop for content-surface
convergence work.

This document does **not** replace Ralph. Ralph remains a general development
loop. This workflow is specific to content-surface convergence and survey-driven
closure.

## Why This Exists

The current survey pipeline is good at one thing: mining widening pressure.
It is weak at the rest of the loop:

1. grouping repeated widening pressure into reusable family gaps;
2. deciding which gap to close next;
3. turning a landed surface widening into authored validation refs;
4. rerunning previously-failing units to measure whether convergence happened.

As a result, the repo can accumulate widening proposals faster than it turns
them into clean reruns. This workflow exists to close that loop deliberately.

## Current Workflow

Current state is mostly manual after the survey emits data:

1. Run the survey.
2. Read `verdict.json`, `result.json`, and `proposal.md` by hand.
3. Notice repeated pressure by inspection.
4. Manually widen `types.ts`, tracer, and related code.
5. Manually author `.dhall` validation refs.
6. Manually rerun some affected units.
7. Manually judge whether convergence improved.

This is workable for early exploration, but it does not scale and it does not
produce a clean closure metric.

## Desired Workflow

The desired workflow is:

1. Survey units and collect authoritative dataset rows.
2. Cluster widening results into reusable family buckets.
3. Rank buckets by frequency and closure value.
4. Human selects one bucket and lands one reusable surface change.
5. Author one or more `.dhall` validation refs for that bucket.
6. Automatically rerun the affected units.
7. Measure closure:
   - how many prior widening units flipped to `clean`;
   - how many now reduce to a smaller follow-on gap;
   - how many remain unchanged.
8. Repeat until widening pressure collapses into a small residual set.

The key difference is that the survey becomes the input to a measured closure
loop, not just a generator of more proposals.

## Goals

- Optimize for reusable family-level convergence, not per-unit hacks.
- Make rerun-to-clean rate the primary convergence metric.
- Keep provenance routing correct:
  - SRD artifacts in the main repo;
  - PHB/XPHB-only artifacts in research paths only.
- Keep model usage bounded and deliberate.
- Preserve human review where architectural mistakes are expensive.

## Non-Goals

- Fully automatic mutation of `types.ts` or tracer from survey output.
- Automatically accepting a proposed widening from one unit verbatim.
- Treating PHB-only survey artifacts as shippable main-repo content.
- Replacing Ralph as the general-purpose dev loop.

## Design Principles

- Repeated pressure means a missing reusable abstraction, not a per-unit case.
- A widening is not "closed" until at least one prior widening unit reruns
  `clean`.
- New mined clean units are secondary evidence; rerun-to-clean is primary.
- Human approval remains required before surface-shape edits land.
- Survey work should be outside Ralph unless a specific development task needs
  it.

## Workflow Stages

### Stage 1: Survey

Inputs:

- `scripts/content-surface-survey/unit-queue.jsonl`
- current prototype surface (`types.ts`, tracer, validator)

Outputs:

- SRD dataset rows:
  - `scripts/content-surface-survey/survey-results-srd.jsonl`
- PHB/XPHB dataset rows:
  - `.references/xphb-srd-pairing/phb-survey/survey-results-phb.jsonl`
- per-unit results under the provenance-correct results paths

Authoritative outputs are the harness verdict rows, not the model's self-report.

### Stage 2: Cluster

Input:

- latest dataset rows

Output:

- a normalized cluster report such as:
  - cluster id
  - canonical widening family name
  - count of affected units
  - representative slugs
  - source mix (SRD vs PHB)
  - prior closure state if rerun before

This stage should aggressively normalize synonymous proposals. Example:

- `grant_spell_access`
- `spell_access_grant`
- `grant prepared spell`

should resolve to one cluster if they are the same underlying family gap.

### Stage 3: Decide Next Closure Target

Human approval gate.

Input:

- ranked widening clusters

Output:

- one selected closure target with:
  - scope;
  - owning files;
  - representative units to author/rerun;
  - "done" definition for closure.

The human chooses one reusable gap, not an arbitrary spell.

### Stage 4: Surface Change

Human-implemented or standard dev-loop-implemented.

Input:

- chosen closure target

Output:

- landed reusable surface change:
  - `types.ts`
  - tracer
  - validator/whitelist updates if needed
  - any supporting docs

This is the only place where surface-shape changes are allowed.

### Stage 5: Validation-Ref Authoring

Input:

- selected representative units from the target cluster

Output:

- authored `.dhall` refs in the correct provenance path:
  - SRD:
    - `packages/prototype-content-surface/content/<slug>.dhall`
  - PHB/XPHB:
    - `.references/xphb-srd-pairing/phb-survey/workspace/content/<slug>.dhall`

This stage is required. A surface widening without validation refs does not
count as convergence.

### Stage 6: Targeted Rerun

Input:

- selected representative units
- optionally all units in the affected cluster

Output:

- fresh verdict rows
- a closure report:
  - prior verdict
  - new verdict
  - changed / unchanged

Targeted reruns should prefer previously widening units over random new units.

### Stage 7: Closure Report

Input:

- rerun results

Output:

- cluster closure summary:
  - rerun count
  - clean count
  - residual widening count
  - follow-on cluster names if pressure compressed rather than vanished

This stage determines whether the loop advances to a new cluster or remains on
the same one.

## Convergence Metrics

Primary:

- rerun-to-clean rate on previously widening units

Secondary:

- reduction in count for the targeted widening cluster
- reduction in proposal entropy (fewer unique widening families)
- clean rate on new nearby units

Weak metric:

- raw count of `clean` units on newly mined units

Interpretation rule:

- if a widening lands but reruns do not flip to `clean`, the bottleneck is
  still unresolved;
- if reruns reduce from `structural_widening` to `surface_widening`, that is
  partial closure, not full closure.

## Automation Boundaries

Should be automated:

- survey execution
- dataset aggregation
- widening clustering
- ranking candidate closure targets
- selecting affected slugs for rerun
- rerun execution
- before/after closure reporting

Should remain human-gated:

- accepting a widening family as architecturally valid
- editing `types.ts` and tracer
- deciding whether a unit is genuinely caller-owned / DM-agenda
- deciding whether a PHB-only pressure should influence the shipped SRD surface

## Provenance and Licensing Caveats

Hard rule:

- SRD-shippable artifacts remain in main-repo paths only.
- PHB/XPHB-only artifacts remain in research paths only.

Concrete split:

- SRD survey data:
  - `scripts/content-surface-survey/results-srd/...`
  - `scripts/content-surface-survey/survey-results-srd.jsonl`
  - `packages/prototype-content-surface/content/...`
- PHB/XPHB survey data:
  - `.references/xphb-srd-pairing/phb-survey/results/...`
  - `.references/xphb-srd-pairing/phb-survey/survey-results-phb.jsonl`
  - `.references/xphb-srd-pairing/phb-survey/workspace/content/...`

The clustering and closure tools must preserve this routing. They may aggregate
across sources for analysis, but they must not write PHB-derived authored
content or survey artifacts into main-repo shipped paths.

## Limit and Cost Controls

The convergence workflow must be non-exuberant with model usage.

Rules:

- Never run survey work inside Ralph by default.
- Default survey backend should be explicit and configurable.
- Default concurrency should be conservative:
  - survey mining: `1` or `2` unless intentionally raised
  - rerun closure batches: small targeted slices
- Only one survey orchestrator may run at a time.
- Prefer targeted reruns over whole-tier reruns after the initial baseline pass.
- Stop and report if a run exhibits:
  - repeated timeouts;
  - repeated rate limits;
  - process-linger behavior that materially exceeds useful work time.
- Avoid rerunning units already known-clean unless they are part of the explicit
  closure sample.

Desired tooling behavior:

- support `--slug`, `--cluster`, and `--limit` targeting;
- support "rerun only previously widening units in this cluster";
- support "stop after first N failures" circuit breaker;
- support concise progress summaries without tailing giant output files.

## Proposed Tooling

These names are placeholders, not commitments:

- `scripts/content-surface-survey/cluster-widenings.ts`
  - normalize and rank widening families
- `scripts/content-surface-survey/select-closure-batch.ts`
  - choose representative units for a cluster
- `scripts/content-surface-survey/rerun-cluster.sh`
  - rerun selected slugs only
- `scripts/content-surface-survey/report-closure.ts`
  - compare before/after verdicts

## Operational Sequence After Tier 3

Planned near-term sequence:

1. Finish tier 3.
2. Do one final pass of the current manual workflow:
   - inspect clusters by hand;
   - land the next reusable surface changes;
   - author refs;
   - rerun a selected batch.
3. After that, implement this workflow so future convergence work uses the new
   loop instead of the older ad hoc one.

## Supersession

For content-surface convergence work, this workflow supersedes older
survey-follow-up habits once implemented.

It does not supersede:

- Ralph as the general dev loop;
- repo provenance rules;
- existing SRD/PHB path separation.
