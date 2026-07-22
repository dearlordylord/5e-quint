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
    { "number": 23, "id": "L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM", "status": "ready-for-implementation", "title": "Promote spell-level-6 summon, object, and transformation procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 24, "id": "L112E-05-SPELL6-TRAVEL-EXPLORATION", "status": "ready-for-implementation", "title": "Promote spell-level-6 travel and exploration procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 25, "id": "L112E-06-SPELL6-ILLUSION-SESSION", "status": "ready-for-implementation", "title": "Promote spell-level-6 illusion, contingency, and session procedures", "dependencies": ["L112B-05-SPELL6-CATALOG-ACCESS", "L112C-04-SPELL6-ACCESS"] },
    { "number": 26, "id": "L112F-01-RULES-KERNEL-CLEANROOM", "status": "ready-for-implementation", "title": "Close rules-kernel and cleanroom evidence for promoted level 11-12 behavior", "dependencies": ["L112D-01-RELENTLESS-RAGE", "L112D-02-TWO-EXTRA-ATTACKS", "L112D-03-FLEET-STEP", "L112D-04-RADIANT-STRIKES", "L112D-05-SUPERIOR-HUNTERS-PREY", "L112D-06-IMPROVED-CUNNING-STRIKE", "L112D-07-MYSTIC-ARCANUM", "L112E-01-SPELL6-DAMAGE-HEALING", "L112E-02-SPELL6-CONDITION-CONTROL", "L112E-03-SPELL6-BARRIERS-WARDS", "L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM", "L112E-05-SPELL6-TRAVEL-EXPLORATION", "L112E-06-SPELL6-ILLUSION-SESSION"] },
    { "number": 27, "id": "L112F-02-MCP-SHEET-SCENARIO", "status": "ready-for-implementation", "title": "Add a level-12 character creation and sheet MCP scenario", "dependencies": ["L112C-02-LEVEL11-12-SHEET", "L112C-03-LEVEL12-ASI-OCCURRENCES", "L112C-04-SPELL6-ACCESS"] },
    { "number": 28, "id": "L112F-03-MCP-BATTLE-SCENARIO", "status": "ready-for-implementation", "title": "Add a level-11 battle handoff MCP scenario", "dependencies": ["L112D-01-RELENTLESS-RAGE", "L112D-02-TWO-EXTRA-ATTACKS", "L112D-03-FLEET-STEP", "L112D-04-RADIANT-STRIKES", "L112D-05-SUPERIOR-HUNTERS-PREY", "L112D-06-IMPROVED-CUNNING-STRIKE", "L112D-07-MYSTIC-ARCANUM"] },
    { "number": 29, "id": "L112F-04-MCP-NONBATTLE-SCENARIO", "status": "ready-for-implementation", "title": "Add a spell-level-6 nonbattle MCP scenario", "dependencies": ["L112E-05-SPELL6-TRAVEL-EXPLORATION", "L112E-06-SPELL6-ILLUSION-SESSION"] },
    { "number": 30, "id": "L112F-05-FOCUSED-QNT-MBT", "status": "ready-for-implementation", "title": "Run focused QNT proofs and selective MBT for changed battle behavior", "dependencies": ["L112D-01-RELENTLESS-RAGE", "L112D-02-TWO-EXTRA-ATTACKS", "L112D-03-FLEET-STEP", "L112D-04-RADIANT-STRIKES", "L112D-05-SUPERIOR-HUNTERS-PREY", "L112D-06-IMPROVED-CUNNING-STRIKE", "L112D-07-MYSTIC-ARCANUM", "L112E-01-SPELL6-DAMAGE-HEALING", "L112E-02-SPELL6-CONDITION-CONTROL", "L112E-03-SPELL6-BARRIERS-WARDS", "L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM"] },
    { "number": 31, "id": "L112F-06-REVIEWER-CONVERGENCE", "status": "ready-for-implementation", "title": "Converge RAW, language, architecture, connascence, and code review", "dependencies": ["L112F-01-RULES-KERNEL-CLEANROOM", "L112F-02-MCP-SHEET-SCENARIO", "L112F-03-MCP-BATTLE-SCENARIO", "L112F-04-MCP-NONBATTLE-SCENARIO", "L112F-05-FOCUSED-QNT-MBT"] },
    { "number": 32, "id": "L112A-04-ULTRA-GOLDEN-PROMOTION", "status": "ready-for-implementation", "title": "Promote level 1-11 and level 1-12 into the ultra-golden aggregate", "dependencies": ["L112F-06-REVIEWER-CONVERGENCE"] },
    { "number": 33, "id": "L112F-07-PLAN-CONSISTENCY", "status": "ready-for-implementation", "title": "Verify Ralph task index, dependencies, and task bodies", "dependencies": ["L112A-04-ULTRA-GOLDEN-PROMOTION"] },
    { "number": 34, "id": "L112F-08-FINAL-QUALITY", "status": "ready-for-implementation", "title": "Run the final serialized quality gate", "dependencies": ["L112F-07-PLAN-CONSISTENCY"] }
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
| F    | Rules-kernel, cleanroom, MCP scenarios, reviewer convergence, and final verification                 |

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

## Verification

Task 31 owns reviewer-loop convergence: after implementation, repeat RAW
traceability, ubiquitous-language/domain, architecture/connascence, and code
review passes until no reasonable finding remains. Every modeled rule must
trace to a specific passage in the local SRD corpus and use the terminology in
`UBIQUITOUS_LANGUAGE.md`; Task 31 cannot complete on inferred or externally
sourced rules text. Task 30 owns focused QNT/MBT evidence for changed battle
behavior, and Task 34 owns the final public resource-bounded workspace checks.

## Task Details

### Task 1 - L112A-01-MINED-BASELINE

Already applied on `master`. Preserve the generated level 11-12 denominator and
do not reinterpret it as support evidence.

Acceptance:

- Level 11 has 19 mined rows and level 12 has 24.
- Fleet Step and Superior Hunter's Prey are subclass-feature grants owned by
  `subclass_monk_warrior_of_the_open_hand` and `subclass_ranger_hunter`.
- Spell level 6 has 59 class-list rows and 31 unique identities.
- Both mining audits have no missing included bands.

Verification: `pnpm unit-profile-coverage:check`.

### Task 2 - L112A-02-STRICT-REPORT-PLUMBING

Add generated `level1-11-full-support` and `level1-12-full-support` JSON and
Markdown outputs. Generalize the scope registry where practical so later levels
do not require another scattered copy of paths, builders, renderers, and labels.
Do not weaken the existing level 1-10 claims.

Acceptance: both new reports are generated from the shared inventory/matrix and
surface every in-scope blocker.

### Task 3 - L112A-03-NONVACUOUS-STRICT-GATES

Require non-empty `level-11`, `level-12`, and `spell-level-6` bands. Add
self-tests proving level 11 introduces spell level 6 and level 12 carries it
without introducing spell level 7.

Acceptance: deleting any required band makes the focused checker self-test fail
with the missing band named.

### Task 4 - L112B-01-LEVEL11-FEATURE-SURFACE

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

### Task 5 - L112B-02-LEVEL12-ASI-SURFACE

Represent the twelve level-12 Ability Score Improvement grant occurrences from
the class tables without duplicating the selected feat mechanics.

Acceptance: each class retains a distinct level-12 grant occurrence while the
selected feat Unit remains the single owner of feat identity and mechanics.

### Task 6 - L112B-03-SPELL6-SURFACE-BATTLE

Author the missing spell-level-6 definitions whose primary executable pressure
is battle-facing: `conjure_fey`, `eyebite`, `freezing_sphere`,
`globe_of_invulnerability`, `irresistible_dance`, `magic_jar`, and
`programmed_illusion`. This assignment partitions the generated denominator; it
does not replace it. Preserve exact SRD provenance and derive runtime
projections from mechanics.

Acceptance: every selected missing record decodes, publishes, and is classified
for a concrete Lane E owner.

### Task 7 - L112B-04-SPELL6-SURFACE-WORLD

Author the remaining missing spell-level-6 definitions whose pressure belongs
to session, travel, ward, object, summon, transformation, or presentation
owners: `contingency`, `find_the_path`, `forbiddance`, `guards_and_wards`,
`heroes_feast`, `instant_summons`, `move_earth`, `planar_ally`,
`transport_via_plants`, and `word_of_recall`.

Acceptance: all seventeen previously missing spell identities are authored in
aggregate across Tasks 6-7, with no invented runtime behavior or inert status
metadata.

### Task 8 - L112B-05-SPELL6-CATALOG-ACCESS

Install all 31 SRD spell-level-6 identities in the SRD Surface collection and
reconcile class-list access from the local corpus. Keep provenance, structured
input, and runtime projection distinct.

Acceptance: every spell-level-6 row is authored and installed; class-list row
counts and unique-identity counts remain 59 and 31.

### Task 9 - L112C-01-LEVEL11-12-CREATION

Extend character advancement through levels 11 and 12 using Surface class
tables and feature grants. Parse once at the boundary and pass narrowed
advancement facts forward.

Acceptance: all twelve SRD classes can advance through both levels, and focused
tests cover discovery, fills, finalization, and build projection.

### Task 10 - L112C-02-LEVEL11-12-SHEET

Project the mined class-table deltas into existing Character Sheet owners:
Proficiency Bonus, spell slots, prepared counts, Pact Magic, class pools, dice,
and attack-count facts. Do not store table summaries or duplicate derivable
values.

Acceptance: every non-empty generated progression delta has an executable owner
or a precise type-enforced non-runtime disposition.

### Task 11 - L112C-03-LEVEL12-ASI-OCCURRENCES

Implement the repeated level-12 Ability Score Improvement choice occurrence
through the existing feat/ability-score selection workflow.

Acceptance: the occurrence is independently selectable once per granting class
level, while selected feat and score facts remain canonical and non-duplicated.

### Task 12 - L112C-04-SPELL6-ACCESS

Implement spell-level-6 access for full casters and the level-11 Mystic Arcanum
path for Warlock. Preserve Paladin and Ranger table-derived spell-level-3
progression without granting them spell-level-6 access.

Acceptance: discovery, preparation/selection, slot or arcanum resource facts,
and Character Sheet projection match each class table.

### Task 13 - L112D-01-RELENTLESS-RAGE

Model Barbarian Relentless Rage from its exact SRD passage. Reuse the existing
zero-Hit-Point, Saving Throw, Rage occurrence, and rest/resource owners.

Acceptance: focused QNT and runtime tests cover trigger, DC progression/reset,
success, failure, and cleanup without authored-identity execution dispatch.

### Task 14 - L112D-02-TWO-EXTRA-ATTACKS

Widen the existing Attack-action attack-count scaling owner from two attacks to
the level-11 Fighter count.

Acceptance: the count is derived from admitted class-feature facts and parity
tests prove sequencing without positional or magic-number coupling.

### Task 15 - L112D-03-FLEET-STEP

Model Warrior of the Open Hand Fleet Step through the existing Step of the
Wind, Bonus Action, Focus Point, and movement owners. Retain its subclass grant
ownership through character advancement.

Acceptance: the new benefit is represented as typed mechanics and does not
introduce a second movement budget or name-based dispatch.

### Task 16 - L112D-04-RADIANT-STRIKES

Model Paladin Radiant Strikes as an admitted attack-damage rider using the
existing hit/damage procedure.

Acceptance: eligible attacks receive the exact SRD rider once at the correct
damage boundary, with focused QNT/runtime parity.

### Task 17 - L112D-05-SUPERIOR-HUNTERS-PREY

Model Hunter Superior Hunter's Prey as a widening of the existing Hunter's Mark
and subclass feature procedure facts. Retain its subclass grant ownership
through character advancement.

Acceptance: the supported effects flow through typed target/effect state and do
not copy marked-target identity or dispatch on the feature name.

### Task 18 - L112D-06-IMPROVED-CUNNING-STRIKE

Widen the Cunning Strike owner for the level-11 feature's permitted option
composition and Sneak Attack dice costs.

Acceptance: option selection, cost, ordering, and replay are type-enforced and
covered by focused QNT/runtime tests.

### Task 19 - L112D-07-MYSTIC-ARCANUM

Implement Mystic Arcanum selection, retained Character Sheet facts, Long Rest
resource lifecycle, and supported casting handoff. Keep the selected spell
reference as composition identity; execution uses the admitted spell procedure.

Acceptance: selection legality, one-use resource spend/restore, and invocation
are executable without spell-name dispatch.

### Task 20 - L112E-01-SPELL6-DAMAGE-HEALING

Close spell-level-6 direct, area, recurring, and chained damage plus Hit Point
restoration rows through existing or widened procedure owners. Candidate rows
include Chain Lightning, Circle of Death, Disintegrate, Harm, Heal, and Sunbeam;
the generated report remains the denominator.

Acceptance: every assigned row is supported or has an enforced product
rejection, with focused rule-core/QNT/runtime evidence for battle behavior.

### Task 21 - L112E-02-SPELL6-CONDITION-CONTROL

Close save-gated, repeating-save, condition, compelled-action, and suggestion
rows such as Eyebite, Flesh to Stone, Irresistible Dance, and Mass Suggestion.

Acceptance: condition sources, repeat timing, saves, duration, Concentration,
and cleanup reuse shared owners and have focused evidence.

### Task 22 - L112E-03-SPELL6-BARRIERS-WARDS

Close Blade Barrier, Globe of Invulnerability, Guards and Wards, Wall of Ice,
Wall of Thorns, Forbiddance, and related hazard/ward rows at the correct
battle/table/session boundaries.

Acceptance: geometry and table decisions remain caller-owned; runtime stores
only source-owned occurrences and execution facts needed by the supported
slice.

### Task 23 - L112E-04-SPELL6-SUMMON-OBJECT-TRANSFORM

Close Conjure Fey, Create Undead, Instant Summons, Magic Jar, and relevant
object/transformation rows through shared companion, object, creature-state,
and session owners.

Acceptance: no spell-specific parallel creature/object state is introduced;
unsupported portions receive precise executable follow-up tasks or enforced
product rejection.

### Task 24 - L112E-05-SPELL6-TRAVEL-EXPLORATION

Close Find the Path, Move Earth, Transport via Plants, True Seeing, Wind Walk,
Word of Recall, and related exploration/travel rows through Character Sheet,
session, MCP, and table-facing owners.

Acceptance: supported user workflows are executable; presentation or world
facts are not mislabeled as battle-runtime support.

### Task 25 - L112E-06-SPELL6-ILLUSION-SESSION

Close Contingency, Programmed Illusion, Planar Ally, Heroes' Feast, and other
remaining session-oriented rows through durable procedure owners.

Acceptance: triggers, stored procedures, durations, costs, participants, and
session facts are represented once at their owning boundary.

### Task 26 - L112F-01-RULES-KERNEL-CLEANROOM

Add rules-kernel obligation joins and cleanroom evidence for every newly
supported reducer-semantic profile. Do not treat catalog width or a Surface
record as semantic evidence.

Acceptance: all scoped supported profiles have covered joins and no unowned QNT
or generator-readiness holes.

### Task 27 - L112F-02-MCP-SHEET-SCENARIO

Add an executable level-12 character creation and Character Sheet scenario that
demonstrates advancement, a level-12 choice occurrence, and current resources.

Acceptance: the scenario uses installed SRD Surface records and is registered in
checker-owned MCP evidence.

### Task 28 - L112F-03-MCP-BATTLE-SCENARIO

Add an executable level-11 battle handoff using at least one promoted class
feature and, where supported, a spell-level-6 procedure.

Acceptance: the scenario crosses real creation/sheet/battle boundaries and does
not substitute fixture-only identity or direct reducer setup for the handoff.

### Task 29 - L112F-04-MCP-NONBATTLE-SCENARIO

Add one executable nonbattle spell-level-6 workflow owned by session/MCP.

Acceptance: checker evidence names the required flow and the scenario proves
the real installed Surface-to-session path.

### Task 30 - L112F-05-FOCUSED-QNT-MBT

Run package-local QNT proofs for changed models and one focused battle MBT file
per changed end-to-end behavior family. Hold the shared verification lock and
follow the mandatory background observation protocol.

Acceptance: proof events pass, every MBT failure is reproduced by seed before a
fix, and no unbounded or duplicate MBT run is launched.

### Task 31 - L112F-06-REVIEWER-CONVERGENCE

Run repeated RAW traceability, ubiquitous-language/domain, architecture and
connascence, and code-review passes. Fix every reasonable finding and repeat
until no reasonable findings remain. Record concrete reasons for rejected
notes.

Acceptance: every modeled rule cites a local SRD passage; no reasonable reviewer
finding remains; significant changes receive at least two rounds.

### Task 32 - L112A-04-ULTRA-GOLDEN-PROMOTION

Only after implementation and evidence converge, add level 1-11 and level 1-12
to the ultra-golden aggregate and regenerate strict artifacts.

Acceptance: both scopes pass every required layer with no audit-reuse shortcut,
and all older scopes remain passing.

### Task 33 - L112F-07-PLAN-CONSISTENCY

Verify the machine-readable task index, dependency graph, task headings, and
landed status. Update statuses only for outputs that actually exist and passed
their required verification.

Acceptance: `pnpm check:ralph-task-index` passes and no desired work disappears
into prose-only deferral.

### Task 34 - L112F-08-FINAL-QUALITY

Run the public resource-bounded verification commands from the integration
branch after all generated artifacts are current.

Acceptance:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm typecheck`
- `pnpm test`
- `pnpm quality`
- `git diff --check`

The final report must name closed blockers, changed owner artifacts, focused
checks, and the remaining strict blocker count. A partial run is not full level
1-12 support.
