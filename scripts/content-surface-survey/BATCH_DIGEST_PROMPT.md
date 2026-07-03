# Batch Digest — sub-agent prompt template

> **Stage:** 2 — generalization / cluster-digest pass.
> **Not:** Stage-1 per-unit survey (that's `worker.sh` + `prompt-template.md`, orchestrated by `run-survey.sh`).

## What this is

A sub-agent prompt for running a **cluster-wide digest** across the
Stage-1 survey output. Given a cluster of N units that the Stage-1
survey flagged with overlapping widening proposals, the sub-agent
reads each unit's RAW text + `proposal.md` + the current surface and
returns classifications (with Dhall authoring where possible).

Stage-1 runs once per survey — it is the expensive parallel-Sonnet
sweep that produces `survey-results-<source>.jsonl` and
`results-<source>/<slug>/proposal.md` for each unit.

Stage-2 (this prompt) is re-run per cluster, by the main session, as
the surface evolves. Each pass digests one cluster, lands widenings,
and moves units to `clean` / `partial` / deferred. The old deferred-plan ledger
has been removed from the active tree; use current survey outputs and active
planning artifacts when a durable backlog needs to be reopened.

## Why Stage-2 is distinct from Stage-1

Stage-1 sub-agents see ONE unit and propose what THAT unit needs.
They rediscover the same patterns across N units independently — e.g.,
25 units proposing an `apply_condition_effect` variant even though
the previous session landed the unified shape. They have no
visibility into the current state of the surface or what's already
been accepted/deferred. They are correct-by-construction at per-unit
granularity; they over-generate at cluster granularity.

Stage-2 de-duplicates across a cluster: sees the current surface, the
living DEFERRED ledger, and all N proposals for the same pattern
together. It converts "25 units proposing X" into one of
{already-covered (stale) / land-now-with-validation-refs /
defer-with-motivating-units / DM-agenda / structural-and-different-batch}.

## Do not confuse with other scripts / agents

- **`run-survey.sh`** — data-crunching: orchestrates Stage-1
  per-unit sub-agents. Writes `survey-results-<source>.jsonl`.
  Produces inputs for Stage-2.
- **`aggregate.ts`** — data-crunching: normalizes raw Stage-1 widening
  proposals via regex → canonical tags → `REPORT_<source>.md`.
  Surfaces clusters for Stage-2 to digest.
- **`validate.ts`** — data-crunching: runs typecheck + tracer on a
  single authored JSON unit, writes `verdict.json`. Used in both
  Stage-1 (inside `worker.sh`) and Stage-2 (by the main session to
  confirm authored units go clean).
- **This prompt** — judgment: digests a cluster's proposals against
  the current surface + ARCHITECTURE + DEFERRED. No data-crunching.

## Hard rules for DM agenda

The single most common Stage-1 mistake is proposing a type-sound
widening for a capability that is architecturally caller-owned. The
sub-agent must reject these proactively and classify as `dm_agenda`,
never propose a surface widening even if it fits TypeScript.

**DM-agenda capabilities** (caller/session-owned per `ARCHITECTURE.md` §1 and
the historical content-surface deferred classification):

- **Spatial** — distance, adjacency, line of sight, movement geometry,
  "within N ft", "in range", "reach", barrier permeability (lead, stone),
  "area" membership at specific moments.
- **Perception / visibility** — "can see", "can hear", line of sight,
  illumination, cover, hidden/detected status.
- **Language / communication** — understanding, speaking, reading
  any language; tongue comprehension; message delivery intent.
- **Location / navigation** — knowing where an object/creature is,
  pathfinding, "fastest route", direction sensing, geographic
  familiarity.
- **Remote sensing** — scrying, clairvoyance, remote viewing,
  planar sensing.
- **Narrative mutation** — memory alteration, belief change, quest
  compliance judgment ("acts counter to your command").
- **Allegiance / alignment / disposition** — "friendly", "ally",
  "fighting you", "hostile", alignment-based effects.
- **Movement conversion** — jump distance, squeeze rules, climb speed
  vs. walk, fall damage, difficult-terrain interaction.
- **DM arbitration** — "DM's choice", "random location", "as the DM
  decides".

If a unit's proposal names one of these capabilities — even if wrapped
as `grant_sense`, `detect`, `create_object`, or similar type-sound
atoms — classify as `dm_agenda` and, if not already present, suggest
recording the unit in a fresh active backlog.

Do NOT:
- Propose a `grant_sense` variant for language comprehension, object
  location, remote viewing, or path-finding.
- Propose an `apply_condition` variant for "belief", "memory",
  "alignment".
- Propose a spatial atom for "within", "adjacent", "in reach",
  "line of sight".

## Classification vocabulary

- **stale** — current surface covers the unit; author Dhall.
- **partial** — core (deterministic save/attack/direct phase) authors
  cleanly; secondary rider is blocked by a DEFERRED item. Author the
  core with an explicit `DEFERRED.` comment citing the section.
- **dm_agenda** — capability is caller-owned. Do not author. Cite
  DEFERRED §B (or flag for addition if missing).
- **deferred** — blocker is a specific named DEFERRED item (§A1–§A14,
  §C1–§C5). Do not author. Cite section.
- **needs_widening** — deterministic core is blocked by an unmodeled
  shape that deserves its own DEFERRED entry. Propose precise shape +
  name units pressuring it. Do not author.
- **structural** — unit belongs in a different cluster (its dominant
  widening is elsewhere in the taxonomy). Reclassify and skip this
  batch.

## Template — fill before invocation

```
You are helping digest a cluster of <N> D&D SRD 5.2.1 units that the
Stage-1 survey flagged as <cluster-tag>. Many proposals are stale (the
previous digests landed widenings that now subsume them). Classify
each unit and, where `stale` or `partial`, author the Dhall encoding.

## Context — read these in order

1. `packages/surface/src/surface/types.ts` —
   relevant sections: <LIST THE SPECIFIC TYPES / ATOMS FOR THIS CLUSTER>.
2. Current active backlog or survey report rows for this cluster.
3. `ARCHITECTURE.md` lines 100–130 — spatial / DM rulings caller-provided.
4. `scripts/content-surface-survey/BATCH_DIGEST_PROMPT.md` — this file's
   DM-agenda rules (§"Hard rules for DM agenda") and classification
   vocabulary (§"Classification vocabulary").
5. Authored templates: <2-3 content/<slug>.dhall files most similar
   to this cluster's expected shapes>.

## The cluster — <N> units

<NUMBERED LIST WITH ONE-LINE HINT PER UNIT>

For each, read:
- `scripts/content-surface-survey/results-srd/<slug>/proposal.md`
- SRD text in `.references/srd-5.2.1/...`

## Conventions in force

- Turn-scoped riders on "Instantaneous" spells: use `Duration.timed`
  1 round (Ray of Sickness precedent).
- Skill/ability-check-scoped effects: OMIT with comment per §A1
  (protection_from_poison precedent). Do not author `on: ["ability_check"]`
  over-broadly.
- `any_number` target selection (just landed): use when RAW says "each
  creature of your choice within range" with no cap.
- Partial authoring is ENCOURAGED (compulsion / vicious_mockery
  precedent). Author core, defer rider with DEFERRED. comment.
- Pessimistic classification > aggressive authoring: better to flag
  `partial` or `deferred` than author RAW-divergent Dhall.

## DM-agenda capabilities — REJECT proactively

See BATCH_DIGEST_PROMPT.md §"Hard rules for DM agenda".

Summary: if the effect is spatial, perception-gated, language-based,
location/path sensing, remote viewing, narrative mutation, alignment-
based, or DM-arbitrated — classify `dm_agenda` and DO NOT propose a
surface widening even if TypeScript would fit.

## Do not

- Do NOT compile Dhall or run the validator — the main session does
  that.
- Do NOT write `result.json` or `disposition.md` — the main session
  does that.
- Do NOT update `survey-results-<source>.jsonl` — the main session does
  that.

## Deliverable

Write `/tmp/batch-digest-<cluster-tag>.md` with:

1. Per-unit classification table: slug | classification | one-line
   justification.
2. For `stale` / `partial`: authored file paths + 1-line note on
   what's encoded vs deferred.
3. For `needs_widening`: precise TS shape sketch + pressure-case
   count + "land now" vs "defer" recommendation.
4. For `dm_agenda` / `deferred`: cite DEFERRED.md or
   ARCHITECTURE.md section. If not yet listed, flag as "add to §B".
5. Summary stats.
6. Cross-cutting observations.

Expected outcomes vary by cluster; calibrate in the invocation.
```

## Version history

- **v1 — 2026-04-16:** Initial extraction from the main-session
  ad-hoc prompt. Codified DM-agenda rules after batch #2 found 4-of-12
  units misclassified by Stage-1 as surface_widening when actually
  DM-agenda. Codified partial-authoring convention after batch #1
  over-deferred units whose core was encodable.
