# Ralph L1-5 Reducer-Route QNT Architecture

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L15-RR01-DENOMINATOR-AND-CLASSIFIER",
      "status": "done",
      "title": "Define the level 1-5 reducer-route denominator and route classes"
    },
    {
      "number": 2,
      "id": "L15-RR02-ROUTE-VOCABULARY-AND-GATES",
      "status": "done",
      "title": "Generalize executable route vocabulary and checker gates"
    },
    {
      "number": 3,
      "id": "L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE",
      "status": "done",
      "title": "Route the remaining current reducer-spine diagnostic drivers"
    },
    {
      "number": 4,
      "id": "L15-RR04-RULE-CORE-COMPONENT-CONNECTORS",
      "status": "done",
      "title": "Add component-first QNT connectors for rule-core drivers"
    },
    {
      "number": 5,
      "id": "L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES",
      "status": "done",
      "title": "Route action, attack, weapon, and stat-block battle subjects"
    },
    {
      "number": 6,
      "id": "L15-RR06-BATTLE-SPELL-EFFECT-ROUTES",
      "status": "done",
      "title": "Route spell, condition, effect, and restoration battle subjects"
    },
    {
      "number": 7,
      "id": "L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES",
      "status": "done",
      "title": "Route feature, species, metamagic, and mastery battle substrates"
    },
    {
      "number": 8,
      "id": "L15-RR08-CHARACTER-CREATION-ROUTES",
      "status": "done",
      "title": "Add QNT route connectors for character creation drivers"
    },
    {
      "number": 9,
      "id": "L15-RR09-CHARACTER-SHEET-ROUTES",
      "status": "done",
      "title": "Add QNT route connectors for character sheet drivers"
    },
    {
      "number": 10,
      "id": "L15-RR10-CHARACTER-BATTLE-HANDOFF-ROUTES",
      "status": "done",
      "title": "Add QNT route connectors for character-battle handoff drivers"
    },
    {
      "number": 11,
      "id": "L15-RR11-LEVEL3-4-SCOPE-PROMOTION",
      "status": "done",
      "title": "Promote level 3-4 branch scope into route connector tasks"
    },
    {
      "number": 12,
      "id": "L15-RR12-LEVEL5-SCOPE-PROMOTION",
      "status": "blocked",
      "title": "Promote level 5 class and spell-level-3 route connector tasks"
    },
    {
      "number": 13,
      "id": "L15-RR13-DIRTY-CLEANROOM-REHEARSAL",
      "status": "blocked",
      "title": "Run the level 1-5 route architecture on the dirty cleanroom"
    },
    {
      "number": 14,
      "id": "L15-RR14-FRESH-CLEANROOM-PACKAGE-GATE",
      "status": "blocked",
      "title": "Package a fresh cleanroom-ready level 1-5 route evidence gate"
    },
    {
      "number": 15,
      "id": "L15-RR15-AFTER-HIT-RIDER-OWNER-SPLIT",
      "status": "ready-for-research",
      "title": "Split after-hit rider routes by durable battle owner"
    },
    {
      "number": 16,
      "id": "L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES",
      "status": "ready-for-research",
      "title": "Route chained attack sequences through procedure owners"
    },
    {
      "number": 17,
      "id": "L15-RR17-WEAPON-HOSTED-RIDER-ROUTES",
      "status": "ready-for-research",
      "title": "Split weapon-hosted attack and rider routes"
    },
    {
      "number": 18,
      "id": "L15-RR18-BATTLE-ACTIVE-EFFECT-LIFECYCLE-ROUTES",
      "status": "ready-for-research",
      "title": "Route remaining active spell-effect lifecycle drivers"
    },
    {
      "number": 19,
      "id": "L15-RR19-BATTLE-REACTION-INTERRUPT-ROUTES",
      "status": "ready-for-research",
      "title": "Route reaction spell and interrupt-stack resume drivers"
    },
    {
      "number": 20,
      "id": "L15-RR20-BATTLE-COMPANION-OBJECT-BOUNDARY-ROUTES",
      "status": "ready-for-research",
      "title": "Route companion lifecycle and object-target boundary drivers"
    },
    {
      "number": 21,
      "id": "L15-RR21-BATTLE-ABILITY-SEARCH-CHOICE-ROUTES",
      "status": "ready-for-research",
      "title": "Route ability-check, Search, and choice spell-effect drivers"
    },
    {
      "number": 22,
      "id": "L15-RR22-BATTLE-INDEPENDENT-SPELL-ATTACK-SEQUENCE-ROUTES",
      "status": "blocked",
      "title": "Route independent multi-beam spell attack sequence drivers"
    },
    {
      "number": 23,
      "id": "L15-RR07-FU01-LEVEL1-SPELL-IDENTITY-SUBSTRATES",
      "status": "ready-for-research",
      "title": "Split level-1 selected spell identity bundles into generic substrates"
    },
    {
      "number": 24,
      "id": "L15-RR07-FU02-SPECIES-PASSIVE-TRAIT-SUBSTRATES",
      "status": "ready-for-research",
      "title": "Route species passive trait battle substrates"
    },
    {
      "number": 25,
      "id": "L15-RR07-FU03-CONDITION-AND-ROLL-MODIFIER-FEATURE-SUBSTRATES",
      "status": "ready-for-research",
      "title": "Route condition and d20 roll modifier feature substrates"
    },
    {
      "number": 26,
      "id": "L15-RR07-FU04-ZERO-HP-STABILIZATION-SUBSTRATE",
      "status": "ready-for-research",
      "title": "Route zero-Hit-Point stabilization substrates"
    },
    {
      "number": 27,
      "id": "L15-RR07-FU05-FEATURE-MOVEMENT-AND-FORM-SUBSTRATES",
      "status": "ready-for-research",
      "title": "Route feature movement and form lifecycle substrates"
    },
    {
      "number": 28,
      "id": "L15-RR07-FU06-WEAPON-MASTERY-PROPERTY-SUBSTRATES",
      "status": "ready-for-research",
      "title": "Route weapon mastery property substrates"
    },
    {
      "number": 29,
      "id": "L15-RR07-FU07-DRAGONBORN-BREATH-WEAPON-SUBSTRATE",
      "status": "ready-for-research",
      "title": "Route attack-action area save damage replacement feature substrate"
    },
    {
      "number": 30,
      "id": "L15-RR07-FU08-METAMAGIC-GOVERNOR-AND-OPTION-SUBSTRATES",
      "status": "ready-for-research",
      "title": "Route metamagic governor and option substrates"
    },
    {
      "number": 31,
      "id": "L15-RR07-FU09-INNATE-SPELL-BENEFIT-FEATURE-SUBSTRATE",
      "status": "ready-for-research",
      "title": "Route active feature spell benefit substrates"
    }
  ]
}
-->

## Scope

This Ralph lane extends the reducer-route QNT architecture introduced by source
commit `665a9b4ad3cc11c8c16f92126b2a2567355cbcc9` from the first three focused
battle drivers to the remaining level-1 through level-5 cleanroom surface.

The architecture is:

- source QNT owns the route contract;
- each routed driver has an executable `*.route.mbt.qnt` connector or an
  explicitly classified component connector;
- TS MBT proves source parity for the connector;
- cleanroom target replay must match the copied connector route, not just the
  non-route projection;
- selected identity waits behind generic runtime substrate;
- production reducers route by runtime shape, typed facts, capabilities,
  procedure state, and durable state, not fixture names or authored identity.

For this plan, "level 1-5" means character levels 1 through 5, including
cantrips, spell level 1, spell level 2, and spell level 3 pressure reachable by
level-5 full casters. It does not mean spell level 4 or spell level 5. Task 1
must verify this denominator against local source artifacts before later tasks
implement connectors.

## Current Baseline

Current source-side cleanroom branch coverage:

- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- 97 current driver files.
- 646 current in-scope branch obligations.
- 53 current out-of-scope branch obligations.
- 24 sampled inputs.

Current in-scope driver families:

| Family                           | Current driver files |
| -------------------------------- | -------------------: |
| Battle focused drivers           |                   34 |
| Battle rule-core drivers         |                    9 |
| Battle selected-identity drivers |                   31 |
| Character-battle handoff drivers |                    5 |
| Character creation drivers       |                    8 |
| Character sheet drivers          |                   10 |

Already handled by the reducer-route architecture:

- `battle-runtime-reducer-spine-contract.mbt.qnt` is the baseline composition
  witness.
- `battle-runtime-magic-missile.route.mbt.qnt`
- `battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `battle-runtime-hit-point-restoration-ordering.route.mbt.qnt`

That leaves 93 current non-baseline driver files without a route/component
connector after subtracting the three routed focused drivers and the baseline.
Task 1 must recompute this number after any branch-scope or driver changes.

## Source Artifacts

- `plans/cleanroom-branch-coverage/branch-scope.jsonl`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/README.md`
- `plans/cleanroom-guidance/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/RALPH_L5_LANE_A_CLASS_FEATURES.md`
- `plans/RALPH_L5_LANE_B_SPELL3_AUTHORED_CLOSURE.md`
- `plans/RALPH_L5_LANE_C_SPELL3_MISSING_AUTHORED_1.md`
- `plans/RALPH_L5_LANE_D_SPELL3_MISSING_AUTHORED_2.md`
- `packages/battle-runtime/*.mbt.qnt`
- `packages/battle-runtime/*.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts`
- `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-creation-runtime/character-creation-reducer-route.qnt`
- `packages/character-sheet-runtime/character-sheet-reducer-route.qnt`
- `packages/character-battle-runtime/character-battle-reducer-route.qnt`
- `packages/character-creation-runtime/*.mbt.qnt`
- `packages/character-sheet-runtime/*.mbt.qnt`
- `packages/character-battle-runtime/*.mbt.qnt`
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- Do not browse external rules sources.
- Do not infer target behavior from TypeScript source when evaluating cleanroom
  target work. Source-side QNT/RAW/domain guidance may be edited first, then
  synced to cleanroom input.
- Do not add whole-battle QNT or one monolithic route connector.
- Add at most one small subject family, component family, or reducer substrate
  per task unless Task 1 explicitly splits a smaller follow-up.
- Do not use authored ids, names, slugs, page refs, or fixture identity as
  production dispatch keys.
- Route selected-identity drivers by extracting generic support-profile,
  procedure, capability, and state facts. If the generic substrate is missing,
  add or schedule the substrate before routing the selected-identity replay.
- Every new durable cleanroom field needs a state-owner record tied to QNT, RAW,
  domain guidance, or an explicit blocker.
- For source-side connector changes, run focused MBT only after implementation,
  one MBT process at a time, following `AGENTS.md`.

## Route Classes

The route classes are deliberately not all `reducer-routed`:

| Route class                 | Meaning                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `reducer-routed`            | Driver has a copied `*.route.mbt.qnt` connector and target replay must match `qRoute` through the reducer surface.                     |
| `component-first`           | Rule-core or reusable pure component must be implemented and tested through its own component API before a battle subject consumes it. |
| `substrate-first`           | A durable state owner or generic runtime shape must exist before replay evidence is meaningful.                                        |
| `catalog-after-substrate`   | Selected identity waits for generic substrate; catalog identity may appear only at selection/admission boundaries.                     |
| `replay-refresh-only`       | Existing route/substrate is sufficient; regenerate evidence without production behavior changes.                                       |
| `source-qnt-corpus-blocker` | Copied QNT/RAW/domain guidance is insufficient; fix source QNT/guidance before cleanroom evidence counts.                              |

## DAG / Queue Order

|   # | Task                                                                                                          | Status             | Depends on                                                                                                                                               | Notes                                                                                         |
| --: | ------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
|   1 | L15-RR01-DENOMINATOR-AND-CLASSIFIER - Define the level 1-5 reducer-route denominator and route classes        | done               | none                                                                                                                                                     | Established the exact driver/branch denominator in `reducer-route-inventory.json`.            |
|   2 | L15-RR02-ROUTE-VOCABULARY-AND-GATES - Generalize executable route vocabulary and checker gates                | done               | L15-RR01-DENOMINATOR-AND-CLASSIFIER                                                                                                                      | Added source-side route vocabularies and connector gates before broad connector work.         |
|   3 | L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE - Route the remaining current reducer-spine diagnostic drivers       | done               | L15-RR02-ROUTE-VOCABULARY-AND-GATES                                                                                                                      | Completed death-save and Concentration route connectors from the diagnostic queue.            |
|   4 | L15-RR04-RULE-CORE-COMPONENT-CONNECTORS - Add component-first QNT connectors for rule-core drivers            | done               | L15-RR02-ROUTE-VOCABULARY-AND-GATES                                                                                                                      | Keeps reusable components out of battle-local replay islands.                                 |
|   5 | L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES - Route action, attack, weapon, and stat-block battle subjects | done               | L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE; L15-RR04-RULE-CORE-COMPONENT-CONNECTORS                                                                        | Routes generic attack/stat-block families; rider bundles split to Tasks 15-17.               |
|   6 | L15-RR06-BATTLE-SPELL-EFFECT-ROUTES - Route spell, condition, effect, and restoration battle subjects         | done               | L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE; L15-RR04-RULE-CORE-COMPONENT-CONNECTORS                                                                        | Extends routed spell/effect subjects without selected-identity dispatch.                      |
|   7 | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES - Route feature, species, metamagic, and mastery battle substrates   | done               | L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES; L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                      | Routed bonus-action Unit feature Dash with Temporary Hit Points; split remaining missing substrate families to follow-up tasks. |
|   8 | L15-RR08-CHARACTER-CREATION-ROUTES - Add QNT route connectors for character creation drivers                  | done               | L15-RR02-ROUTE-VOCABULARY-AND-GATES                                                                                                                      | Adds route shape for Draft/Fill/finalization rather than battle subjects.                     |
|   9 | L15-RR09-CHARACTER-SHEET-ROUTES - Add QNT route connectors for character sheet drivers                        | done               | L15-RR02-ROUTE-VOCABULARY-AND-GATES                                                                                                                      | Adds route shape for sheet resource/rest/projection state.                                    |
|  10 | L15-RR10-CHARACTER-BATTLE-HANDOFF-ROUTES - Add QNT route connectors for character-battle handoff drivers      | done               | L15-RR08-CHARACTER-CREATION-ROUTES; L15-RR09-CHARACTER-SHEET-ROUTES; L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE                                            | Handoff routes use existing sheet, build projection, battle runtime, resource projection, and settlement owners. |
|  11 | L15-RR11-LEVEL3-4-SCOPE-PROMOTION - Promote level 3-4 branch scope into route connector tasks                 | done | L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES; L15-RR06-BATTLE-SPELL-EFFECT-ROUTES; L15-RR08-CHARACTER-CREATION-ROUTES; L15-RR09-CHARACTER-SHEET-ROUTES | Widen current level-1/2 branch-scope rows only after generic route shapes exist.              |
|  12 | L15-RR12-LEVEL5-SCOPE-PROMOTION - Promote level 5 class and spell-level-3 route connector tasks               | blocked            | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES; L15-RR10-CHARACTER-BATTLE-HANDOFF-ROUTES; L15-RR11-LEVEL3-4-SCOPE-PROMOTION                                    | Handles level-5 features and spell-level-3 pressure; does not promote spell level 4/5.        |
|  13 | L15-RR13-DIRTY-CLEANROOM-REHEARSAL - Run the level 1-5 route architecture on the dirty cleanroom              | blocked            | L15-RR12-LEVEL5-SCOPE-PROMOTION; L15-RR15-AFTER-HIT-RIDER-OWNER-SPLIT; L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES; L15-RR17-WEAPON-HOSTED-RIDER-ROUTES; L15-RR18-BATTLE-ACTIVE-EFFECT-LIFECYCLE-ROUTES; L15-RR19-BATTLE-REACTION-INTERRUPT-ROUTES; L15-RR20-BATTLE-COMPANION-OBJECT-BOUNDARY-ROUTES; L15-RR21-BATTLE-ABILITY-SEARCH-CHOICE-ROUTES; L15-RR22-BATTLE-INDEPENDENT-SPELL-ATTACK-SEQUENCE-ROUTES | Uses the existing dirty cleanroom as a diagnostic target with current source package.         |
|  14 | L15-RR14-FRESH-CLEANROOM-PACKAGE-GATE - Package a fresh cleanroom-ready level 1-5 route evidence gate         | blocked            | L15-RR13-DIRTY-CLEANROOM-REHEARSAL                                                                                                                       | Produces the fresh-run package and acceptance gate; does not depend on stale dirty artifacts. |
|  15 | L15-RR15-AFTER-HIT-RIDER-OWNER-SPLIT - Split after-hit rider routes by durable battle owner                   | ready-for-research | L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES; L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                      | Prevents one route connector from accumulating interrupt, condition, Concentration, and HP owners. |
|  16 | L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES - Route chained attack sequences through procedure owners            | ready-for-research | L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES; L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                      | Requires the generic multi-step spell/attack procedure route owner before routing chain continuation. |
|  17 | L15-RR17-WEAPON-HOSTED-RIDER-ROUTES - Split weapon-hosted attack and rider routes                             | ready-for-research | L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES; L15-RR06-BATTLE-SPELL-EFFECT-ROUTES; L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                            | Splits hosted attacks, damage riders, active effects, item-target effects, and cleanup owners. |
|  18 | L15-RR18-BATTLE-ACTIVE-EFFECT-LIFECYCLE-ROUTES - Route remaining active spell-effect lifecycle drivers        | ready-for-research | L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                                                                      | Keeps ongoing spell effects, turn-boundary effects, Concentration, HP, and condition owners split. |
|  19 | L15-RR19-BATTLE-REACTION-INTERRUPT-ROUTES - Route reaction spell and interrupt-stack resume drivers           | ready-for-research | L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                                                                      | Routes reaction spending, interrupt-stack continuation, and spell-cast resume without replay islands. |
|  20 | L15-RR20-BATTLE-COMPANION-OBJECT-BOUNDARY-ROUTES - Route companion lifecycle and object-target boundary drivers | ready-for-research | L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                                                                    | Keeps companion state in battle owners and table-owned object facts as boundary fills.        |
|  21 | L15-RR21-BATTLE-ABILITY-SEARCH-CHOICE-ROUTES - Route ability-check, Search, and choice spell-effect drivers   | ready-for-research | L15-RR06-BATTLE-SPELL-EFFECT-ROUTES                                                                                                                      | Routes Search, skill, and ability-choice holes through reducer subjects and table-supplied facts. |
|  22 | L15-RR22-BATTLE-INDEPENDENT-SPELL-ATTACK-SEQUENCE-ROUTES - Route independent multi-beam spell attack sequence drivers | blocked     | L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES                                                                                                                 | Reuses the generic multi-step spell/attack procedure owner before routing independent beam sequences. |
|  23 | L15-RR07-FU01-LEVEL1-SPELL-IDENTITY-SUBSTRATES - Split level-1 selected spell identity bundles into generic substrates | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Fixes source QNT/guidance before grouped level-1 selected spell identity replay counts.       |
|  24 | L15-RR07-FU02-SPECIES-PASSIVE-TRAIT-SUBSTRATES - Route species passive trait battle substrates                | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Splits passive trait damage, save, movement, and size/speed owners.                           |
|  25 | L15-RR07-FU03-CONDITION-AND-ROLL-MODIFIER-FEATURE-SUBSTRATES - Route condition and d20 roll modifier feature substrates | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                         | Routes feature-hosted roll modes and condition suppression without feature identity dispatch.  |
|  26 | L15-RR07-FU04-ZERO-HP-STABILIZATION-SUBSTRATE - Route zero-Hit-Point stabilization substrates                 | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Routes stabilization through the BattleState zero-Hit-Point lifecycle owner.                  |
|  27 | L15-RR07-FU05-FEATURE-MOVEMENT-AND-FORM-SUBSTRATES - Route feature movement and form lifecycle substrates     | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Splits movement-resource, active-form, speed, forced movement, and teleport owners.            |
|  28 | L15-RR07-FU06-WEAPON-MASTERY-PROPERTY-SUBSTRATES - Route weapon mastery property substrates                   | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Routes mastery properties by property facts, attack/save holes, and durable rider owners.      |
|  29 | L15-RR07-FU07-DRAGONBORN-BREATH-WEAPON-SUBSTRATE - Route attack-action area save damage replacement feature substrate | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                         | Adds area save damage replacement route owners before selected species replay counts.          |
|  30 | L15-RR07-FU08-METAMAGIC-GOVERNOR-AND-OPTION-SUBSTRATES - Route metamagic governor and option substrates       | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Routes metamagic by typed option facts, Sorcery Point spend, and spell procedure owners.       |
|  31 | L15-RR07-FU09-INNATE-SPELL-BENEFIT-FEATURE-SUBSTRATE - Route active feature spell benefit substrates          | ready-for-research | L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES                                                                                                                 | Routes active feature spell-save and spell-attack benefits by typed active-effect facts.       |

## Shared Verification

- RAW and ubiquitous-language check: before modeling a rule, read the relevant
  local SRD passage and `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm cleanroom-sync:check`
- `pnpm cleanroom-scaffold:check`
- `pnpm cleanroom-harness:check`
- Focused package typecheck for any touched package.
- Focused MBT for touched route connectors after code changes are complete.
- `git diff --check`

## Task Details

### Task 1 - L15-RR01-DENOMINATOR-AND-CLASSIFIER

Status: `done`

Depends on:

- none

Current facts to verify:

- Current branch inventory has 97 driver files, 646 in-scope branch
  obligations, 53 out-of-scope branch obligations, and 24 sampled inputs.
- Current in-scope driver-family counts are 34 battle focused, 9 battle
  rule-core, 31 battle selected-identity, 5 character-battle, 8 character
  creation, and 10 character sheet.
- Baseline plus three focused drivers have route architecture evidence:
  reducer-spine contract, Magic Missile, save-gated spell ordering, and Hit
  Point restoration ordering.
- The current non-baseline remainder is 93 driver files before level-3/4/5
  branch promotion.

Output:

- Define the level-1 through level-5 cleanroom denominator in one source-side
  artifact. Prefer extending
  `plans/cleanroom-branch-coverage/reducer-route-inventory.json` or adding a
  sibling machine-readable file consumed by the checker, rather than burying
  the denominator only in prose.
- Reclassify current out-of-scope branch decisions that become in-scope for
  character levels 3, 4, and 5:
  - spell-level-2 branches such as Enhance Ability, Blindness/Deafness, Hold
    Person, Shining Smite, and second-level slot recovery;
  - level-3 subclass/class feature branches such as Frenzy, Cutting Words,
    Improved Critical, Deflect Attacks, Evocation Savant, subclass spell
    grants, and Warlock invocation replacement;
  - spell-level-3 branches such as Counterspell, Hypnotic Pattern, Mass Healing
    Word, and any installed level-5 spell-access pressure;
  - level-5 class feature branches such as Barbarian Fast Movement, Rogue
    Uncanny Dodge, Warlock prerequisite-retained invocation replacement, and
    Font of Magic / Metamagic bridge branches reachable by the level-5 support
    claim.
- Keep level 6, level 7, epic boon, spell-level-4, and spell-level-5 branches
  explicitly out of scope unless the owner changes this plan's denominator.
- Classify every in-denominator driver as `reducer-routed`,
  `component-first`, `substrate-first`, `catalog-after-substrate`,
  `replay-refresh-only`, or `source-qnt-corpus-blocker`.
- Update this Ralph plan's task details if the denominator changes task count,
  ordering, or scope.

Acceptance:

- The denominator artifact can answer "how many drivers remain" without manual
  grep.
- Every selected level-1 through level-5 branch has a route class and a
  derivability note: QNT facts, RAW/domain facts, and blockers.
- Branches beyond character level 5 remain out of scope with explicit reasons.
- `pnpm cleanroom-branch-coverage:check` passes.

Verification:

- Shared verification.
- `pnpm cleanroom-branch-coverage:check -- --write`
- `pnpm cleanroom-branch-coverage:check`

Plan Impact:

- Applied. `plans/cleanroom-branch-coverage/reducer-route-inventory.json` now
  contains `level-1-5-cleanroom-route-v1`, with 97 current driver assignments,
  53 current out-of-scope branch decisions classified, 44 branch decisions in
  the level-1 through level-5 denominator, 8 branch decisions outside it, and 1
  source-QNT corpus blocker.
- Task 2 is unblocked for research.

### Task 2 - L15-RR02-ROUTE-VOCABULARY-AND-GATES

Status: `done`

Depends on:

- L15-RR01-DENOMINATOR-AND-CLASSIFIER

Output:

- Extend route vocabulary only as far as Task 1's denominator requires.
- Keep `battle-runtime-reducer-route.qnt` generic: subject family, fill family,
  hole family, owner group, and reducer entrypoint events.
- Add sibling route vocabularies only where the reducer surface is not battle:
  character creation, character sheet, and character-battle handoff.
- Strengthen `scripts/check-reducer-route-connectors.cjs` or add sibling
  checkers so a route-class row cannot claim `reducer-routed` without a copied
  connector that imports the route vocabulary and exposes `qRoute`.
- Update cleanroom guidance so target agents know that route connectors are the
  authority and route inventories only select/order tasks.

Acceptance:

- New route vocabulary is shape/domain based and contains no authored ids,
  names, slugs, page refs, or fixture dispatch names.
- The checker fails if a route inventory row points at a missing connector.
- The checker fails if a connector does not expose route evidence.
- Existing three route connector MBT tests still pass.

Verification:

- Shared verification.
- `pnpm check:reducer-route-connectors`
- `pnpm --filter @dnd/battle-runtime test:mbt:reducer-route-connectors`

Plan Impact:

- Applied. The checker did not expose a planned route class that needs a new
  component/substrate split before Task 3, Task 4, Task 8, or Task 9.

### Task 3 - L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE

Status: `done`

Depends on:

- L15-RR02-ROUTE-VOCABULARY-AND-GATES

Drivers:

- `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`

Output:

- Add route connectors for Death Saving Throw and Concentration teardown.
- Identify or add the minimal durable battle owners before target replay:
  Death Saving Throw counters, Stable, Unconscious, Dead, concentrating source,
  active Spell Effect instances, and teardown state.
- Add TS MBT route tests for the connectors.
- Update `reducer-route-inventory.json` rows from `substrate-first` to
  `reducer-routed` only when the connector and owner record exist.

Acceptance:

- Death Saving Throw replay routes through turn advancement or subject
  resolution using battle-owned HP/death lifecycle state.
- Concentration teardown replay routes through one durable Concentration owner
  for failed damage save, voluntary end, and replacement Concentration.
- No adapter-local death-save or Concentration ledger is introduced.

Verification:

- Shared verification.
- Focused MBT for these two original drivers.
- Focused MBT for their route connector tests.

Plan Impact:

- Applied. Death Saving Throw and Concentration teardown now have copied route
  connectors, TS route MBT coverage, and `reducer-routed` inventory rows tied
  to BattleState HP/death lifecycle and Concentration owners.
- No follow-up task was added because the required generic HP, condition, and
  active-effect substrates were already present in the battle runtime owner
  model.

### Task 4 - L15-RR04-RULE-CORE-COMPONENT-CONNECTORS

Status: `done`

Depends on:

- L15-RR02-ROUTE-VOCABULARY-AND-GATES

Drivers:

- `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- `packages/battle-runtime/rule-core-features.mbt.qnt`
- `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- `packages/battle-runtime/rule-core-movement.mbt.qnt`
- `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- `packages/battle-runtime/rule-core-spells.mbt.qnt`
- `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`

Output:

- Add component connector QNT for rule-core drivers instead of forcing them
  through `BattleState`.
- Define shared component API route events where needed: parse/admit input,
  call reusable reducer/function, project result.
- Ensure battle route connectors consume the same rule-core components instead
  of reimplementing rule-core logic.

Acceptance:

- Component-first drivers prove target code calls a shared component surface,
  not a driver-local replay helper.
- The route inventory records component owners and which later battle routes
  depend on them.
- No rule-core connector imports a broad battle runtime closure unless Task 1
  proves the computed oracle is unavoidable.

Verification:

- Shared verification.
- Focused tests for rule-core MBT drivers changed by this task.
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Split any rule-core connector that mixes unrelated domains into a smaller
  component task.

### Task 5 - L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES

Status: `done`

Depends on:

- L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE
- L15-RR04-RULE-CORE-COMPONENT-CONNECTORS

Candidate drivers:

- `battle-runtime-weapon-attack-ordering.mbt.qnt`
- `battle-runtime-weapon-attack-skeleton.mbt.qnt`
- `battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`
- `battle-runtime-spell-attack-ordering.mbt.qnt`
- `battle-runtime-chained-attack-sequence.mbt.qnt`
- `battle-runtime-after-hit-damage-riders.mbt.qnt`
- `battle-runtime-stat-block-action-ordering.mbt.qnt`
- `battle-runtime-stat-block-multi-damage.mbt.qnt`
- `battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`
- `creature-attack.mbt.qnt`

Output:

- Add route connectors for attack and stat-block subject families in small
  batches.
- Route by attack/subject/profile shape, not creature or weapon identity.
- Use rule-core attack, damage, and stat-block component connectors from Task 4.

Acceptance:

- Weapon, spell-attack, creature, and stat-block routes share battle-owned
  action economy, target, attack-roll, damage-roll, and HP lifecycle state.
- Stat-block action routes use profile/action shape and current combatant facts,
  not named stat-block identities.
- After-hit riders are split if one connector would become a whole-battle
  accumulator.

Verification:

- Shared verification.
- Focused MBT for each touched original driver and route connector.

Plan Impact:

- Split attack-hit rider families into follow-up Tasks 15-17 when they require
  independent durable owners.

### Task 6 - L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Status: `done`

Depends on:

- L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE
- L15-RR04-RULE-CORE-COMPONENT-CONNECTORS

Candidate drivers:

- `battle-runtime-ability-check-choice-search.mbt.qnt`
- `battle-runtime-command-option-next-turn.mbt.qnt`
- `battle-runtime-command-ordering.mbt.qnt`
- `battle-runtime-eldritch-blast.mbt.qnt`
- `battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
- `battle-runtime-interrupt-stack-resume.mbt.qnt`
- `battle-runtime-reaction-casting-time.mbt.qnt`
- `battle-runtime-roll-modifier-active-effects.mbt.qnt`
- `battle-runtime-save-gated-spell-ordering.mbt.qnt`
- `battle-runtime-scalar-buff-active-effects.mbt.qnt`
- `battle-runtime-scalar-buff.mbt.qnt`
- `battle-runtime-sleep-repeat-save.mbt.qnt`
- `battle-runtime-starry-wisp-object.mbt.qnt`
- `battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
- `battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`

Output:

- Add route connectors for spell/effect subject families not already covered
  by the first three routed drivers.
- Reuse battle-owned slots, action resources, hole frontier, interrupt stack,
  active effect, Concentration, HP, and turn-boundary owners.
- Preserve table-owned facts such as area membership, movement route, spatial
  placement, object selection, and visibility as boundary fills, not production
  world-model state.

Acceptance:

- Each connector records the reducer entrypoint path and durable owner group.
- No connector creates a local spell/effect state island where `BattleState`
  owns the durable fact.
- Route connectors stay focused by subject family; selected-identity spell
  bundles wait for Task 7 or Tasks 11-12.

Verification:

- Shared verification.
- Focused MBT for each touched original driver and route connector.

Plan Impact:

- Split spatial/table-fact work into `source-qnt-corpus-blocker` or boundary
  tasks if copied QNT does not state enough target-independent shape.

### Task 7 - L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Status: `done`

Depends on:

- L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES
- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- Battle selected-identity drivers in the current inventory, including feature,
  species passive trait, danger sense, healing stabilization, movement forced
  movement, roll-modifier buff, weapon mastery, and metamagic drivers.
- Level-1 grouped selected-identity spell drivers only after their generic
  spell/effect substrate exists.

Output:

- For each selected-identity driver, extract the generic substrate route:
  procedure profile, capability fact, resource state, active-effect state,
  support-profile admission, or cross-record reference.
- Add route connectors against that substrate.
- Keep authored identity in catalog/selection/admission fixtures only.

Acceptance:

- No production runtime branch uses a selected Unit/spell/feature id or name as
  a mechanics dispatch key.
- Route connectors prove behavior by shape and typed facts.
- Drivers whose generic shape is not present in QNT/guidance are recorded as
  `source-qnt-corpus-blocker`, not implemented by target inference.

Verification:

- Shared verification.
- Focused selected-identity MBT for touched drivers.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Added Tasks 23-31 for the nine missing generic substrate families discovered
  while routing the bonus-action Unit feature Dash with Temporary Hit Points
  substrate.

### Task 23 - L15-RR07-FU01-LEVEL1-SPELL-IDENTITY-SUBSTRATES

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`
- `battle-runtime-condition-saving-throw-selected-identity.mbt.qnt`
- `battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`
- `battle-runtime-find-familiar-selected-identity.mbt.qnt`
- `battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
- `battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
- `battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
- `battle-runtime-mage-armor-selected-identity.mbt.qnt`
- `battle-runtime-reaction-spell-selected-identity.mbt.qnt`
- `battle-runtime-sanctuary-selected-identity.mbt.qnt`
- `battle-runtime-thaumaturgy-selected-identity.mbt.qnt`

Output:

- Split grouped level-1 spell identity witnesses into generic spell invocation,
  active-effect, protection/charm, object, reaction, spatial, and spell-shape
  route substrates before target replay counts.
- Keep spell identity only at catalog, selection, admission, and SRD fixture
  boundaries.
- Update `reducer-route-inventory.json` with connector paths or precise
  `source-qnt-corpus-blocker` records per split substrate.

Acceptance:

- No spell id, name, slug, or provenance section is used as a production
  mechanics dispatch key.
- Route evidence is admitted by generic spell/effect shape and typed facts.
- Each selected-identity branch either points to a source route connector or to
  a source-QNT blocker that names the missing generic substrate.

Verification:

- Shared verification.
- Focused MBT for each touched level-1 selected spell route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Split this task again if grouped spell identity witnesses still mix unrelated
  durable owners after the first source-QNT pass.

### Task 24 - L15-RR07-FU02-SPECIES-PASSIVE-TRAIT-SUBSTRATES

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt`
- `battle-runtime-species-passive-trait-selected-identity.mbt.qnt`

Output:

- Extract passive trait route owners for typed damage adjustment, saving throw
  roll modes, grapple escape roll modes, movement through occupied spaces, and
  size/speed state.
- Preserve species identity only at catalog, selection, admission, and SRD
  fixture boundaries.
- Update `reducer-route-inventory.json` with connector paths or precise
  `source-qnt-corpus-blocker` records.

Acceptance:

- Species passive trait behavior routes by typed trait facts and creature state,
  not species or trait identity.
- Damage, saving throw, movement, and size/speed state owners are split when
  their lifecycle differs.
- No selected species replay counts without source-QNT generic substrate
  evidence.

Verification:

- Shared verification.
- Focused MBT for each touched species passive trait route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Add narrower tasks if passive trait damage, movement, and roll-mode owners
  cannot stay in one focused task.

### Task 25 - L15-RR07-FU03-CONDITION-AND-ROLL-MODIFIER-FEATURE-SUBSTRATES

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-danger-sense-selected-identity.mbt.qnt`
- `battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`

Output:

- Extract generic roll-modifier, condition-suppression, and
  saving-throw/ability-check support-profile routes without branching on feature
  identity.
- Route by condition facts, d20 roll facts, support-profile admission, and
  active effect state.
- Update `reducer-route-inventory.json` with connector paths or precise
  `source-qnt-corpus-blocker` records.

Acceptance:

- Feature-hosted roll changes are admitted by roll mode and typed effect facts,
  not feature names.
- Condition suppression and roll modifiers use their existing durable owners or
  split to new owners before replay counts.
- Route connectors prove behavior by shape and typed facts.

Verification:

- Shared verification.
- Focused MBT for each touched condition or roll-modifier feature connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Split roll-mode and condition-suppression work if one connector would combine
  independent durable owners.

### Task 26 - L15-RR07-FU04-ZERO-HP-STABILIZATION-SUBSTRATE

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-healing-stabilization-selected-identity.mbt.qnt`

Output:

- Route stabilization through the BattleState zero-Hit-Point lifecycle owner
  before selected healing/stabilization identity replay counts.
- Preserve spell or feature identity only where the source rule references an
  authored record or at admission/fixture boundaries.
- Update `reducer-route-inventory.json` with connector paths or a precise
  `source-qnt-corpus-blocker`.

Acceptance:

- Stabilization routing uses HP/death-save lifecycle state and typed effect
  facts, not selected identity.
- Temporary HP, true healing, stabilization, and death saving throw state remain
  distinct runtime concepts.
- No cleanroom replay infers zero-HP behavior from a spell or feature label.

Verification:

- Shared verification.
- Focused MBT for the touched stabilization route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Add a narrower zero-HP lifecycle task if stabilization requires a split from
  healing or death-save owners.

### Task 27 - L15-RR07-FU05-FEATURE-MOVEMENT-AND-FORM-SUBSTRATES

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt`
- `battle-runtime-movement-forced-movement-selected-identity.mbt.qnt`

Output:

- Split movement-resource, active-form, climb/swim/fly speed, forced movement,
  and teleport route owners before selected movement or form identity replay
  counts.
- Route by movement mode, speed facts, form lifecycle state, and boundary fills
  for table-chosen positions.
- Update `reducer-route-inventory.json` with connector paths or precise
  `source-qnt-corpus-blocker` records.

Acceptance:

- Feature movement and form behavior routes by state shape and typed movement
  facts, not feature or form identity.
- Position/table facts remain boundary fills unless source QNT establishes a
  target-independent battle owner.
- Form lifecycle state is not duplicated beside its durable runtime owner.

Verification:

- Shared verification.
- Focused MBT for each touched movement or form route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Split active-form lifecycle from movement-resource routing if their ownership
  cannot stay local.

### Task 28 - L15-RR07-FU06-WEAPON-MASTERY-PROPERTY-SUBSTRATES

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-weapon-mastery-selected-identity.mbt.qnt`

Output:

- Route mastery properties by property fact, attack/save holes, and durable
  rider owners before selected mastery identity replay counts.
- Preserve mastery identity only at catalog, selection, admission, and SRD
  fixture boundaries.
- Update `reducer-route-inventory.json` with connector paths or a precise
  `source-qnt-corpus-blocker`.

Acceptance:

- Mastery behavior dispatches by typed property facts and weapon/attack shape,
  not weapon or mastery names.
- Attack, saving throw, condition, movement, and rider state owners split where
  their lifecycles differ.
- Route connectors prove behavior by shape and typed facts.

Verification:

- Shared verification.
- Focused MBT for the touched weapon mastery route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Add narrower tasks for mastery properties whose rider owners cannot share one
  route surface.

### Task 29 - L15-RR07-FU07-DRAGONBORN-BREATH-WEAPON-SUBSTRATE

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-dragonborn-breath-weapon.mbt.qnt`

Output:

- Add a route connector for generic attack-action area save damage replacement
  with feature resource, area shape, saving throw, damage type, damage roll, and
  extra-attack continuation owners.
- Keep species and trait identity at catalog, selection, admission, and SRD
  fixture boundaries.
- Update `reducer-route-inventory.json` with the connector path or a precise
  `source-qnt-corpus-blocker`.

Acceptance:

- Breath-style area damage replacement routes by feature resource state, area
  facts, save facts, damage facts, and attack-action procedure state.
- Extra Attack continuation is represented by procedure state, not by trait
  identity.
- Source QNT supplies target-independent substrate evidence before cleanroom
  replay counts.

Verification:

- Shared verification.
- Focused MBT for the touched area save damage replacement route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Split area-shape, save, and damage owners if one connector would accumulate
  unrelated durable state.

### Task 30 - L15-RR07-FU08-METAMAGIC-GOVERNOR-AND-OPTION-SUBSTRATES

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-quickened-spell-governor.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
- `battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`

Output:

- Route metamagic by typed option facts, Sorcery Point spend, spell timing
  governor, one-option-per-spell constraints, and option-specific spell
  procedure owners.
- Keep metamagic option identity at catalog, selection, admission, and SRD
  fixture boundaries only.
- Update `reducer-route-inventory.json` with connector paths or precise
  `source-qnt-corpus-blocker` records.

Acceptance:

- Metamagic execution dispatches by typed option facts and spell procedure
  shape, not option names.
- Sorcery Point spend and one-option-per-spell governor state are executable
  runtime facts with one owner.
- Option-specific effects split when they touch independent durable owners.

Verification:

- Shared verification.
- Focused MBT for each touched metamagic route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Split governor routing from option-specific routing if source QNT shows they
  need independent tasks.

### Task 31 - L15-RR07-FU09-INNATE-SPELL-BENEFIT-FEATURE-SUBSTRATE

Status: `ready-for-research`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-feature-selected-identity.mbt.qnt`

Output:

- Route active feature benefits to spell save DC and spell attack roll mode by
  typed active-effect facts, not feature identity.
- Keep feature identity only at catalog, selection, admission, and SRD fixture
  boundaries.
- Update `reducer-route-inventory.json` with the connector path or a precise
  `source-qnt-corpus-blocker`.

Acceptance:

- Spell save and spell attack benefits route by active-effect state and typed
  spell procedure facts.
- The runtime does not branch on feature id, name, slug, or provenance section.
- Route connector evidence proves behavior by shape and typed facts.

Verification:

- Shared verification.
- Focused MBT for the touched active feature spell benefit route connector.
- `pnpm check:authored-id-dispatch`

Plan Impact:

- Split save DC and spell attack roll-mode benefit owners if they diverge in
  source QNT.

### Task 8 - L15-RR08-CHARACTER-CREATION-ROUTES

Status: `done`

Depends on:

- L15-RR02-ROUTE-VOCABULARY-AND-GATES

Drivers:

- `character-creation-class-feature-projections.mbt.qnt`
- `character-creation-class-feature-selected-identity.mbt.qnt`
- `character-creation-cleric-druid-order-selected-identity.mbt.qnt`
- `character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
- `character-creation-rogue-expertise-selected-identity.mbt.qnt`
- `character-creation-runtime.mbt.qnt`
- `character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`
- `character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`

Output:

- Define a character-creation route vocabulary over draft state, option
  discovery, fill application, selected identity retention, and finalization.
- Add route connectors for character creation drivers.
- Keep selected identities as retained selection facts, not reducer mechanics
  dispatch.

Acceptance:

- Cleanroom target can prove creation drivers through one draft/fill/finalize
  reducer surface.
- Character creation does not duplicate catalog option sets when Surface
  content already owns them.
- Level-3/5 Warlock invocation replacement branches stay blocked until Task 11
  or Task 12 promotes their scope.

Verification:

- Shared verification.
- Focused character-creation MBT for touched drivers.
- `pnpm --filter @dnd/character-creation-runtime typecheck`

Plan Impact:

- Applied. Character-creation route connectors now cover the level-1/2 draft,
  fill, selected-reference, projection, and finalization surface. The existing
  Task 11 and Task 12 level-band promotion tasks remain the executable follow-up
  surface for level-3/5 Warlock invocation replacement branches.

### Task 9 - L15-RR09-CHARACTER-SHEET-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR02-ROUTE-VOCABULARY-AND-GATES

Drivers:

- `character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- `character-sheet-arcane-recovery-selected-identity.mbt.qnt`
- `character-sheet-armor-class-base-selected-identity.mbt.qnt`
- `character-sheet-class-feature-selected-identity.mbt.qnt`
- `character-sheet-healing-resource-selected-identity.mbt.qnt`
- `character-sheet-hit-point-maximum.mbt.qnt`
- `character-sheet-hp-rest-hit-dice.mbt.qnt`
- `character-sheet-spell-slots-pact-slots.mbt.qnt`
- `character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- `character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`

Output:

- Define a character-sheet route vocabulary over retained build facts, sheet
  state, rest lifecycle, resource expenditure/recovery, selected-ref retention,
  and projection.
- Add route connectors for character sheet drivers.
- Preserve existing canonical owners for Hit Point maximum, Hit Dice, Spell
  Slot/Pact Slot state, created slots, rests, and selected class-choice refs.

Acceptance:

- Sheet route connectors prove state transitions through one sheet reducer
  surface.
- No duplicate slot table, HP maximum, selected weapon mastery roster, or
  feature-resource cache is added beside existing owners.
- Level-2/3 slot and subclass spell projection branches remain behind Task 11.

Verification:

- Shared verification.
- Focused character-sheet MBT for touched drivers.
- `pnpm --filter @dnd/character-sheet-runtime typecheck`

Plan Impact:

- Applied. Character-sheet route connectors now cover retained build-fact
  projection, sheet state, rest/resource owners, selected-reference retention,
  and projection. No new follow-up task was added because the excluded
  level-2/3 slot and subclass spell projection branches remain visible in Task
  11.

### Task 10 - L15-RR10-CHARACTER-BATTLE-HANDOFF-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR08-CHARACTER-CREATION-ROUTES
- L15-RR09-CHARACTER-SHEET-ROUTES
- L15-RR03-FINISH-CURRENT-DIAGNOSTIC-QUEUE

Drivers:

- `character-battle-init-projection.mbt.qnt`
- `character-battle-origin-feat-selected-identity.mbt.qnt`
- `character-battle-settlement.mbt.qnt`
- `character-layer-projection-lifecycle.mbt.qnt`
- `character-sheet-feature-resources.mbt.qnt`

Output:

- Define character-battle handoff route connectors for sheet-to-battle init,
  retained resource projection, battle mutation, and settlement.
- Route aggregate slot/resource handoff through existing sheet and battle
  owners; do not invent a third source-of-truth ledger.

Acceptance:

- Init projection route proves only the handoff facts needed by battle.
- Settlement route preserves source-exact resource accounting or rejects
  source-ambiguous settlement where QNT requires it.
- Feature resources route uses sheet-owned point/use state and battle-owned
  aggregate action/spell state without duplication.

Verification:

- Shared verification.
- Focused character-battle MBT for touched drivers.
- Typecheck touched character/battle packages.

Plan Impact:

- Applied. Character-battle route connectors now cover sheet-to-battle init,
  selected-reference handoff, battle settlement, lifecycle layer projection, and
  feature-resource handoff. No Task 12 split was added because level-5 Font of
  Magic, Metamagic, created-slot, and spell-level-3 promotion work remains
  visible in Task 12.

### Task 11 - L15-RR11-LEVEL3-4-SCOPE-PROMOTION

Status: `done`

Depends on:

- L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES
- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES
- L15-RR08-CHARACTER-CREATION-ROUTES
- L15-RR09-CHARACTER-SHEET-ROUTES

Candidate promotions:

- spell-level-2 branches currently out of branch scope.
- level-3 subclass/class feature branches currently out of branch scope.
- level-4 character progression and selection-grant container evidence where
  Task 1 says cleanroom route evidence is still missing.

Output:

- Promote branch-scope rows for level-3 and level-4 character support only
  after their generic route surfaces exist.
- Add or update route connectors for promoted branches.
- Keep level-5, spell-level-3, and higher-level work in Task 12 unless Task 1
  proves a smaller split is required.

Acceptance:

- `branch-scope.jsonl` and generated inventory explain every promoted branch.
- No selected-identity branch is promoted without substrate route evidence.
- The level-1 through level-4 cleanroom package is internally consistent before
  level-5 work starts.

Verification:

- Shared verification.
- `pnpm cleanroom-branch-coverage:check -- --write`
- `pnpm cleanroom-branch-coverage:check`
- Focused MBT for promoted drivers.

Plan Impact:

- Add narrower tasks if level-3/4 scope promotion surfaces independent
  substrates.

### Task 12 - L15-RR12-LEVEL5-SCOPE-PROMOTION

Status: `blocked`

Depends on:

- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES
- L15-RR10-CHARACTER-BATTLE-HANDOFF-ROUTES
- L15-RR11-LEVEL3-4-SCOPE-PROMOTION

Candidate promotions:

- level-5 class features from the L5 Ralph lanes.
- spell-level-3 pressure reachable by character level 5.
- level-5 Font of Magic, Metamagic, created-slot, and handoff branches
  identified by Tasks 1 and 10.

Output:

- Promote level-5 and spell-level-3 branches into branch scope with route
  classes and derivability records.
- Add route connectors for level-5 class features and spell-level-3 subjects
  only where source QNT already states generic shape.
- Keep spell-level-4, spell-level-5, level-6, level-7, and epic-boon branches
  out of scope.

Acceptance:

- Level-5 route connector evidence covers class-feature and spell-level-3
  branches selected by Task 1.
- Any missing generic substrate is recorded as `source-qnt-corpus-blocker` or
  split into a concrete follow-up task.
- No broad selected-identity fanout is added.

Verification:

- Shared verification.
- Focused MBT for promoted level-5 drivers and connectors.
- `pnpm unit-profile-coverage:check`
- `pnpm cleanroom-branch-coverage:check`

Plan Impact:

- Add follow-up Ralph tasks for spell-level-3 families that need new source QNT
  before cleanroom routing is meaningful.

### Task 15 - L15-RR15-AFTER-HIT-RIDER-OWNER-SPLIT

Status: `ready-for-research`

Depends on:

- L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES
- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- `battle-runtime-after-hit-damage-riders.mbt.qnt`

Output:

- Split after-hit rider route evidence by durable battle owner before adding
  route connectors.
- Keep interrupt decision, slot/free-cast spend, Concentration, condition
  lifecycle, turn-start damage/save, escape checks, illumination boundary facts,
  and HP damage in separate owner-shaped route surfaces where the source driver
  combines them.
- Update `reducer-route-inventory.json` with each split connector path or a
  precise `source-qnt-corpus-blocker`.

Acceptance:

- No connector acts as a whole-battle accumulator for unrelated rider owners.
- Rider routes dispatch by procedure state, typed fills, and owner state, not
  by spell, feature, weapon, or unit identity.
- Each landed split has a focused source QNT route witness and TS MBT parity.

Verification:

- Shared verification.
- Focused MBT for each touched after-hit split connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add narrower tasks if a split still mixes independent durable owner families.

### Task 16 - L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES
- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- `battle-runtime-chained-attack-sequence.mbt.qnt`

Output:

- Promote a generic multi-step spell/attack procedure route owner before
  routing chained attack sequence evidence.
- Route target history, damage-type choice, attack-roll resolution, damage,
  and chain continuation through procedure-shaped owners instead of a single
  attack route connector.
- Update `reducer-route-inventory.json` with the procedure connector path or a
  precise blocker if source QNT lacks target-independent shape.

Acceptance:

- Chained attack sequence routing preserves the procedure lifecycle rather than
  replaying isolated attack steps.
- Route evidence uses spell/attack shape and typed procedure state, not selected
  spell identity.
- The source connector stays leaf-budget compliant or records why a computed
  oracle is unavoidable.

Verification:

- Shared verification.
- Focused MBT for the chained attack source driver and route connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add narrower tasks if chain continuation needs an owner separate from the
  generic procedure route.

### Task 17 - L15-RR17-WEAPON-HOSTED-RIDER-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR05-BATTLE-ACTION-ATTACK-STATBLOCK-ROUTES
- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES
- L15-RR07-BATTLE-FEATURE-SUBSTRATE-ROUTES

Candidate drivers:

- `battle-runtime-weapon-hosted-attack-and-riders.mbt.qnt`

Output:

- Split weapon-hosted attack/rider route evidence into hosted attack,
  damage-rider, held-weapon active-effect, weapon-enhancement item-target, and
  cleanup owner surfaces.
- Reuse battle action economy, target selection, attack-roll, HP, active-effect,
  item-target boundary, and support-profile owners as applicable.
- Update `reducer-route-inventory.json` with each split connector path or a
  precise blocker.

Acceptance:

- No connector combines action economy, active-effect duration, item targeting,
  attack-roll, damage-rider, and cleanup owners into one accumulator.
- Route evidence is admitted by weapon/attack/effect shape and typed facts, not
  by authored weapon, spell, or unit identity.
- Each landed split has focused source QNT route evidence and TS MBT parity.

Verification:

- Shared verification.
- Focused MBT for each touched weapon-hosted split connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add narrower tasks if a split still requires an independent durable owner.

### Task 18 - L15-RR18-BATTLE-ACTIVE-EFFECT-LIFECYCLE-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- `battle-runtime-roll-modifier-active-effects.mbt.qnt`
- `battle-runtime-scalar-buff-active-effects.mbt.qnt`
- `battle-runtime-sleep-repeat-save.mbt.qnt`
- `battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
- `battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`

Output:

- Add focused route connectors for remaining active spell-effect lifecycle
  drivers that were left `substrate-first` after the Command/scalar-buff Task 6
  slice.
- Keep active-effect, Concentration, condition, HP, turn-boundary, and
  action-resource owners separate; split a candidate further before routing if
  one connector would accumulate unrelated durable owners.
- Preserve table ordering choices and same-timing choices as boundary fills or
  source-QNT blockers rather than production state islands.

Acceptance:

- Each connector records reducer entrypoint path and durable owner group.
- No connector stores derived spell-effect facts beside the BattleState owner
  that already owns them.
- `reducer-route-inventory.json` points each landed driver at its connector or
  records a precise `source-qnt-corpus-blocker`.

Verification:

- Shared verification.
- Focused MBT for each touched active-effect lifecycle source driver and route
  connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add narrower tasks if one active-effect lifecycle driver still mixes
  independent durable owner families.

### Task 19 - L15-RR19-BATTLE-REACTION-INTERRUPT-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- `battle-runtime-interrupt-stack-resume.mbt.qnt`
- `battle-runtime-reaction-casting-time.mbt.qnt`

Output:

- Add focused route connectors for reaction spell and interrupt-stack resume
  drivers that were left `substrate-first` after the Command/scalar-buff Task 6
  slice.
- Route reaction availability, spell slot spend, interrupt-stack push/resume,
  and continuation state through durable battle owners.
- Keep table/chosen interruption decisions as boundary fills and avoid replay
  islands that restate the interrupted procedure.

Acceptance:

- Each connector records reducer entrypoint path and durable owner group.
- Interrupt stack continuation is represented by procedure state and owner
  route events, not by authored spell identity or fixture action names.
- `reducer-route-inventory.json` points each landed driver at its connector or
  records a precise `source-qnt-corpus-blocker`.

Verification:

- Shared verification.
- Focused MBT for each touched reaction/interrupt source driver and route
  connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add narrower tasks if reaction casting and interrupt replay need separate
  owner surfaces.

### Task 20 - L15-RR20-BATTLE-COMPANION-OBJECT-BOUNDARY-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- `battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
- `battle-runtime-starry-wisp-object.mbt.qnt`

Output:

- Add focused route connectors for companion lifecycle and object-target
  boundary drivers that were left `substrate-first` after the Command/scalar-buff
  Task 6 slice.
- Route familiar presence, replacement, shared-sense resources, touch delivery,
  and familiar Reaction spend through battle-owned companion/action owners.
- Keep object target choice, object AC/HP facts, lighting placement, and spatial
  placement as boundary fills unless source QNT establishes a target-independent
  battle owner.

Acceptance:

- Companion state is owned by battle runtime state and is not duplicated in a
  route-local ledger.
- Object and spatial facts remain boundary fills or become explicit
  `source-qnt-corpus-blocker` rows.
- `reducer-route-inventory.json` points each landed driver at its connector or
  records a precise blocker.

Verification:

- Shared verification.
- Focused MBT for each touched companion/object source driver and route
  connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Split companion and object-target work further if their route owners cannot
  stay independent in one task.

### Task 21 - L15-RR21-BATTLE-ABILITY-SEARCH-CHOICE-ROUTES

Status: `ready-for-research`

Depends on:

- L15-RR06-BATTLE-SPELL-EFFECT-ROUTES

Candidate drivers:

- `battle-runtime-ability-check-choice-search.mbt.qnt`

Output:

- Add a route connector for Search, ability-check, skill-choice, and
  ability-choice spell-effect holes that were left `substrate-first` after the
  Command/scalar-buff Task 6 slice.
- Reuse rule-core ability/skill components and battle-owned action/effect
  owners; keep hidden-candidate discovery and table target admission as boundary
  fills.

Acceptance:

- Route evidence uses typed ability/skill/search facts, not spell or fixture
  identity.
- The connector records reducer entrypoint path and durable owner group for
  each supported branch.
- Out-of-denominator level-2 branches remain explicitly scoped out unless a
  later promotion task admits them.

Verification:

- Shared verification.
- Focused MBT for the ability-check/Search source driver and route connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add a component-first follow-up if the source driver needs more rule-core
  ability/skill substrate before battle routing.

### Task 22 - L15-RR22-BATTLE-INDEPENDENT-SPELL-ATTACK-SEQUENCE-ROUTES

Status: `blocked`

Depends on:

- L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES

Candidate drivers:

- `battle-runtime-eldritch-blast.mbt.qnt`

Output:

- Add a route connector for independent multi-beam spell attack sequence
  evidence after the generic multi-step spell/attack procedure owner exists.
- Route target choice, object-target boundary facts, attack rolls, damage rolls,
  HP damage, and sequence continuation through procedure-shaped owners instead
  of selected spell identity.

Acceptance:

- Route evidence uses spell/attack procedure shape and typed facts, not the
  selected spell id or name.
- Object target choice remains a table-owned boundary fill unless a
  target-independent battle owner is added.
- `reducer-route-inventory.json` points the landed driver at its connector or
  records a precise blocker.

Verification:

- Shared verification.
- Focused MBT for the independent spell attack source driver and route
  connector.
- `pnpm check:reducer-route-connectors`
- `pnpm check:mbt-driver-closure`

Plan Impact:

- Add narrower tasks if beam sequence continuation and object-target boundary
  routing need separate owner surfaces.

### Task 13 - L15-RR13-DIRTY-CLEANROOM-REHEARSAL

Status: `blocked`

Depends on:

- L15-RR12-LEVEL5-SCOPE-PROMOTION
- L15-RR15-AFTER-HIT-RIDER-OWNER-SPLIT
- L15-RR16-CHAINED-ATTACK-PROCEDURE-ROUTES
- L15-RR17-WEAPON-HOSTED-RIDER-ROUTES
- L15-RR18-BATTLE-ACTIVE-EFFECT-LIFECYCLE-ROUTES
- L15-RR19-BATTLE-REACTION-INTERRUPT-ROUTES
- L15-RR20-BATTLE-COMPANION-OBJECT-BOUNDARY-ROUTES
- L15-RR21-BATTLE-ABILITY-SEARCH-CHOICE-ROUTES
- L15-RR22-BATTLE-INDEPENDENT-SPELL-ATTACK-SEQUENCE-ROUTES

Output:

- Sync the current source package into `/workspace/typescript/dnd-cleanroom-rust-agent`.
- Run the dirty cleanroom as a diagnostic target for the level-1 through
  level-5 route package.
- Prefer focused route batches over repairing unrelated historical dirty
  ledger debt.
- Record source SHA, branch inventory SHA, connector hashes, state-owner
  records, and blocker notes.

Acceptance:

- Dirty cleanroom tests prove target replay goes through route connector
  surfaces for every selected batch.
- Dirty harness failures are either fixed if they block route evidence, or
  documented as unrelated historical artifact debt.
- No target production code dispatches on fixture/authored identity.

Verification:

- `cargo fmt --check`
- Focused dirty cleanroom adapter/route tests for selected batches.
- `cargo test`
- `cargo clippy --all-targets -- -D warnings`
- `node scripts/check-cleanroom-harness.cjs`, with failures classified.

Plan Impact:

- Feed every source-QNT or guidance gap found in dirty rehearsal back into this
  source plan before claiming fresh cleanroom readiness.

### Task 14 - L15-RR14-FRESH-CLEANROOM-PACKAGE-GATE

Status: `blocked`

Depends on:

- L15-RR13-DIRTY-CLEANROOM-REHEARSAL

Output:

- Produce a fresh cleanroom package gate for level-1 through level-5 route
  evidence.
- Ensure copied guidance, route inventories, branch scope, state-owner
  requirements, and target replay evidence schema are enough for a target agent
  with no TypeScript source reads.
- Define the acceptance slice for a future fresh cleanroom run.

Acceptance:

- A future cleanroom agent can start from copied QNT, RAW/domain inputs,
  route inventories, and guidance without reading TypeScript source.
- Every route class has an executable connector, component connector, or
  explicit blocker.
- The fresh package does not depend on dirty cleanroom historical ledger state.

Verification:

- Shared verification.
- `node scripts/sync-cleanroom-input.cjs --self-test`
- `pnpm cleanroom-sync:check`
- `pnpm cleanroom-scaffold:check`
- `pnpm cleanroom-harness:check`
- Reviewer-loop convergence focused on cleanroom boundary, identity dispatch,
  state ownership, and route connector derivability.

Plan Impact:

- Close this lane only when the fresh cleanroom package gate is executable.
