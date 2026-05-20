# Rules Kernel B Coverage Closure Ralph Plan

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "RKBC-BATTLE-HOLE-INVENTORY",
      "status": "ready-for-research",
      "title": "Battle Hole And Fill Inventory"
    },
    {
      "number": 2,
      "id": "RKBC-BATTLE-HOLE-TARGETS-AREAS",
      "status": "blocked",
      "title": "Battle Target And Area Hole Obligations"
    },
    {
      "number": 3,
      "id": "RKBC-BATTLE-HOLE-MOVEMENT-ROUTE",
      "status": "blocked",
      "title": "Battle Movement Route And Spatial Fact Obligations"
    },
    {
      "number": 4,
      "id": "RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION",
      "status": "blocked",
      "title": "Battle Damage Disposition And Type Choice Obligations"
    },
    {
      "number": 5,
      "id": "RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND",
      "status": "blocked",
      "title": "Battle Ability Skill And Command Hole Obligations"
    },
    {
      "number": 6,
      "id": "RKBC-BATTLE-HOLE-REACTION-CONCENTRATION",
      "status": "blocked",
      "title": "Battle Reaction And Concentration Hole Obligations"
    },
    {
      "number": 7,
      "id": "RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE",
      "status": "ready-for-research",
      "title": "Feature Passive Resource And Persistent Profile Join"
    },
    {
      "number": 8,
      "id": "RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS",
      "status": "ready-for-research",
      "title": "Feature Reaction Bonus Action And Resource Profile Join"
    },
    {
      "number": 9,
      "id": "RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION",
      "status": "ready-for-research",
      "title": "Spell Damage Condition And Scalar Profile Join"
    },
    {
      "number": 10,
      "id": "RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION",
      "status": "ready-for-research",
      "title": "Spell After Hit Reaction And Marked Effect Profile Join"
    },
    {
      "number": 11,
      "id": "RKBC-PROFILE-JOIN-TABLE-CALLER",
      "status": "ready-for-research",
      "title": "Table Caller Profile Join And Boundary Classification"
    },
    {
      "number": 12,
      "id": "RKBC-CREATION-CHOICE-DISCOVERY-CARDINALITY",
      "status": "ready-for-research",
      "title": "Character Creation Choice Discovery And Cardinality"
    },
    {
      "number": 13,
      "id": "RKBC-CREATION-FILL-VALIDATION-BATCH",
      "status": "ready-for-research",
      "title": "Character Creation Fill Validation And Atomic Batch"
    },
    {
      "number": 14,
      "id": "RKBC-CREATION-ADVANCEMENT-REPLACEMENT",
      "status": "blocked",
      "title": "Character Creation Advancement And Replacement"
    },
    {
      "number": 15,
      "id": "RKBC-CREATION-SPELLCASTING-PROGRESSION",
      "status": "blocked",
      "title": "Character Creation Spellcasting Progression And Invocations"
    },
    {
      "number": 16,
      "id": "RKBC-CREATION-WEAPON-MASTERY-FEAT",
      "status": "blocked",
      "title": "Character Creation Weapon Mastery And Feat Choice"
    },
    {
      "number": 17,
      "id": "RKBC-SHEET-HP-REST-HIT-DICE",
      "status": "ready-for-research",
      "title": "Character Sheet HP Rest And Hit Dice Transitions"
    },
    {
      "number": 18,
      "id": "RKBC-SHEET-SPELL-SLOTS-PACT-SLOTS",
      "status": "ready-for-research",
      "title": "Character Sheet Spell Slot And Pact Slot Transitions"
    },
    {
      "number": 19,
      "id": "RKBC-SHEET-FEATURE-RESOURCES",
      "status": "ready-for-research",
      "title": "Character Sheet Feature Resource Transitions"
    },
    {
      "number": 20,
      "id": "RKBC-SHEET-WEAPON-MASTERY-RITUAL",
      "status": "ready-for-research",
      "title": "Character Sheet Weapon Mastery And Ritual Projection"
    },
    {
      "number": 21,
      "id": "RKBC-HANDOFF-BATTLE-INIT",
      "status": "ready-for-research",
      "title": "Character Battle Initialization Projection"
    },
    {
      "number": 22,
      "id": "RKBC-HANDOFF-BATTLE-SETTLEMENT",
      "status": "blocked",
      "title": "Character Battle Settlement Back To Sheet"
    },
    {
      "number": 23,
      "id": "RKBC-HANDOFF-IDENTITY-CONFLICTS",
      "status": "blocked",
      "title": "Character Battle Identity And Max HP Conflict Handling"
    },
    {
      "number": 24,
      "id": "RKBC-FINAL-B-CLOSURE-GATE",
      "status": "blocked",
      "title": "Final Rules Kernel B Closure Gate"
    }
  ]
}
-->

This is the Ralph-ready execution plan for **B: rules-kernel coverage closure**
from `PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md`. It does not plan C
generator-readiness work and it does not plan D/E Rust generation. C remains the
separate generator-readiness program after B closure.

## Current Baseline

Generated source:

- `plans/rules-kernel-coverage/REPORT.md`
- `plans/rules-kernel-coverage/matrix.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`

Current B status:

| Metric | Current |
| --- | ---: |
| Rules-kernel obligations | 15 |
| Covered obligations | 8 |
| Open transitional obligations | 5 |
| Boundary/unsupported obligations | 2 |
| Rules-kernel profile join coverage | 25/95 (26.3%) |
| Rules-kernel covered profile coverage | 20/95 (21.1%) |
| Supported Unit full-chain coverage | 42/128 (32.8%) |

Open transitional obligations:

- `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION`
- `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN`
- `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT`
- `SHEET.REST_AND_RESOURCE.TRANSITIONS`
- `CHARACTER.BATTLE.HANDOFF.SETTLEMENT`

## Done State

B is closed when:

- no rules-kernel obligation has a `needs-*` status;
- every TS-current reducer semantic is either `covered`, `boundary-only`, or
  `unsupported-by-admission`;
- every reducer-owned supported Unit profile maps through
  `profile-obligations.jsonl` to covered rules-kernel obligations;
- generated rules-kernel and Unit-profile reports are fresh;
- the checker is tightened so new reducer semantics cannot merge without a
  covered rules-kernel obligation or explicit non-semantic disposition.

## Worktree Safety Prefix

Every Ralph prompt for this plan must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Source Of Truth

Every task starts by reading:

- `plans/rules-kernel-coverage/README.md`;
- `plans/rules-kernel-coverage/REPORT.md`;
- `plans/rules-kernel-coverage/obligations.jsonl`;
- `plans/rules-kernel-coverage/profile-obligations.jsonl`;
- `plans/unit-profile-coverage/profiles.jsonl`, the canonical profile ledger;
- `plans/unit-profile-coverage/UNIT_REPORT.md`;
- `plans/unit-profile-coverage/unit-matrix.json`;
- the relevant runtime package source and package-local QNT specs;
- `.references/srd-5.2.1/` for any rule semantics being modeled;
- `UBIQUITOUS_LANGUAGE.md`.

## Common Task Contract

Every task outputs one of these concrete states:

- one or more covered semantic obligations with QNT owner, production TS owner,
  and executable parity witness;
- a precise `boundary-only` row for parser/protocol/table behavior outside
  reducer semantics;
- a precise `unsupported-by-admission` row for Surface/catalog pressure rejected
  before reducer execution;
- a smaller follow-up split only when the current task proves that one Ralph
  slice would otherwise mix unrelated reducer procedures.

Every task must preserve these invariants:

- QNT owns reducer semantics before TS behavior changes.
- Focused random MBT is the default witness for reducer sequencing,
  interleavings, holes, reactions, resources, and active-effect lifecycle.
- Deterministic QNT replay is only for fixed projections or tiny closed
  fixtures, and must include `deterministicReplayRationale`.
- `profile-obligations.jsonl` is the only profile-to-obligation join source.
- Surface breadth stays in `plans/unit-profile-coverage`; do not turn catalog
  enumeration into MBT state-space exploration.

Every implementation task runs:

- relevant focused package tests;
- package typecheck for touched packages when dependencies are available;
- `pnpm rules-kernel-coverage:check -- --write`;
- `pnpm rules-kernel-coverage:check`;
- `pnpm unit-profile-coverage:check -- --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence.

Tasks that change coverage checker behavior, generated-report gates, or
merge-acceptance policy also run:

- `pnpm rules-kernel-coverage:check:self-test`;
- `pnpm unit-profile-coverage:check:self-test`.

Do not run battle-runtime MBT for exploratory questions. If an actual
end-to-end MBT run is required after behavior changes, use the repository MBT
scarcity protocol.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. The reviewer
loop must include RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code-review passes. Fix every reasonable finding,
explicitly reject only findings with a concrete reason, and repeat until no
reasonable findings remain.

Reviewers should reject:

- QNT-free reducer behavior changes;
- parity witnesses that do not run the declared QNT spec/action against
  production TS;
- deterministic replay used where random MBT should cover sequencing or
  interleaving;
- profile mappings copied into Unit/profile/obligation rows instead of
  `profile-obligations.jsonl`;
- catalog admission treated as reducer-semantic coverage;
- table geometry, social adjudication, object state, or presentation facts
  silently modeled as core reducer state.

## DAG / Queue Order

| # | Task | Status | Depends On | Closure target |
| ---: | --- | --- | --- | --- |
| 1 | RKBC-BATTLE-HOLE-INVENTORY - Battle Hole And Fill Inventory | ready-for-research | baseline | Inventory every current `BattleHole` and fill kind; classify semantic frontier, deterministic projection, unsupported, or dead branch. |
| 2 | RKBC-BATTLE-HOLE-TARGETS-AREAS - Battle Target And Area Hole Obligations | blocked | Task 1 | Covered obligations for target, target-list, and area-choice hole families. |
| 3 | RKBC-BATTLE-HOLE-MOVEMENT-ROUTE - Battle Movement Route And Spatial Fact Obligations | blocked | Task 1 | Covered/boundary obligations for movement route and table spatial fact holes. |
| 4 | RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION - Battle Damage Disposition And Type Choice Obligations | blocked | Task 1 | Covered obligations for damage disposition and damage-type choice holes. |
| 5 | RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND - Battle Ability Skill And Command Hole Obligations | blocked | Task 1 | Covered/boundary obligations for ability choice, skill choice, and Command option holes. |
| 6 | RKBC-BATTLE-HOLE-REACTION-CONCENTRATION - Battle Reaction And Concentration Hole Obligations | blocked | Task 1 | Covered obligations for reaction decisions, continuation resumption, and Concentration Saving Throw holes not already owned. |
| 7 | RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE - Feature Passive Resource And Persistent Profile Join | ready-for-research | baseline | Map feature passive/resource/persistent profiles to covered obligations or create missing obligations. |
| 8 | RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS - Feature Reaction Bonus Action And Resource Profile Join | ready-for-research | baseline | Map feature reaction, bonus-action, and failed-roll resource profiles to covered obligations or create missing obligations. |
| 9 | RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION - Spell Damage Condition And Scalar Profile Join | ready-for-research | baseline | Map Spell Definition profiles for damage, condition, scalar, and roll modifiers to covered Spell Effect/Invocation obligations or create missing obligations. |
| 10 | RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION - Spell After Hit Reaction And Marked Effect Profile Join | ready-for-research | baseline | Map after-hit, reaction-casting-time Spell Invocation, Readied Spell Response, marked-effect, and chained spell profiles to covered obligations or create missing obligations. |
| 11 | RKBC-PROFILE-JOIN-TABLE-CALLER - Table Caller Profile Join And Boundary Classification | blocked | Tasks 1-3 | Map table-caller profiles to reducer-semantic obligations or boundary rows without MBT state-space explosion. |
| 12 | RKBC-CREATION-CHOICE-DISCOVERY-CARDINALITY - Character Creation Choice Discovery And Cardinality | ready-for-research | baseline | Split current creation choice discovery/cardinality semantics out of the broad creation audit. |
| 13 | RKBC-CREATION-FILL-VALIDATION-BATCH - Character Creation Fill Validation And Atomic Batch | ready-for-research | baseline | Cover fill validation, batch atomicity, rediscovery, and finalization deltas beyond the existing slice. |
| 14 | RKBC-CREATION-ADVANCEMENT-REPLACEMENT - Character Creation Advancement And Replacement | blocked | Tasks 12-13 | Cover advancement replacement semantics and class-feature replacement profiles. |
| 15 | RKBC-CREATION-SPELLCASTING-PROGRESSION - Character Creation Spell Access Progression And Eldritch Invocation Choices | blocked | Tasks 12-13 | Cover Pact Magic progression, Spell Access/progression facts, and Eldritch Invocation choices. |
| 16 | RKBC-CREATION-WEAPON-MASTERY-FEAT - Character Creation Weapon Mastery And Feat Choice | blocked | Tasks 12-13 | Cover Weapon Mastery and feat-choice profiles without duplicating selected Unit behavior. |
| 17 | RKBC-SHEET-HP-REST-HIT-DICE - Character Sheet HP Rest And Hit Dice Transitions | ready-for-research | baseline | Split HP, healing, Short Rest, Long Rest, and Hit Dice semantics into covered obligations. |
| 18 | RKBC-SHEET-SPELL-SLOTS-PACT-SLOTS - Character Sheet Spell Slot And Pact Slot Transitions | blocked | Task 17 | Cover spell-slot and pact-slot spend/recovery transitions while reusing Task 17 rest timing/benefit semantics. |
| 19 | RKBC-SHEET-FEATURE-RESOURCES - Character Sheet Feature Resource Transitions | blocked | Task 17 | Cover Lay On Hands, Arcane Recovery, class feature use counts, and similar sheet-owned resources while reusing Task 17 HP/rest algebra. |
| 20 | RKBC-SHEET-WEAPON-MASTERY-RITUAL - Character Sheet Weapon Mastery And Ritual Projection | ready-for-research | baseline | Cover weapon mastery reselection and spellbook/ritual projection semantics. |
| 21 | RKBC-HANDOFF-BATTLE-INIT - Character Battle Initialization Projection | ready-for-research | baseline | Cover Character Sheet/build projection into battle initialization. |
| 22 | RKBC-HANDOFF-BATTLE-SETTLEMENT - Character Battle Settlement Back To Sheet | blocked | Tasks 17-18, 21 | Cover HP, condition, spell-slot, and resource settlement from battle back to sheet. |
| 23 | RKBC-HANDOFF-IDENTITY-CONFLICTS - Character Battle Identity And Max HP Conflict Handling | blocked | Tasks 17, 21 | Cover identity checks, max-HP conflicts, and zero-HP lifecycle handoff. |
| 24 | RKBC-FINAL-B-CLOSURE-GATE - Final Rules Kernel B Closure Gate | blocked | Tasks 1-23 | Remove merge-acceptable `needs-*` statuses, wire quality gate, and prove reports show B closure. |

## Task Details

### Task 1 - RKBC-BATTLE-HOLE-INVENTORY - Battle Hole And Fill Inventory

Status: `ready-for-research`

Scope: inventory every current `BattleHole` kind and fill kind admitted by the
battle reducer. Classify each as reducer-semantic frontier, deterministic
boundary projection, unsupported/dead branch, or table-owned fact.

Acceptance:

- `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` no longer hides unknown hole
  families behind prose.
- The task records a concrete follow-up split for every semantic hole family
  that still needs QNT/parity work.
- Boundary/table-owned classifications are executable in the rules-kernel
  ledger, not only comments.

### Task 2 - RKBC-BATTLE-HOLE-TARGETS-AREAS - Battle Target And Area Hole Obligations

Status: `blocked`

Depends on: Task 1.

Scope: cover target choice, target list, and area choice hole families. Use
focused random MBT where target ordering, repeated selection, or area
interaction changes legal reducer state.

Acceptance:

- Target/area holes map to covered obligations or explicit boundary rows.
- Any new QNT owner has a production TS parity witness.
- Surface profiles that depend on these holes are joined through
  `profile-obligations.jsonl`.

### Task 3 - RKBC-BATTLE-HOLE-MOVEMENT-ROUTE - Battle Movement Route And Spatial Fact Obligations

Status: `blocked`

Depends on: Task 1.

Scope: cover movement route facts, table-supplied geometry, forced movement
route choices, and distance/position facts currently represented as reducer
holes.

Acceptance:

- Reducer-owned movement spend/state transitions are covered.
- Table-owned spatial derivation remains boundary/table-caller evidence.
- No pathfinding or map engine is introduced as rules-kernel state.

### Task 4 - RKBC-BATTLE-HOLE-DAMAGE-DISPOSITION - Battle Damage Disposition And Type Choice Obligations

Status: `blocked`

Depends on: Task 1.

Scope: cover damage disposition, damage-type choice, resistance/reduction
choice, and save/attack damage branch holes not already owned by existing spell,
feature, or shared HP obligations.

Acceptance:

- Damage hole families are split into stable obligation ids.
- Shared HP damage is reused rather than duplicated.
- Focused random MBT is used for branch interaction; deterministic replay is
  limited to tiny closed fixtures.

### Task 5 - RKBC-BATTLE-HOLE-ABILITY-SKILL-COMMAND - Battle Ability Skill And Command Hole Obligations

Status: `blocked`

Depends on: Task 1.

Scope: cover ability choice, skill choice, and Command-style table option holes.
Preserve table adjudication where RAW leaves route/social outcome to the table.

Acceptance:

- Ability/skill choices that affect reducer legality or state are QNT-owned.
- Command options and RAW-fixed next-turn consequences are covered only when
  they create executable reducer state.
- Command route choice and social adjudication remain boundary/table-caller
  facts unless a specific RAW rule creates executable reducer state.
- No client-only "available option" projection bypasses the rules kernel.

### Task 6 - RKBC-BATTLE-HOLE-REACTION-CONCENTRATION - Battle Reaction And Concentration Hole Obligations

Status: `blocked`

Depends on: Task 1.

Scope: cover reaction-decision, continuation-resume, and Concentration Saving Throw
holes not already captured by `BATTLE.REACTION.OFFER_DECLINE_RESUME`.

Acceptance:

- Existing reaction obligation is reused when it already owns the semantics.
- Any missing Concentration or nested continuation semantics become covered
  obligations.
- Reviewer can see why each reaction hole is covered, boundary-only, or
  unsupported.

### Task 7 - RKBC-PROFILE-JOIN-FEATURE-PASSIVE-RESOURCE - Feature Passive Resource And Persistent Profile Join

Status: `ready-for-research`

Scope: close unmapped Unit feature passive, persistent-effect, and resource
profiles, including speed, attack-count scaling, martial arts projection,
weapon mastery effects, innate sorcery activation, and resource boosts.

Acceptance:

- Every in-scope profile maps to covered obligations or creates an explicit
  missing obligation.
- Existing broad feature profile obligations are split only where they hide
  materially different reducer semantics.
- Unit-profile reports show fewer unmapped feature profiles.

### Task 8 - RKBC-PROFILE-JOIN-FEATURE-REACTION-BONUS - Feature Reaction Bonus Action And Resource Profile Join

Status: `ready-for-research`

Scope: close unmapped bonus-action, reaction, and failed-roll resource profiles,
including Bardic Inspiration grants/uses, failed Ability Check boosts, and
damage-redirection reactions.

Acceptance:

- Reaction-like profiles join both procedure and reaction-continuation
  obligations where both are required.
- Resource-spend/recover semantics have QNT ownership.
- No profile is mapped to a covered obligation that does not actually own its
  timing/resource behavior.

### Task 9 - RKBC-PROFILE-JOIN-SPELL-DAMAGE-CONDITION - Spell Damage Condition And Scalar Profile Join

Status: `ready-for-research`

Scope: close unmapped Spell Definition support profiles for Saving
Throw/Attack Roll damage, direct conditions, repeated Saving Throws, scalar
modifiers, roll modifiers, condition immunity, condition removal, and
make-stable/restoration semantics.

Acceptance:

- Covered Spell Effect or Spell Invocation obligations are split when "spell
  procedure semantics" is too broad to prove the specific profile.
- Deterministic Surface evidence remains separate from reducer-semantic parity.
- Unit/profile reports show each in-scope spell profile as covered or
  mapped-open with a precise new obligation.
- If the profile family is still too large for one Ralph slice, the first
  output is a finer split by reducer invariant, not broad coverage work.

### Task 10 - RKBC-PROFILE-JOIN-SPELL-AFTER-HIT-REACTION - Spell After Hit Reaction And Marked Effect Profile Join

Status: `ready-for-research`

Scope: close after-hit, reaction-casting-time Spell Invocation, Readied Spell
Response, marked-damage, chained-attack, beam-sequence, independent-attack, and
weapon-hosted Spell Definition support profiles.

Acceptance:

- Timing, trigger, resource, and cleanup semantics are not collapsed into one
  vague spell obligation.
- Reaction-casting-time Spell Invocation and Readied Spell Response profiles
  join reaction-continuation obligations where needed.
- Any broad profile that needs random MBT has focused random MBT rather than
  deterministic replay.
- If the profile family is still too large for one Ralph slice, the first
  output is a finer split by reducer invariant, not broad coverage work.

### Task 11 - RKBC-PROFILE-JOIN-TABLE-CALLER - Table Caller Profile Join And Boundary Classification

Status: `blocked`

Depends on: Tasks 1-3.

Scope: close table-caller profiles after the target/area and movement/route
hole classifications are recorded. In-scope examples include target admission,
fog/obscurement, drop held object, route choice, fleeing/approach route,
Dancing Lights movement, and Flaming Sphere movement into another creature's
space.

Acceptance:

- Reducer-owned consequences, including effect state, action economy,
  Saving Throw/damage outcomes, range constraints, and cleanup, are covered.
- Table-owned positions, barriers, object facts, fog/obscurement facts,
  hazard placement, route selection, and social adjudication remain
  boundary/table-caller evidence.
- Task 11 reuses Tasks 1-3 classifications rather than creating a second
  reducer-vs-boundary classification ledger.
- No task expands MBT into `Surface record x table state x battle state`.

### Task 12 - RKBC-CREATION-CHOICE-DISCOVERY-CARDINALITY - Character Creation Choice Discovery And Cardinality

Status: `ready-for-research`

Scope: split current character-creation choice discovery and cardinality
semantics out of `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT`.

Acceptance:

- Choice availability, cardinality, and option legality are QNT-owned.
- Concrete option enumeration remains deterministic Surface/profile evidence.
- Covered obligations replace the broad mapped-open status where possible.

### Task 13 - RKBC-CREATION-FILL-VALIDATION-BATCH - Character Creation Fill Validation And Atomic Batch

Status: `ready-for-research`

Scope: cover fill validation, atomic batch behavior, rediscovery after fills,
and finalization status for current TS-supported creation flows.

Acceptance:

- Existing `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` is reused or split with
  explicit rationale.
- Invalid fill handling is separated into reducer semantics vs boundary/parser
  failures.
- Focused parity witness connects QNT to production fill reducer behavior.

### Task 14 - RKBC-CREATION-ADVANCEMENT-REPLACEMENT - Character Creation Advancement And Replacement

Status: `blocked`

Depends on: Tasks 12-13.

Scope: cover advancement replacement, class-feature replacement, and level-up
choice replacement semantics currently supported by TS.

Acceptance:

- Advancement replacement profiles no longer point only to the broad audit row.
- Durable character facts are not polluted with transient draft/session state.
- New obligations have QNT owner and parity witness.

### Task 15 - RKBC-CREATION-SPELLCASTING-PROGRESSION - Character Creation Spell Access Progression And Eldritch Invocation Choices

Status: `blocked`

Depends on: Tasks 12-13.

Scope: cover Pact Magic progression, Spell Access/progression facts, and
Eldritch Invocation choices that current TS supports.

Acceptance:

- Pact Magic and invocation profiles have covered obligations.
- Spell Access and Eldritch Invocation terms match `UBIQUITOUS_LANGUAGE.md`;
  Spell Invocation is used only for concrete runtime cast attempts.
- No selected spell behavior is duplicated in the class progression owner.

### Task 16 - RKBC-CREATION-WEAPON-MASTERY-FEAT - Character Creation Weapon Mastery And Feat Choice

Status: `blocked`

Depends on: Tasks 12-13.

Scope: cover weapon mastery choices and class-feature feat choices as
character-creation reducer semantics.

Acceptance:

- Weapon Mastery and feat-choice profiles map to covered obligations.
- Selected feat/mastery Unit behavior remains owned by its runtime profile.
- Surface admission evidence is linked but not treated as semantic coverage by
  itself.

### Task 17 - RKBC-SHEET-HP-REST-HIT-DICE - Character Sheet HP Rest And Hit Dice Transitions

Status: `ready-for-research`

Scope: split HP lifecycle, healing, Short Rest, Long Rest, and Hit Dice
transitions out of `SHEET.REST_AND_RESOURCE.TRANSITIONS`.

Acceptance:

- Sheet-owned HP/rest/Hit Dice mutations have QNT owners and parity witnesses.
- Task 17 owns shared HP damage/healing and rest eligibility/benefit algebra;
  downstream slot and feature-resource tasks reuse it rather than duplicating
  rest procedure logic.
- Long Rest coverage explicitly handles the start gate, 16-hour wait,
  interruption handling, all spent Hit Point Dice restored, and max-HP
  reduction reset.
- Short Rest coverage explicitly handles the Hit Point Dice spend loop and
  interrupted Short Rest no-benefit outcome.
- Rest-triggered and calendar-time-triggered semantics stay separated.

### Task 18 - RKBC-SHEET-SPELL-SLOTS-PACT-SLOTS - Character Sheet Spell Slot And Pact Slot Transitions

Status: `blocked`

Depends on: Task 17.

Scope: cover spell-slot and pact-slot spend/recover transitions, including Long
Rest, Short Rest, and class-feature recovery hooks currently supported by TS.
Reuse Task 17 for rest eligibility/benefit timing; this task owns slot capacity,
current slot state, and slot-specific spend/recovery.

Acceptance:

- Slot capacity facts are distinguished from current slot state.
- Pact Slot and normal Spell Slot semantics are not conflated.
- Rest-triggered slot recovery consumes Task 17 rest outcomes rather than
  re-modeling rest procedure logic.
- Covered obligations connect QNT to production sheet runtime behavior.

### Task 19 - RKBC-SHEET-FEATURE-RESOURCES - Character Sheet Feature Resource Transitions

Status: `blocked`

Depends on: Task 17.

Scope: cover Lay On Hands, Arcane Recovery, class feature use-count resources,
healing-resource actions, and related sheet-owned resources. Reuse Task 17 for
HP mutation and rest eligibility/benefit timing; this task owns feature-resource
spend, recovery, and reset semantics.

Acceptance:

- Each resource has explicit spend/recover/reset ownership.
- Durable sheet facts and current session resources remain separate.
- Healing-resource actions call through the shared HP mutation owner instead of
  duplicating HP algebra.
- Surface/profile rows map through covered obligations.

### Task 20 - RKBC-SHEET-WEAPON-MASTERY-RITUAL - Character Sheet Weapon Mastery And Ritual Projection

Status: `ready-for-research`

Scope: cover weapon mastery reselection and spellbook/ritual projection
semantics currently supported by the sheet runtime.

Acceptance:

- Reselection, Ritual, and Spell Access projection profiles map to covered
  obligations.
- Creation-time choice state is not duplicated in durable sheet state.
- Deterministic replay is used only for fixed projection fixtures.

### Task 21 - RKBC-HANDOFF-BATTLE-INIT - Character Battle Initialization Projection

Status: `ready-for-research`

Scope: cover projection from character build/sheet facts into battle
initialization, including identity, HP, AC, conditions, spellcasting facts, and
supported runtime profiles.

Acceptance:

- Handoff inputs are parsed or typed at the boundary before reducer use.
- Battle init facts do not duplicate durable sheet facts unless the projection
  boundary makes the duplication executable.
- Covered obligations connect QNT to production handoff behavior.

### Task 22 - RKBC-HANDOFF-BATTLE-SETTLEMENT - Character Battle Settlement Back To Sheet

Status: `blocked`

Depends on: Tasks 17-18 and 21.

Scope: cover settlement from battle state back to Character Sheet state for HP,
conditions, spell slots, pact slots, and feature resources.

Acceptance:

- Settlement order and conflict handling are explicit.
- Runtime encounter state is not stored as durable character creation output.
- Covered obligations and witnesses prove current TS-supported settlement.

### Task 23 - RKBC-HANDOFF-IDENTITY-CONFLICTS - Character Battle Identity And Max HP Conflict Handling

Status: `blocked`

Depends on: Tasks 17 and 21.

Scope: cover identity checks, stale combatant/session conflict handling, max HP
changes, and zero-HP lifecycle edges across sheet/battle handoff.

Acceptance:

- Ordinary user/session conflicts are represented as typed results where
  runtime callers can recover.
- Reducer-semantic conflicts have QNT ownership; protocol-only failures are
  boundary-only.
- Max HP and current HP semantics remain distinguishable.

### Task 24 - RKBC-FINAL-B-CLOSURE-GATE - Final Rules Kernel B Closure Gate

Status: `blocked`

Depends on: Tasks 1-23.

Scope: close the B lane mechanically after every transitional obligation is
resolved.

Acceptance:

- `plans/rules-kernel-coverage/REPORT.md` shows zero open transitional
  obligations.
- `rules-kernel-coverage:check` rejects merge-acceptable `needs-*` statuses for
  new reducer semantics.
- Root/package quality docs state that new reducer semantics require covered
  rules-kernel obligations or explicit non-semantic dispositions.
- `pnpm rules-kernel-coverage:check`, `pnpm unit-profile-coverage:check`, and
  `git diff --check` pass after generated artifacts are refreshed.
- `pnpm rules-kernel-coverage:check:self-test` and
  `pnpm unit-profile-coverage:check:self-test` pass after checker/gate changes.

## Verification

Every task must include:

- RAW/ubiquitous-language check before modeling any rule behavior, with local
  SRD source references from `.references/srd-5.2.1/`;
- reviewer-loop convergence across RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code review;
- generated coverage report refresh and consistency checks;
- checker self-tests when checker behavior, generated-report gates, or
  merge-acceptance policy changes;
- explicit rejection rationale for any reviewer finding that is not fixed.
