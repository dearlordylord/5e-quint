# Cleanroom Guidance Pack

This is the current source-side guidance root copied into future cleanroom
repositories as `cleanroom-input/guidance/**`.

The full curated guidance pack is a later implementation phase. Until that
phase lands, this root is intentionally minimal:

- Treat the copied RAW, QNT, source branch inventory, domain language, and
  assumptions as the executable authority.
- Keep QNT/MBT replay adapters quarantined from production modules.
- Do not dispatch production runtime behavior on authored ids, names, slugs,
  provenance headings, page references, or official catalog labels.
- Do not store derivable facts beside their owners unless the duplicate is an
  explicit executable boundary projection.
- Record missing architecture guidance as a `source-qnt-corpus` blocker instead
  of guessing.

## Harness Improvement Boundary

The cleanroom target implementation is a probe of this source-owned harness,
not the artifact this source repo is trying to preserve. A target bug or awkward
design is important when it shows that the copied QNT, instructions, guidance,
target profile, replay evidence contract, reviewer loop, or decider gates let a
cleanroom agent choose the wrong local optimum.

Good source-side improvements include:

- clearer QNT branch obligations, replay entrypoints, or projection boundaries;
- clearer instructions for how a target agent should choose a task, record
  replay evidence, and stop on blockers;
- stronger process gates that reject stale evidence, witness leakage, authored
  identity dispatch, or redundant durable state;
- target-profile or scaffold changes that make a future cleanroom repo easier
  to create, refresh, and run without source-repo context.

Not-good improvements include:

- manually polishing every target implementation issue discovered during a
  shakedown;
- expanding the task scope merely because additional target bugs are visible;
- encoding target-language workarounds into QNT instead of fixing the scaffold,
  process, or target adapter boundary;
- copying source-repo implementation knowledge, planning logs, or previous
  cleanroom output into the allowed corpus.

For a shakedown or review finding, ask: what source-owned artifact should change
so the next cleanroom run is less likely to make the same mistake? If the answer
is only "patch this target implementation", record it as target implementation
work, not as a source harness improvement.

## Adapter Quarantine Boundary

QNT and MBT drivers describe conformance observations. Their action names,
witness field names, trace ids, nondet pick names, projection hashes, and
`mbt::actionTaken` values are harness protocol. They may appear in target
adapter modules, harness tests, target replay evidence, and task artifacts.
They must not become public production rules-engine state or API.

Good boundary shape:

- production modules expose domain commands, reducers, facts, constructors, and
  queries named for SRD/domain concepts;
- adapter modules translate QNT actions and witness fields into those domain
  APIs;
- target replay evidence records observed QNT protocol details after execution;
- any stored production projection is named for the executable boundary it
  serves and is derived from owned domain state.

Bad boundary shape:

- production state machines are named after QNT witness states or branch
  actions;
- production APIs expose QNT action names, `mbt::actionTaken`, trace ids, or
  projection hash fields;
- production modules import adapter modules;
- reusable engine modules accumulate driver witness tables instead of modeling
  the SRD/domain rule.

Do not treat this file as completion of the full guidance-pack phase.
