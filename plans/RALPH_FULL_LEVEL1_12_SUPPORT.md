# Ralph Full Level 1-12 SRD Support Plan

> Historical D&D delivery-harness input. This plan does not define Dalph
> architecture. See [the historical-harness boundary](../docs/tooling/ralph/README.md#historical-harness-boundary).

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L112A-01-MINED-BASELINE", "status": "done", "title": "Preserve the committed level 11-12 and spell-level-6 mined denominator", "dependencies": [] },
    { "number": 2, "id": "L112A-02-STRICT-REPORT-PLUMBING", "status": "ready-for-implementation", "title": "Add level 1-11 and level 1-12 strict full-support reports", "dependencies": ["L112A-01-MINED-BASELINE"] },
    { "number": 3, "id": "L112A-03-NONVACUOUS-STRICT-GATES", "status": "ready-for-implementation", "title": "Enforce non-vacuous level 11, level 12, and spell-level-6 scopes", "dependencies": ["L112A-02-STRICT-REPORT-PLUMBING"] },
    { "number": 4, "id": "L112B-01-LEVEL11-FEATURE-SURFACE", "status": "ready-for-implementation", "title": "Author and grant the seven level-11 class and subclass features", "dependencies": ["L112A-03-NONVACUOUS-STRICT-GATES"] },
    { "number": 5, "id": "L112B-02-LEVEL12-ASI-SURFACE", "status": "ready-for-implementation", "title": "Author and grant the twelve level-12 Ability Score Improvement occurrences", "dependencies": ["L112A-03-NONVACUOUS-STRICT-GATES"] },
    { "number": 6, "id": "L112B-03-SPELL6-SURFACE-BATTLE", "status": "ready-for-implementation", "title": "Author missing battle-facing spell-level-6 Surface records", "dependencies": ["L112A-03-NONVACUOUS-STRICT-GATES"] },
    { "number": 7, "id": "L112B-04-SPELL6-SURFACE-WORLD", "status": "ready-for-implementation", "title": "Author missing world, object, summon, and session spell-level-6 Surface records", "dependencies": ["L112A-03-NONVACUOUS-STRICT-GATES"] },
    { "number": 8, "id": "L112B-05-SPELL6-CATALOG-ACCESS", "status": "ready-for-implementation", "title": "Install all SRD spell-level-6 records and reconcile class-list access", "dependencies": ["L112B-03-SPELL6-SURFACE-BATTLE", "L112B-04-SPELL6-SURFACE-WORLD"] },
    { "number": 9, "id": "L112C-01-LEVEL11-12-CREATION", "status": "ready-for-implementation", "title": "Implement level 11-12 character advancement discovery and finalization", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112B-02-LEVEL12-ASI-SURFACE"] },
    { "number": 10, "id": "L112C-02-LEVEL11-12-SHEET", "status": "ready-for-implementation", "title": "Project level 11-12 proficiency, resources, dice, and slot facts", "dependencies": ["L112C-01-LEVEL11-12-CREATION"] },
    { "number": 11, "id": "L112C-03-LEVEL12-ASI-OCCURRENCES", "status": "ready-for-implementation", "title": "Implement level-12 repeated Ability Score Improvement selection occurrences", "dependencies": ["L112B-02-LEVEL12-ASI-SURFACE", "L112C-01-LEVEL11-12-CREATION"] },
    { "number": 12, "id": "L112C-04-SPELL6-ACCESS", "status": "ready-for-implementation", "title": "Implement table-derived spell-level-6 and Mystic Arcanum access", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-01-LEVEL11-12-CREATION"] },
    { "number": 13, "id": "L112D-01-RELENTLESS-RAGE", "status": "ready-for-implementation", "title": "Promote Barbarian Relentless Rage", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-02-LEVEL11-12-SHEET"] },
    { "number": 14, "id": "L112D-02-TWO-EXTRA-ATTACKS", "status": "ready-for-implementation", "title": "Promote Fighter Two Extra Attacks", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-02-LEVEL11-12-SHEET"] },
    { "number": 15, "id": "L112D-03-FLEET-STEP", "status": "ready-for-implementation", "title": "Promote Open Hand Fleet Step", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-02-LEVEL11-12-SHEET"] },
    { "number": 16, "id": "L112D-04-RADIANT-STRIKES", "status": "ready-for-implementation", "title": "Promote Paladin Radiant Strikes", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-02-LEVEL11-12-SHEET"] },
    { "number": 17, "id": "L112D-05-SUPERIOR-HUNTERS-PREY", "status": "ready-for-implementation", "title": "Promote Hunter Superior Hunter's Prey", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-02-LEVEL11-12-SHEET"] },
    { "number": 18, "id": "L112D-06-IMPROVED-CUNNING-STRIKE", "status": "ready-for-implementation", "title": "Promote Rogue Improved Cunning Strike", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-02-LEVEL11-12-SHEET"] },
    { "number": 19, "id": "L112D-07-MYSTIC-ARCANUM", "status": "ready-for-implementation", "title": "Promote Warlock Mystic Arcanum selection and casting", "dependencies": ["L112B-01-LEVEL11-FEATURE-SURFACE", "L112C-04-SPELL6-ACCESS"] },
    { "number": 20, "id": "L112E-01-SPELL6-DAMAGE-HEALING", "status": "ready-for-implementation", "title": "Promote spell-level-6 damage and healing procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 21, "id": "L112E-02-SPELL6-CONDITION-CONTROL", "status": "ready-for-implementation", "title": "Promote spell-level-6 condition and control procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 22, "id": "L112E-03-SPELL6-BARRIERS-WARDS", "status": "ready-for-implementation", "title": "Promote spell-level-6 barriers, hazards, and wards", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 23, "id": "L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM", "status": "ready-for-research", "title": "Partition and promote spell-level-6 summon, object, and transformation procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 24, "id": "L112E-05-SPELL6-TRAVEL-EXPLORATION", "status": "ready-for-implementation", "title": "Promote spell-level-6 travel and exploration procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 25, "id": "L112E-06-SPELL6-ILLUSION-SESSION", "status": "ready-for-implementation", "title": "Promote spell-level-6 illusion, contingency, and session procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 26, "id": "L112F-01-RULES-KERNEL-EVIDENCE", "status": "ready-for-implementation", "title": "Close rules-kernel evidence for promoted level 11-12 behavior", "dependencies": ["L112D-01-RELENTLESS-RAGE", "L112D-02-TWO-EXTRA-ATTACKS", "L112D-03-FLEET-STEP", "L112D-04-RADIANT-STRIKES", "L112D-05-SUPERIOR-HUNTERS-PREY", "L112D-06-IMPROVED-CUNNING-STRIKE", "L112D-07-MYSTIC-ARCANUM", "L112E-01-SPELL6-DAMAGE-HEALING", "L112E-02-SPELL6-CONDITION-CONTROL", "L112E-03-SPELL6-BARRIERS-WARDS", "L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM", "L112E-05-SPELL6-TRAVEL-EXPLORATION", "L112E-06-SPELL6-ILLUSION-SESSION"] },
    { "number": 27, "id": "L112F-02-MCP-SHEET-SCENARIO", "status": "ready-for-implementation", "title": "Add a level-12 character creation and sheet MCP scenario", "dependencies": ["L112C-02-LEVEL11-12-SHEET", "L112C-03-LEVEL12-ASI-OCCURRENCES", "L112C-04-SPELL6-ACCESS"] },
    { "number": 28, "id": "L112F-03-MCP-BATTLE-SCENARIO", "status": "ready-for-implementation", "title": "Add a level-11 battle handoff MCP scenario", "dependencies": ["L112D-01-RELENTLESS-RAGE", "L112D-02-TWO-EXTRA-ATTACKS", "L112D-03-FLEET-STEP", "L112D-04-RADIANT-STRIKES", "L112D-05-SUPERIOR-HUNTERS-PREY", "L112D-06-IMPROVED-CUNNING-STRIKE", "L112D-07-MYSTIC-ARCANUM"] },
    { "number": 29, "id": "L112F-04-MCP-NONBATTLE-SCENARIO", "status": "ready-for-implementation", "title": "Add a spell-level-6 nonbattle MCP scenario", "dependencies": ["L112E-05-SPELL6-TRAVEL-EXPLORATION", "L112E-06-SPELL6-ILLUSION-SESSION"] },
    { "number": 30, "id": "L112F-05-FOCUSED-QNT-MBT", "status": "ready-for-implementation", "title": "Run focused QNT proofs and selective MBT for changed battle behavior", "dependencies": ["L112D-01-RELENTLESS-RAGE", "L112D-02-TWO-EXTRA-ATTACKS", "L112D-03-FLEET-STEP", "L112D-04-RADIANT-STRIKES", "L112D-05-SUPERIOR-HUNTERS-PREY", "L112D-06-IMPROVED-CUNNING-STRIKE", "L112D-07-MYSTIC-ARCANUM", "L112E-01-SPELL6-DAMAGE-HEALING", "L112E-02-SPELL6-CONDITION-CONTROL", "L112E-03-SPELL6-BARRIERS-WARDS", "L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM"] },
    { "number": 31, "id": "L112A-04-ULTRA-GOLDEN-PROMOTION", "status": "ready-for-implementation", "title": "Promote level 1-11 and level 1-12 into the ultra-golden aggregate", "dependencies": ["L112F-01-RULES-KERNEL-EVIDENCE", "L112F-02-MCP-SHEET-SCENARIO", "L112F-03-MCP-BATTLE-SCENARIO", "L112F-04-MCP-NONBATTLE-SCENARIO", "L112F-05-FOCUSED-QNT-MBT"] },
    { "number": 32, "id": "L112F-06-REVIEWER-CONVERGENCE", "status": "ready-for-implementation", "title": "Converge RAW, language, architecture, connascence, and code review", "dependencies": ["L112F-07-PLAN-CONSISTENCY"] },
    { "number": 33, "id": "L112F-07-PLAN-CONSISTENCY", "status": "ready-for-implementation", "title": "Verify Ralph task index, dependencies, and task bodies", "dependencies": ["L112A-04-ULTRA-GOLDEN-PROMOTION"] },
    { "number": 34, "id": "L112F-08-FINAL-QUALITY", "status": "ready-for-implementation", "title": "Run the final serialized quality gate", "dependencies": ["L112F-06-REVIEWER-CONVERGENCE"] }
  ]
}
-->

## Execution Mandate

This is an implementation queue for complete SRD character-level 11-12 support.
It is not a request to improve the plan document. The committed mining reports
are the starting denominator, not evidence that the new scope is supported.

Ralph must select the smallest runnable product-owner change, implement it, run
focused verification, regenerate coverage, and continue until the strict and
ultra-golden gates pass. A blocker audit, task split, or report refresh is an
intermediate result unless the current task is explicitly the coverage-plumbing
task.

## Committed Baseline

The baseline is generated from the local SRD 5.2.1 corpus:

- `level-11`: 19 rows: 12 class-table summaries and 7 feature grants.
- `level-12`: 24 rows: 12 class-table summaries and 12 repeated Ability Score
  Improvement grants.
- `spell-level-6`: 59 class-list rows and 31 unique Spell identities.
- Fourteen spell-level-6 identities have authored Surface records but are not
  installed; seventeen lack authored Surface records.

Sources of truth:

- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`
- `plans/unit-profile-coverage/level1-11-mining-audit.json`
- `plans/unit-profile-coverage/level1-12-mining-audit.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Character level and spell level remain separate axes. Character level 11 opens
spell-level-6 pressure for classes whose own tables grant it. Character level
12 carries that spell frontier forward. Paladin and Ranger access must continue
to come from their class tables rather than the full-caster frontier formula.

## Lane Ownership

| Lane | Owner                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------- |
| A    | Generated denominator, strict reports, non-vacuity, and final aggregate gates                        |
| B    | Provenance-bearing SRD Surface records, class/subclass grants, catalog installation, and access data |
| C    | Character advancement, Character Build, Character Sheet, resources, and spell access                 |
| D    | Level-11 class-feature runtime, rule-core, focused QNT, and parity evidence                          |
| E    | Spell-level-6 runtime/session procedures grouped by durable owner shape                              |
| F    | Rules-kernel evidence, MCP scenarios, reviewer convergence, and final verification                   |

## Dependency DAG

The `ralph-task-index` block is the sole owner of task dependencies and
statuses. Inspect its executable projection with
`node scripts/ralph-task-index.cjs plans/RALPH_FULL_LEVEL1_12_SUPPORT.md --runnable-tsv`;
do not maintain a second prose dependency graph.

## Global Implementation Rules

- Read the exact local SRD passages and `UBIQUITOUS_LANGUAGE.md` before changing
  any rule-facing shape or behavior.
- Surface owns authored identity and provenance. Runtime support is admitted by
  reusable shape and typed procedure facts; execution and replay never dispatch
  on class, feature, or spell identity.
- Search the whole repository before adding state. Project existing facts across
  boundaries instead of creating parallel resources, positions, durations,
  targets, selected options, or spell-access state.
- Change rule-core and focused QNT before runtime when behavior changes. Keep
  simulated MBT drivers within the enforced import-closure budget.
- MBT is selective and end-to-end only. Reproduce any failure with its printed
  `QUINT_SEED`; never use MBT for exploratory inspection.

Every runnable task body below is the local requirements source. Its Inputs,
Outputs, Verification, and Plan Impact are mandatory parts of completion:

- Inputs name the minimum owning artifacts to inspect; repository search is
  still required before adding state or introducing a new owner.
- Outputs name the durable product or evidence boundary, not a mandatory new
  file when an existing owner can be extended.
- Verification commands are the minimum focused checks. Run additional focused
  checks required by the changed files, but do not substitute broad MBT.
- Plan Impact is executable: if the stated condition occurs, update the task
  graph and dependencies before marking the current task done. A follow-up that
  is necessary for strict support must remain runnable and must block Tasks 31–34.

## Spell-level-6 runtime partition

The generated 31-identity denominator is partitioned exactly once here. Tasks
20–25 own every identity in their row; phrases such as "related spells" do not
extend or override this table.

| Task | Exact identities                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 20   | `chain_lightning`, `circle_of_death`, `disintegrate`, `freezing_sphere`, `harm`, `heal`, `sunbeam`              |
| 21   | `eyebite`, `flesh_to_stone`, `irresistible_dance`, `mass_suggestion`                                            |
| 22   | `blade_barrier`, `forbiddance`, `globe_of_invulnerability`, `guards_and_wards`, `wall_of_ice`, `wall_of_thorns` |
| 23   | `conjure_fey`, `create_undead`, `instant_summons`, `magic_jar`                                                  |
| 24   | `find_the_path`, `move_earth`, `transport_via_plants`, `true_seeing`, `wind_walk`, `word_of_recall`             |
| 25   | `contingency`, `heroes_feast`, `planar_ally`, `programmed_illusion`                                             |

Task 33 must compare this table against the generated `spell-level-6` unique
identity set and fail on a missing or duplicate owner.

## Verification

Task 32 owns reviewer-loop convergence: after implementation, repeat RAW
traceability, ubiquitous-language/domain, architecture/connascence, and code
review passes until no reasonable finding remains. Every modeled rule must
trace to a specific passage in the local SRD corpus and use the terminology in
`UBIQUITOUS_LANGUAGE.md`; Task 32 cannot complete on inferred or externally
sourced rules text. Task 30 owns focused QNT/MBT evidence for changed battle
behavior, and Task 34 owns the final public resource-bounded workspace checks.

## Task Details

### Task 1 - L112A-01-MINED-BASELINE

Inputs: `.references/srd-5.2.1/Classes/`,
`.references/srd-5.2.1/Spells/`, both committed level 11–12 mining audits, and
`srd-unit-inventory.json`.

Already applied on `master`. Preserve the generated level 11-12 denominator and
do not reinterpret it as support evidence.

Acceptance:

- Level 11 has 19 mined rows and level 12 has 24.
- Fleet Step and Superior Hunter's Prey are subclass-feature grants owned by
  `subclass_monk_warrior_of_the_open_hand` and `subclass_ranger_hunter`.
- Spell level 6 has 59 class-list rows and 31 unique identities.
- Both mining audits have no missing included bands.

Verification: `pnpm unit-profile-coverage:check`.

Outputs: the committed mining audits and inventory rows named in the baseline;
this task creates no support claim.

Plan Impact: a corpus-derived count correction must update the audits, baseline,
spell partition, and every affected downstream task together.

### Task 2 - L112A-02-STRICT-REPORT-PLUMBING

Inputs: `scripts/unit-profile-coverage-config.cjs`,
`scripts/level1-full-support-report.cjs`, the level 1-10 report configuration,
and both committed level 11-12 mining audits.

Add generated `level1-11-full-support` and `level1-12-full-support` JSON and
Markdown outputs. Generalize the scope registry where practical so later levels
do not require another scattered copy of paths, builders, renderers, and labels.
Do not weaken the existing level 1-10 claims.

Acceptance: both new reports are generated from the shared inventory/matrix and
surface every in-scope blocker.

Outputs: `level1-11-full-support.json`, `LEVEL1_11_FULL_SUPPORT.md`,
`level1-12-full-support.json`, and `LEVEL1_12_FULL_SUPPORT.md` under
`plans/unit-profile-coverage/`, plus their shared configuration and self-tests.

Verification: `pnpm unit-profile-coverage:check:self-test`, then
`pnpm unit-profile-coverage:check --write`, then
`pnpm unit-profile-coverage:check`.

Plan Impact: if either report needs a different scope key or output name, update
the canonical scope registry and every downstream reference in this plan before
closing the task; do not add a second path/name registry.

### Task 3 - L112A-03-NONVACUOUS-STRICT-GATES

Inputs: the outputs of Task 2 and
`scripts/unit-profile-coverage-validation.cjs` plus its self-test fixtures.

Require non-empty `level-11`, `level-12`, and `spell-level-6` bands. Add
self-tests proving level 11 introduces spell level 6 and level 12 carries it
without introducing spell level 7.

Acceptance: deleting any required band makes the focused checker self-test fail
with the missing band named.

Outputs: one shared non-vacuity validation owner and focused mutation fixtures
for all three required bands.

Verification: `pnpm unit-profile-coverage:check:self-test` and
`pnpm unit-profile-coverage:check`.

Plan Impact: if the generated audit exposes another required frontier band,
add it to the same validator and update dependent scope tasks before closing.

### Task 4 - L112B-01-LEVEL11-FEATURE-SURFACE

Inputs: the seven `level-11` feature-grant audit rows, their exact local SRD
passages, existing Surface class/subclass records, schemas, and support-profile
vocabulary.

Author SRD-provenance reusable Surface mechanics and class/subclass grants for
Relentless Rage, Two Extra Attacks, Fleet Step, Radiant Strikes, Superior
Hunter's Prey, Improved Cunning Strike, and Mystic Arcanum. Reuse existing
profile vocabulary when the rule shape matches; widen Surface only for a real
new domain shape.

Acceptance: all seven mined feature rows are authored and parse through Surface.
The five class features are granted by their class records; Fleet Step is
granted by `subclass_monk_warrior_of_the_open_hand`, and Superior Hunter's Prey
is granted by `subclass_ranger_hunter`. Every feature has explicit unsupported
or supported profile admission.

Outputs: seven provenance-bearing Surface feature records/grants and any
strictly necessary shared schema vocabulary, with publication coverage.

Verification: `pnpm check:surface-content-publication`,
`pnpm check:surface-publication-self-test`, and
`pnpm --filter @dnd/surface test`.

Plan Impact: a genuinely new mechanic shape must be added to the shared Surface
owner and assigned to its corresponding runtime task; an unsupported admission
is intermediate and cannot satisfy Tasks 31–34.

### Task 5 - L112B-02-LEVEL12-ASI-SURFACE

Inputs: the twelve `level-12` class-table grant rows, current class records, and
the existing Ability Score Improvement/feat selection Surface vocabulary.

Represent the twelve level-12 Ability Score Improvement grant occurrences from
the class tables without duplicating the selected feat mechanics.

Acceptance: each class retains a distinct level-12 grant occurrence while the
selected feat Unit remains the single owner of feat identity and mechanics.

Outputs: twelve class-owned grant occurrences that reference the existing
selection mechanic without copying its identity or behavior.

Verification: `pnpm check:surface-content-publication` and
`pnpm --filter @dnd/surface test`.

Plan Impact: if the existing occurrence type cannot distinguish two granting
levels, strengthen that canonical type and keep Task 11 dependent on the new
narrowed shape.

### Task 6 - L112B-03-SPELL6-SURFACE-BATTLE

Inputs: the seven named missing-record audit entries, their exact files under
`.references/srd-5.2.1/Spells/`, and existing reusable Surface spell mechanics.

Author the missing spell-level-6 definitions whose primary executable pressure
is battle-facing: `conjure_fey`, `eyebite`, `freezing_sphere`,
`globe_of_invulnerability`, `irresistible_dance`, `magic_jar`, and
`programmed_illusion`. This assignment partitions the generated denominator; it
does not replace it. Preserve exact SRD provenance and derive runtime
projections from mechanics.

Acceptance: every selected missing record decodes, publishes, and is classified
for a concrete Lane E owner.

Outputs: exactly the seven named SRD-provenance spell records and typed mechanic
facts consumed by Tasks 20–23 and 25.

Verification: `pnpm check:surface-content-publication`,
`pnpm check:surface-publication-self-test`, and
`pnpm --filter @dnd/surface test`.

Plan Impact: if one record spans more than one runtime owner, nominate exactly
one primary Task 20–25 owner in the partition and record the secondary boundary
inside that task; do not duplicate executable state.

### Task 7 - L112B-04-SPELL6-SURFACE-WORLD

Inputs: the ten named missing-record audit entries, their exact files under
`.references/srd-5.2.1/Spells/`, and existing session/object/companion Surface
mechanics.

Author the remaining missing spell-level-6 definitions whose pressure belongs
to session, travel, ward, object, summon, transformation, or presentation
owners: `contingency`, `find_the_path`, `forbiddance`, `guards_and_wards`,
`heroes_feast`, `instant_summons`, `move_earth`, `planar_ally`,
`transport_via_plants`, and `word_of_recall`.

Acceptance: all ten spell identities named in this task decode and publish with
no invented runtime behavior or inert status metadata. Task 8, which depends on
both authoring tasks, owns the aggregate seventeen-record assertion.

Outputs: exactly the ten named SRD-provenance spell records and typed mechanic
facts consumed by Tasks 22–25.

Verification: `pnpm check:surface-content-publication`,
`pnpm check:surface-publication-self-test`, and
`pnpm --filter @dnd/surface test`.

Plan Impact: if a record needs a missing shared domain shape, add that shape to
its existing owner and keep its partitioned runtime task blocked until the shape
is executable.

### Task 8 - L112B-05-SPELL6-CATALOG-ACCESS

Inputs: Tasks 6–7, all fourteen already-authored spell-level-6 records, the SRD
Surface collection, and the 59 generated class-list rows.

Install all 31 SRD spell-level-6 identities in the SRD Surface collection and
reconcile class-list access from the local corpus. Keep provenance, structured
input, and runtime projection distinct.

Acceptance: every spell-level-6 row is authored and installed; class-list row
counts and unique-identity counts remain 59 and 31.

Outputs: one provenance-homogeneous SRD collection containing all 31 identities
and class-list access derived from the local corpus.

Verification: `pnpm check:surface-content-publication`,
`pnpm check:surface-publication-typecheck`,
`pnpm --filter @dnd/surface test`, and
`pnpm unit-profile-coverage:check --write` followed by
`pnpm unit-profile-coverage:check`.

Plan Impact: any count change must first be reconciled with the local SRD corpus
and both mining audits; update this plan's denominator and spell partition in
the same commit.

### Task 9 - L112C-01-LEVEL11-12-CREATION

Inputs: Tasks 4–5, Surface class-table/grant readers, the advancement state
machine, and existing level-10 advancement tests.

Extend character advancement through levels 11 and 12 using Surface class
tables and feature grants. Parse once at the boundary and pass narrowed
advancement facts forward.

Acceptance: all twelve SRD classes can advance through both levels, and focused
tests cover discovery, fills, finalization, and build projection.

Outputs: level 11–12 advancement discovery/finalization and a focused
`level12-character-support.test.ts` exercising every class.

Verification: `pnpm --filter @dnd/character-creation-runtime exec vitest run
src/level12-character-support.test.ts` and
`pnpm --filter @dnd/character-creation-runtime typecheck`.

Plan Impact: if advancement exposes a new durable choice kind, add one typed
workflow owner and block Tasks 10–12 until its projection is explicit.

### Task 10 - L112C-02-LEVEL11-12-SHEET

Inputs: Task 9, generated class progression deltas, existing Character Sheet
progression/resource owners, and level-10 sheet tests.

Project the mined class-table deltas into existing Character Sheet owners:
Proficiency Bonus, spell slots, prepared counts, Pact Magic, class pools, dice,
and attack-count facts. Do not store table summaries or duplicate derivable
values.

Acceptance: every non-empty generated progression delta has an executable owner
or a precise type-enforced non-runtime disposition.

Outputs: level 11–12 sheet projection plus a focused
`level12-character-support.test.ts` covering every non-empty delta.

Verification: `pnpm --filter @dnd/character-sheet-runtime exec vitest run
src/level12-character-support.test.ts` and
`pnpm --filter @dnd/character-sheet-runtime typecheck`.

Plan Impact: a missing projection must extend the canonical owner or become a
new blocking task; it cannot be closed by storing the generated table summary.

### Task 11 - L112C-03-LEVEL12-ASI-OCCURRENCES

Inputs: Tasks 5 and 9 plus the existing feat/ability-score choice occurrence
workflow and its selected-identity tests.

Implement the repeated level-12 Ability Score Improvement choice occurrence
through the existing feat/ability-score selection workflow.

Acceptance: the occurrence is independently selectable once per granting class
level, while selected feat and score facts remain canonical and non-duplicated.

Outputs: occurrence-aware choice discovery/fill/finalization and focused tests
for consecutive Ability Score Improvement grants.

Verification: `pnpm --filter @dnd/character-creation-runtime exec vitest run
src/level12-character-support.test.ts` and
`pnpm --filter @dnd/character-creation-runtime typecheck`.

Plan Impact: if occurrence identity is not representable, strengthen the
existing choice key; do not add a parallel selected-feat or selected-score list.

### Task 12 - L112C-04-SPELL6-ACCESS

Inputs: Tasks 8–9, Surface class spell lists/tables, current spell discovery and
slot projection owners, and the Warlock Pact Magic owner.

Implement spell-level-6 access for full casters and the level-11 Mystic Arcanum
path for Warlock. Preserve Paladin and Ranger table-derived spell-level-3
progression without granting them spell-level-6 access.

Acceptance: discovery, preparation/selection, slot or arcanum resource facts,
and Character Sheet projection match each class table.

Outputs: table-derived level-6 spell access, Mystic Arcanum discovery facts, and
focused creation/sheet tests for every spellcasting class at levels 11–12.

Verification: `pnpm --filter @dnd/character-creation-runtime exec vitest run
src/level12-character-support.test.ts`,
`pnpm --filter @dnd/character-sheet-runtime exec vitest run
src/level12-character-support.test.ts`, and both package typechecks.

Plan Impact: any class-specific exception must remain a table-derived fact; a
new access formula requires a shared typed owner before Tasks 19–25 proceed.

### Task 13 - L112D-01-RELENTLESS-RAGE

Inputs: the Relentless Rage SRD passage, Task 4's admitted mechanic, existing
zero-HP/save/Rage/rest rule-core and battle-runtime owners.

Model Barbarian Relentless Rage from its exact SRD passage. Reuse the existing
zero-Hit-Point, Saving Throw, Rage occurrence, and rest/resource owners.

Acceptance: focused QNT and runtime tests cover trigger, DC progression/reset,
success, failure, and cleanup without authored-identity execution dispatch.

Outputs: reusable rule-core semantics, a focused battle QNT integration slice,
runtime execution, and `battle-runtime-relentless-rage.test.ts`.

Verification: `pnpm --filter @dnd/battle-runtime exec vitest run
src/battle-runtime-relentless-rage.test.ts` and
`pnpm --filter @dnd/battle-runtime typecheck`; Task 30 owns proof/MBT closure.

Plan Impact: if zero-HP interruption cannot compose with the current damage
procedure, create a blocking procedure-lifecycle task rather than a feature-id
special case.

### Task 14 - L112D-02-TWO-EXTRA-ATTACKS

Inputs: the Fighter feature passage, Task 4's admitted mechanic, and the existing
attack-count rule-core/QNT/runtime owner and `extra-attack-count.mbt.test.ts`.

Widen the existing Attack-action attack-count scaling owner from two attacks to
the level-11 Fighter count.

Acceptance: the count is derived from admitted class-feature facts and parity
tests prove sequencing without positional or magic-number coupling.

Outputs: one widened attack-count owner plus focused unit and existing MBT-driver
updates; no Fighter-specific attack loop.

Verification: focused attack-count runtime tests and
`pnpm --filter @dnd/battle-runtime exec vitest run
src/battle-runtime-extra-attack-count.test.ts`, then package typecheck; Task 30
runs `extra-attack-count.mbt.test.ts` under the MBT protocol.

Plan Impact: if the owner encodes a two-attack ceiling, strengthen its domain
type and update every bridge consumer together.

### Task 15 - L112D-03-FLEET-STEP

Inputs: the Fleet Step passage, Task 4's admitted mechanic, and existing Step of
the Wind/Focus Point/Bonus Action/movement owners.

Model Warrior of the Open Hand Fleet Step through the existing Step of the
Wind, Bonus Action, Focus Point, and movement owners. Retain its subclass grant
ownership through character advancement.

Acceptance: the new benefit is represented as typed mechanics and does not
introduce a second movement budget or name-based dispatch.

Outputs: rule-core, focused QNT, runtime integration, and
`battle-runtime-fleet-step.test.ts` over the shared movement budget.

Verification: `pnpm --filter @dnd/battle-runtime exec vitest run
src/battle-runtime-fleet-step.test.ts` and package typecheck; Task 30 owns
proof/MBT closure.

Plan Impact: if action/resource sequencing needs a new procedure state, add it
to the shared owner and update its bridge in this task.

### Task 16 - L112D-04-RADIANT-STRIKES

Inputs: the Radiant Strikes passage, Task 4's admitted rider facts, and existing
weapon-hit/damage rider rule-core, QNT, and runtime owners.

Model Paladin Radiant Strikes as an admitted attack-damage rider using the
existing hit/damage procedure.

Acceptance: eligible attacks receive the exact SRD rider once at the correct
damage boundary, with focused QNT/runtime parity.

Outputs: reusable rider semantics, focused QNT/runtime integration, and
`battle-runtime-radiant-strikes.test.ts`.

Verification: `pnpm --filter @dnd/battle-runtime exec vitest run
src/battle-runtime-radiant-strikes.test.ts` and package typecheck; Task 30 owns
proof/MBT closure.

Plan Impact: if eligibility cannot be expressed by existing attack procedure
facts, widen those facts rather than branching on Paladin or feature identity.

### Task 17 - L112D-05-SUPERIOR-HUNTERS-PREY

Inputs: the Superior Hunter's Prey passage, Task 4's admitted mechanic, and the
existing Hunter's Mark/target/effect occurrence owners.

Model Hunter Superior Hunter's Prey as a widening of the existing Hunter's Mark
and subclass feature procedure facts. Retain its subclass grant ownership
through character advancement.

Acceptance: the supported effects flow through typed target/effect state and do
not copy marked-target identity or dispatch on the feature name.

Outputs: reusable target/effect semantics, focused QNT/runtime integration, and
`battle-runtime-superior-hunters-prey.test.ts`.

Verification: `pnpm --filter @dnd/battle-runtime exec vitest run
src/battle-runtime-superior-hunters-prey.test.ts` and package typecheck; Task 30
owns proof/MBT closure.

Plan Impact: if one effect requires a different domain owner, split that effect
into a blocking task and preserve one canonical marked-target reference.

### Task 18 - L112D-06-IMPROVED-CUNNING-STRIKE

Inputs: the Improved Cunning Strike passage, Task 4's admitted mechanic, and the
existing Cunning Strike option/cost/order/replay owners.

Widen the Cunning Strike owner for the level-11 feature's permitted option
composition and Sneak Attack dice costs.

Acceptance: option selection, cost, ordering, and replay are type-enforced and
covered by focused QNT/runtime tests.

Outputs: widened typed option composition, rule-core/QNT/runtime parity, and
focused additions to `battle-runtime-cunning-strike.test.ts`.

Verification: `pnpm --filter @dnd/battle-runtime exec vitest run
src/battle-runtime-cunning-strike.test.ts` and package typecheck; Task 30 owns
proof/MBT closure.

Plan Impact: if multiple options expose an unmodeled ordering protocol, encode
that protocol in one procedure state before enabling the composition.

### Task 19 - L112D-07-MYSTIC-ARCANUM

Inputs: the Mystic Arcanum passage, Tasks 4 and 12, retained spell-reference
composition, Long Rest resources, and spell invocation owners.

Implement Mystic Arcanum selection, retained Character Sheet facts, Long Rest
resource lifecycle, and supported casting handoff. Keep the selected spell
reference as composition identity; execution uses the admitted spell procedure.

Acceptance: selection legality, one-use resource spend/restore, and invocation
are executable without spell-name dispatch.

Outputs: typed selection and durable sheet projection, one-use rest lifecycle,
supported invocation handoff, focused creation/sheet/battle tests, and focused
QNT for battle-facing invocation state.

Verification: run `src/mystic-arcanum.test.ts` with package-local Vitest in each
of `@dnd/character-creation-runtime`, `@dnd/character-sheet-runtime`, and
`@dnd/battle-runtime`, then run all three package typechecks. Task 30 owns
proof/MBT closure for any changed battle procedure.

Plan Impact: if selection and casting need different state lifetimes, split the
types at the creation/sheet/runtime boundaries rather than adding optional
fields to one record.

### Task 20 - L112E-01-SPELL6-DAMAGE-HEALING

Inputs: the exact Task 20 partition (`chain_lightning`, `circle_of_death`,
`disintegrate`, `freezing_sphere`, `harm`, `heal`, `sunbeam`), their SRD
passages and Surface mechanics, and existing damage/healing/recurring-effect
owners.

Close all seven identities through reusable direct, area, recurring, chained,
stored-projectile, and Hit Point restoration procedures.

Acceptance: all seven profiles are admitted and executable for their supported
SRD procedure facts, with focused rule-core/QNT/runtime evidence. Product
rejection is not completion for an identity in this full-support scope.

Outputs: typed procedure facts and
`packages/battle-runtime/src/spell-level6-damage-healing.test.ts`, sharing
existing damage/healing owners rather than spell-specific reducers.

Verification: `pnpm --filter @dnd/battle-runtime exec vitest run
src/spell-level6-damage-healing.test.ts` and package typecheck; Task 30 owns
proof/MBT closure.

Plan Impact: if repository inspection finds more than one independently
changeable owner, narrow this task to the first cohesive exact-id subset and add
sibling tasks for the remaining ids before implementation. Update the partition
and make Tasks 26 and 30 plus any affected Tasks 27–29 depend on every sibling;
Task 31 is then blocked transitively. Do not leave an aggregator parent that
would remain the first runnable task.

### Task 21 - L112E-02-SPELL6-CONDITION-CONTROL

Inputs: the exact Task 21 partition (`eyebite`, `flesh_to_stone`,
`irresistible_dance`, `mass_suggestion`), their SRD passages and Surface
mechanics, and shared save/condition/duration/cleanup owners.

Close all four save-gated, repeating-save, condition, compelled-action, and
suggestion procedures at their battle or session boundary.

Acceptance: condition sources, repeat timing, saves, duration, Concentration,
and cleanup reuse shared owners and have focused evidence for all four ids.

Outputs: typed procedure/session facts,
`packages/battle-runtime/src/spell-level6-condition-control.test.ts`, and
`packages/character-sheet-runtime/src/spell-level6-condition-control.test.ts`;
no generic reducer may dispatch on spell identity.

Verification: run each named test with its package-local Vitest command, then
typecheck both packages; specifically:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/spell-level6-condition-control.test.ts`
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-level6-condition-control.test.ts`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`

Task 30 owns proof/MBT closure for battle behavior.

Plan Impact: if battle-condition and session-suggestion owners change
independently, narrow this task to the first cohesive exact-id subset and add
sibling tasks for the rest. Update the partition and make Tasks 26 and 30 plus
any affected Tasks 27–29 depend on every sibling; Task 31 is blocked transitively.

### Task 22 - L112E-03-SPELL6-BARRIERS-WARDS

Inputs: the exact Task 22 partition (`blade_barrier`, `forbiddance`,
`globe_of_invulnerability`, `guards_and_wards`, `wall_of_ice`,
`wall_of_thorns`), their SRD passages and Surface mechanics, and existing
hazard/barrier/session ward owners.

Close all six hazard, barrier, and ward procedures at the correct
battle/table/session boundaries.

Acceptance: geometry and table decisions remain caller-owned; runtime stores
only source-owned occurrences and execution facts needed by the supported
slice, and every one of the six identities has focused evidence.

Outputs: reusable occurrence/procedure facts,
`packages/battle-runtime/src/spell-level6-barriers-wards.test.ts`, and
`packages/character-sheet-runtime/src/spell-level6-barriers-wards.test.ts`, with
no duplicated map geometry.

Verification: run each named test with its package-local Vitest command, then
typecheck both packages; specifically:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/spell-level6-barriers-wards.test.ts`
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-level6-barriers-wards.test.ts`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`

Task 30 owns proof/MBT closure for battle behavior.

Plan Impact: if barrier, hazard, and session-ward owners change independently,
narrow this task to the first cohesive exact-id subset and add sibling tasks for
the rest. Update the partition and make Tasks 26 and 30 plus any affected Tasks
27–29 depend on every sibling; Task 31 is blocked transitively.

### Task 23 - L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM

Inputs: the exact Task 23 partition (`conjure_fey`, `create_undead`,
`instant_summons`, `magic_jar`), their SRD passages and Surface mechanics, and
shared companion/object/creature/session owners.

Close all four summon, object, and possession/transformation procedures.

Acceptance: all four identities are executable at their owning product
boundaries and no spell-specific parallel creature/object state is introduced.
Product rejection or a prose-only follow-up is not completion.

Outputs: typed companion/object/creature/session procedures,
`packages/battle-runtime/src/spell-level6-summon-object-transform.test.ts`, and
`packages/character-sheet-runtime/src/spell-level6-summon-object-transform.test.ts`.

Verification: run each named test with its package-local Vitest command, then
typecheck both packages; specifically:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/spell-level6-summon-object-transform.test.ts`
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-level6-summon-object-transform.test.ts`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`

Task 30 owns proof/MBT closure for battle behavior.

Plan Impact: these mechanics are expected to cross distinct owners. Unless repo
inspection proves one cohesive change, narrow this task to the first exact-id
owner subset and add sibling tasks for the rest before implementation. Update
the partition and make Tasks 26 and 30 plus any affected Tasks 27–29 depend on
every sibling; Task 31 is blocked transitively. Do not leave an aggregator
parent that would remain the first runnable task.

### Task 24 - L112E-05-SPELL6-TRAVEL-EXPLORATION

Inputs: the exact Task 24 partition (`find_the_path`, `move_earth`,
`transport_via_plants`, `true_seeing`, `wind_walk`, `word_of_recall`), their
SRD passages and Surface mechanics, and Character Sheet/session/MCP/table-facing
owners.

Close all six exploration, travel, terrain, and perception procedures.

Acceptance: supported user workflows are executable; presentation or world
facts are not mislabeled as battle-runtime support; all six identities have
focused evidence at their real product boundary.

Outputs: typed sheet/session/table procedure facts, MCP routes where needed,
`packages/character-sheet-runtime/src/spell-level6-travel-exploration.test.ts`,
and `packages/mcp/src/spell-level6-travel-exploration.test.ts`.

Verification: run each named test with its package-local Vitest command, then
typecheck both packages; specifically:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-level6-travel-exploration.test.ts`
- `pnpm --filter @dnd/mcp exec vitest run src/spell-level6-travel-exploration.test.ts`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` when a public scenario route changes

Plan Impact: wherever travel, terrain, and perception owners change
independently, narrow this task to the first cohesive exact-id subset and add
sibling tasks for the rest. Update the partition and make Tasks 26 and 30 plus
any affected Tasks 27–29 depend on every sibling; Task 31 is blocked transitively.

### Task 25 - L112E-06-SPELL6-ILLUSION-SESSION

Inputs: the exact Task 25 partition (`contingency`, `heroes_feast`,
`planar_ally`, `programmed_illusion`), their SRD passages and Surface mechanics,
and existing stored-procedure/session/durable-benefit owners.

Close all four session-oriented procedures through durable typed owners.

Acceptance: triggers, stored procedures, durations, costs, participants, and
session facts are represented once at their owning boundary, and every one of
the four identities has focused executable evidence.

Outputs: typed durable/session procedures,
`packages/character-sheet-runtime/src/spell-level6-illusion-session.test.ts`, and
`packages/mcp/src/spell-level6-illusion-session.test.ts`.

Verification: run each named test with its package-local Vitest command, then
typecheck both packages; specifically:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-level6-illusion-session.test.ts`
- `pnpm --filter @dnd/mcp exec vitest run src/spell-level6-illusion-session.test.ts`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` when a public scenario route changes

Plan Impact: wherever the four procedures change independent owners, narrow
this task to the first cohesive exact-id subset and add sibling tasks for the
rest. Update the partition and make Tasks 26 and 30 plus any affected Tasks
27–29 depend on every sibling; Task 31 is blocked transitively.

### Task 26 - L112F-01-RULES-KERNEL-EVIDENCE

Inputs: all supported reducer-semantic profiles from Tasks 13–25 and the
checked owners under `plans/rules-kernel-coverage/`.

Add or update `profile-obligations.jsonl`, `obligations.jsonl`, QNT owner roles,
parity witnesses, and generator-readiness rows for every new reducer-semantic
profile. Do not treat catalog width or a Surface record as semantic evidence.
This SRD delivery plan does not change any Cleanroom horizon or acceptance
contract.

Acceptance: all scoped supported profiles have covered obligation joins,
production runtime owners, QNT owners, parity witnesses, and assessed
generator-readiness rows with no unowned holes.

Outputs: current rules-kernel JSONL owners and their generated reports; no
parallel Cleanroom ledger.

Verification: `pnpm rules-kernel-coverage:check:self-test`, then
`pnpm rules-kernel-coverage:check -- --write`, then
`pnpm rules-kernel-coverage:check`.

Plan Impact: any real rules-kernel or generator-readiness blocker becomes an
explicit dependency-linked task that blocks Tasks 31–34. Do not label a Source
record, catalog row, or future Cleanroom task as parity evidence.

### Task 27 - L112F-02-MCP-SHEET-SCENARIO

Inputs: Tasks 10–12, existing level-10 MCP scenario conventions,
`plans/unit-profile-coverage/mcp-scenario-evidence.json`, and public MCP tools.

Add an executable level-12 character creation and Character Sheet scenario that
demonstrates advancement, a level-12 choice occurrence, and current resources.

Acceptance: the scenario uses installed SRD Surface records and is registered in
checker-owned MCP evidence.

Outputs: `packages/mcp/src/mcp-level-twelve-sheet-scenario.test.ts`, its
evidence row, and registration in `test:mcp-scenario-evidence`.

Verification: `pnpm --filter @dnd/mcp exec vitest run
src/mcp-level-twelve-sheet-scenario.test.ts` and
`pnpm --filter @dnd/mcp test:mcp-scenario-evidence`.

Plan Impact: if the public tool surface cannot express the workflow, add a
blocking typed MCP/application task; direct reducer setup is not an alternative.

### Task 28 - L112F-03-MCP-BATTLE-SCENARIO

Inputs: Tasks 13–19, the installed SRD catalog, character-to-battle handoff, and
existing MCP battle scenario conventions.

Add an executable level-11 battle handoff using at least one promoted class
feature. Include a spell-level-6 procedure only when that same scenario reaches
it naturally through public selection and battle APIs.

Acceptance: the scenario crosses real creation/sheet/battle boundaries and does
not substitute fixture-only identity or direct reducer setup for the handoff.

Outputs: `packages/mcp/src/mcp-level-eleven-battle-scenario.test.ts`, its
evidence row, and registration in `test:mcp-scenario-evidence`.

Verification: `pnpm --filter @dnd/mcp exec vitest run
src/mcp-level-eleven-battle-scenario.test.ts` and
`pnpm --filter @dnd/mcp test:mcp-scenario-evidence`.

Plan Impact: any missing public handoff becomes a typed blocking task before
this scenario; do not weaken the scenario to a fixture or selected-identity
projection.

### Task 29 - L112F-04-MCP-NONBATTLE-SCENARIO

Inputs: Tasks 24–25, the installed SRD catalog, public session/MCP APIs, and
checker-owned MCP evidence.

Add one executable nonbattle spell-level-6 workflow owned by session/MCP.

Acceptance: checker evidence names the required flow and the scenario proves
the real installed Surface-to-session path.

Outputs: `packages/mcp/src/mcp-spell-level-six-nonbattle-scenario.test.ts`, its
evidence row, and registration in `test:mcp-scenario-evidence`.

Verification: `pnpm --filter @dnd/mcp exec vitest run
src/mcp-spell-level-six-nonbattle-scenario.test.ts` and
`pnpm --filter @dnd/mcp test:mcp-scenario-evidence`.

Plan Impact: if no Task 24–25 identity has a public executable session path,
add the smallest typed MCP/session prerequisite as a dependency. Keep this
task's status `ready-for-implementation`; the unfinished dependency makes it
non-runnable until that prerequisite lands.

### Task 30 - L112F-05-FOCUSED-QNT-MBT

Inputs: every QNT and `*.mbt.test.ts` file changed or added by Tasks 13–25.
Each contributing task must append its exact MBT filename to this task before
being marked done; `extra-attack-count.mbt.test.ts` is the known existing file
for Task 14.

Run the self-locking public proof scripts directly, never inside another lock:

- `pnpm --filter @dnd/shared-algebras test:qnt-proofs` when shared rule-core QNT
  changed;
- `pnpm --filter @dnd/character-creation-runtime test:qnt-proofs` when its QNT
  changed;
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` when battle QNT changed.

Run each recorded focused battle MBT file separately. Submit the entire fenced
lock-owning command—not only its inner Vitest child—to the agent runner's
background execution facility:

```bash
. scripts/resource-lock-owner.sh && with_resource_lock_owner \
  scripts/with-mbt-lock.sh bash -lc '
    survivors=$(ps aux | awk '\''
      $11 ~ /quint_evaluator$/ || ($11 ~ /node$/ && $0 ~ /[v]itest/) { print }
    '\'')
    if [ -n "$survivors" ]; then
      printf "%s\n" "$survivors" >&2
      echo "verification process survived before locked MBT run" >&2
      exit 70
    fi
    START=$(date +%s)
    pnpm --filter @dnd/battle-runtime exec vitest run <recorded-file> 2>&1 &
    mbt_pid=$!
    (while kill -0 "$mbt_pid" 2>/dev/null; do
      sleep 60
      kill -0 "$mbt_pid" 2>/dev/null && echo "MBT still running: $(( $(date +%s) - START ))s"
    done) &
    progress_pid=$!
    wait "$mbt_pid"
    status=$?
    kill "$progress_pid" 2>/dev/null || true
    wait "$progress_pid" 2>/dev/null || true
    echo "TOTAL: $(( $(date +%s) - START ))s"
    exit "$status"
  '
```

The background observer must emit one-minute progress. If the locked preflight
finds a confirmed orphan, kill only that process before running Vitest; do not
proceed while another live verification owner exists.

Acceptance: proof events pass, every MBT failure is reproduced by seed before a
fix, every recorded behavior family passes once, and no unbounded, nested-lock,
or duplicate MBT run is launched.

Outputs: durable exact MBT filename requirements in this task body and fixes for
any real parity failure. Exact commands, results, and logs belong to the task's
ignored `.ralph/` attempt/run report, not canonical requirements prose.

Verification: the applicable public proof commands above plus one locked,
observed command per exact recorded MBT file.

Plan Impact: a failure remains owned by its originating Task 13–25 behavior and
blocks Tasks 31–34 until fixed and rerun. A missing recorded MBT path is itself
a task-consistency failure.

### Task 31 - L112A-04-ULTRA-GOLDEN-PROMOTION

Inputs: converged implementation/evidence from Tasks 26–30, the shared scope
registry, `scripts/ultra-golden-gate.cjs`, and all generated coverage artifacts.

Add level 1-11 and level 1-12 to the canonical ultra-golden aggregate and
regenerate strict artifacts only after all implementation and evidence tasks
have landed.

Acceptance: both scopes pass every required layer with no audit-reuse shortcut,
zero strict final-support blockers, and all older scopes remain passing.

Outputs: regenerated level 1-11/1-12 reports, inventory/matrix projections,
rules-kernel reports, and ultra-golden JSON/Markdown from their canonical
generators.

Verification: `pnpm unit-profile-coverage:check:self-test`,
`pnpm unit-profile-coverage:check --write`,
`pnpm unit-profile-coverage:check`,
`pnpm rules-kernel-coverage:check:self-test`,
`pnpm rules-kernel-coverage:check -- --write`, and
`pnpm rules-kernel-coverage:check`.

Plan Impact: any generated blocker returns to its exact owning task or creates
a dependency-linked child that blocks Tasks 32–34. Never hand-edit generated
JSON or Markdown.

### Task 32 - L112F-06-REVIEWER-CONVERGENCE

Inputs: the complete post-promotion and consistency-checker changeset from Tasks
2–31 and Task 33, exact local SRD passages, `UBIQUITOUS_LANGUAGE.md`, `AGENTS.md`, and
`.claude/review-rules.md`.

Run repeated RAW traceability, ubiquitous-language/domain, architecture and
connascence, and code-review passes. Fix every reasonable finding and repeat
until no reasonable findings remain. Record concrete reasons for rejected
notes.

Acceptance: every modeled rule cites a local SRD passage; no reasonable reviewer
finding remains; significant changes receive at least two rounds after
ultra-golden promotion.

Outputs: reviewer findings, fixes, regenerated affected artifacts, and recorded
reasons for any rejected note.

Verification: rerun every focused check affected by review fixes, then
`pnpm unit-profile-coverage:check` and `pnpm rules-kernel-coverage:check`.

Plan Impact: a real finding returns to or creates an owning dependency-linked
task; do not proceed to final quality while a reasonable finding remains.

### Task 33 - L112F-07-PLAN-CONSISTENCY

Inputs: this plan, both mining audits, the final generated spell-level-6 unique
identity set, and all task results/statuses.

Verify the machine-readable task index, dependency graph, task headings, and
landed status. Update statuses only for outputs that actually exist and passed
their required verification.

Acceptance: `pnpm check:ralph-task-index` passes and no desired work disappears
into prose-only deferral. Add a focused checker that proves the spell partition
contains exactly the 31 generated identities once each and that every required
follow-up/child task blocks Tasks 31–34.

Outputs: synchronized statuses/dependencies,
`scripts/level1-12-ralph-plan-consistency.cjs`, its Node test, and a root
`check:level1-12-ralph-plan` script included in `pnpm quality`; no duplicate
prose dependency graph.

Verification: `pnpm check:level1-12-ralph-plan`,
`pnpm check:ralph-task-index`, and `git diff --check`.

Plan Impact: any mismatch is repaired in its canonical index, partition, or
owning task before Task 32 becomes runnable; consistency never substitutes for
product completion.

### Task 34 - L112F-08-FINAL-QUALITY

Inputs: the complete reviewed changeset and current generated artifacts from
Tasks 31–33.

Run the public resource-bounded verification commands from the Ralph acceptance
branch after all generated artifacts are current: `master` for a
`--commit-to-base --base master` run, otherwise the configured integration
branch.

Acceptance:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm test`
- `pnpm quality`
- `git diff --check`

Verification: run the acceptance commands serially and directly. `pnpm test`
and `pnpm quality` acquire the broad workspace lock themselves; do not wrap or
invoke their internal `:body`/`:turbo` scripts.

The final report must name closed blockers, changed owner artifacts, focused
checks, and the remaining strict blocker count. A partial run is not full level
1-12 support.

Outputs: a final command/result report and final generated artifacts only when a
gate identifies staleness that is fixed through its canonical generator.

Plan Impact: any failure returns to its owning implementation/evidence task and
blocks completion. `pnpm quality` supplies the current coverage, provenance,
SDK inventory, lint, circularity, and typecheck gates; do not resurrect retired
checks from historical plans.
