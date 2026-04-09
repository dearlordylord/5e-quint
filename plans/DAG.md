# Plans Dependency DAG

## Purpose

This file is a scheduling artifact.

It exists to answer:

- what is currently active
- what is blocked on what
- what is ready to schedule next

It is intentionally smaller than the full plan corpus. Completed historical redesigns should be removed from the active DAG once they no longer inform any remaining ordering decisions.

## Priority Boundary

Do not schedule Hellenvald-related work until:

- the full SRD feature set we intend to model is in place
- the project's domain-language architecture has been improved

Priority order for repository-shaping work:

1. the formal spec / `.sbt` side
2. domain language and ownership in the repo
3. TypeScript architecture only as support for the first two

That means Hellenvald/transcript nodes remain explicitly lower priority than SRD coverage and domain-language cleanup, even when the underlying demo infrastructure already exists.

## Edge semantics

`A -> B` means: do not schedule `B` until `A` exists or is complete.

Node kinds:

- `plan`: active workstream or batch family
- `facility`: missing state/model/runtime capability that unblocks other work
- `batch`: a concrete next implementation slice
- `candidate`: later-promotable item, usually from inspiration mining

Status values:

- `active`
- `ready`
- `blocked`
- `later`
- `complete`

## Active DAG

```text
resolve-commit-doctrine
  -> preview-execution
  -> dm-override
  -> transcript-port-to-dnd

canonical-condition-effects
  -> duration-boundary-audit

first-class-consumption-model
  -> battle-spellcast-action-breadth
  -> preview-execution
  -> dm-override

available-actions-main
  -> movement-action-surface
  -> dm-override
  -> transcript-port-to-dnd

available-actions-main
  -> preview-execution

available-actions-main
  -> battle-spellcast-action-breadth

available-actions-main
  -> transcript-port-to-dnd

battle-helped-target-state
  -> help-advantage-state

qualified-damage-typing
  -> qualified-physical-damage-bypass

effect-dependency-graph
  -> parent-child-effect-teardown

one-shot-rider-consumption-metadata
  -> next-hit-rider-consumption

off-hand-attack-surface
  -> two-weapon-fighting-bonus-attack

weapon-property-aware-battle-resolution
  -> battle-hand-occupancy-state
  -> fighting-styles-in-battle

battle-hand-occupancy-state
  -> versatile-weapon-die-switching

oa-path-vocabulary
  -> movement-action-surface
  -> battle-spatial-expansion

battle-spatial-expansion
  -> hide-stealth-chain
  -> forced-movement-vs-oa
  -> reach-extends-oa-range

max-hp-reduction-state
  -> max-hp-reduction

closed-modifier-algebra
  -> generic-per-attack-type-bonus-surface

authoritative-d20-modifier-query-surface
  -> armor-training-disadvantage
```

## Node Table

| Node | Kind | Status | Depends on | Unblocks | Notes |
| --- | --- | --- | --- | --- | --- |
| `resolve-commit-doctrine` | facility | complete | none | `preview-execution`, `dm-override`, `transcript-port-to-dnd` | Landed in repo architecture/domain docs and battle vocabulary; retain only because later descriptive-mode and transcript work still depend on the doctrine |
| `canonical-condition-effects` | facility | complete | none | `duration-boundary-audit` | Landed canonical condition-consequence ownership in runtime query/types surfaces; keep here only because it still explains why the audit node is now complete |
| `first-class-consumption-model` | facility | complete | none | `battle-spellcast-action-breadth`, `preview-execution`, `dm-override` | Landed typed spend/refund/quota vocabulary in available-actions support surfaces; keep here because later action-surface work still builds on it |
| `closed-modifier-algebra` | facility | blocked | none | `generic-per-attack-type-bonus-surface` | Refines the old shared modifier surface using applied inspiration `11`; use a closed typed algebra, not an open-ended registry |
| `oa-path-vocabulary` | facility | complete | none | `movement-action-surface`, `battle-spatial-expansion` | Landed in [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md), [battle.qnt](/workspace/typescript/dnd/battle.qnt), and [battle-machine-actions-movement.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-movement.ts); geometry remains caller-owned by design |
| `authoritative-d20-modifier-query-surface` | facility | complete | none | `armor-training-disadvantage` | Landed authoritative d20 modifier/disadvantage query ownership in machine query/types surfaces; keep here because downstream planning still references the seam |
| `available-actions-main` | plan | active | none | `movement-action-surface`, `preview-execution`, `battle-spellcast-action-breadth`, `dm-override`, `transcript-port-to-dnd` | Source of truth: [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md) |
| `battle-spellcast-action-breadth` | plan | later | `available-actions-main`, `first-class-consumption-model` | later spell-cast reactions | `CAST_COUNTERSPELL` is already complete; this is the remaining breadth umbrella |
| `legendary-resistance-fallback` | batch | complete | `battle-spellcast-action-breadth` | additional battle interrupt breadth | Closed as a narrow AoE failed-save regression slice; no separate breadth batch remains to schedule here |
| `movement-action-surface` | plan | later | `available-actions-main`, `oa-path-vocabulary` | explicit `cost.movement` bucket | Too broad as a handoff; prefer concrete slices like `stand-from-prone-in-battle` |
| `preview-execution` | batch | complete | `available-actions-main`, `resolve-commit-doctrine`, `first-class-consumption-model` | no-spend scripted action preview | Landed end to end in core and MCP; retain only because later descriptive-mode/transcript work still depends on the doctrine/model it consumed |
| `dm-override` | plan | later | `available-actions-main`, `resolve-commit-doctrine`, `first-class-consumption-model` | descriptive-mode legality warnings | Phase 6 in [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md) |
| `transcript-port-to-dnd` | plan | later | `available-actions-main`, `resolve-commit-doctrine` | end-to-end audio/transcript/action loop | Hellenvald demo + tail facilities already exist; port is still later |
| `same-name-magical-effect-non-stacking` | candidate | complete | none | runtime policy alignment | Landed runtime replacement semantics to match same-spell non-stacking policy |
| `exhaustion-d20-penalty` | candidate | complete | none | TS/runtime parity with Quint | Landed runtime penalty aggregation parity with Quint exhaustion semantics |
| `armor-training-disadvantage` | candidate | complete | `authoritative-d20-modifier-query-surface` | STR/DEX d20 disadvantage wiring | Landed via the new d20 query seam and armor/training guard wiring |
| `sneak-attack-any-disadvantage` | candidate | complete | none | correctness win in rogue attack policy | Landed in creature and battle attack paths |
| `sneak-attack-once-per-turn-boundary` | candidate | complete | none | battle turn-boundary regression coverage | Landed as deterministic battle regression coverage and policy tightening |
| `stand-from-prone-in-battle` | candidate | complete | none | battle action exposure for standing | Landed as a first-class battle action and surfaced available action |
| `duration-boundary-audit` | candidate | complete | `canonical-condition-effects` | timing-sensitive effect regression coverage | Audit checklist landed in [DURATION_BOUNDARY_AUDIT.md](/workspace/typescript/dnd/plans/DURATION_BOUNDARY_AUDIT.md) with deterministic timing regressions; no broader production refactor was needed |
| `qualified-damage-typing` | facility | complete | none | `qualified-physical-damage-bypass` | Landed minimal `magical` / `silvered` / `adamantine` qualifiers in Quint and TS attack/damage flow |
| `qualified-physical-damage-bypass` | candidate | complete | `qualified-damage-typing` | monster/effect fidelity | Landed qualified physical resistance, vulnerability, and immunity bypass semantics in Quint and TS battle damage flow with deterministic scenario coverage |
| `battle-helped-target-state` | facility | complete | none | `help-advantage-state` | Battle-owned helped-target state landed with owner-scoped expiry semantics in Quint and TS |
| `help-advantage-state` | candidate | complete | `battle-helped-target-state` | core action-economy mechanic | Help now contributes a real attack-advantage source with consumption on the next qualifying attack |
| `effect-dependency-graph` | facility | blocked | none | `parent-child-effect-teardown` | Need parent/child effect ownership graph |
| `parent-child-effect-teardown` | candidate | blocked | `effect-dependency-graph` | concentration-linked cleanup correctness | Inspiration item `31` |
| `one-shot-rider-consumption-metadata` | facility | complete | none | `next-hit-rider-consumption` | Landed consume-on-next-qualifying-hit metadata and consumption hooks without widening to the full downstream rider batch |
| `next-hit-rider-consumption` | candidate | complete | `one-shot-rider-consumption-metadata` | recurring spell/feature semantics | Landed battle consumption of qualifying next-hit rider effects with deterministic regression coverage |
| `off-hand-attack-surface` | facility | complete | none | `two-weapon-fighting-bonus-attack` | Battle off-hand attack event/action surface landed in Quint and TS battle machines |
| `two-weapon-fighting-bonus-attack` | candidate | complete | `off-hand-attack-surface` | battle bonus-action attack support | Landed the light-weapon bonus-action off-hand attack slice; fighting-style modifiers remain separate follow-up work |
| `weapon-property-aware-battle-resolution` | facility | complete | none | `battle-hand-occupancy-state`, `fighting-styles-in-battle` | Battle attack resolution now consumes weapon-property ownership for immediate combat semantics |
| `battle-hand-occupancy-state` | facility | ready | `weapon-property-aware-battle-resolution` | `versatile-weapon-die-switching` | Next owned-state seam for hand-busy / shield / free-hand facts; needed before versatile die switching and future hand-usage consumers such as double-grapple semantics |
| `fighting-styles-in-battle` | candidate | blocked | `weapon-property-aware-battle-resolution` | broader weapon semantics | Inspiration item `8` |
| `versatile-weapon-die-switching` | candidate | blocked | `battle-hand-occupancy-state` | hand-usage / wield-state semantics | Do not schedule on top of the weak “empty off hand means two-handed” simplification; land explicit hand-occupancy ownership first |
| `battle-spatial-expansion` | facility | blocked | `oa-path-vocabulary` | `hide-stealth-chain`, `forced-movement-vs-oa`, `reach-extends-oa-range` | Current battle spatial model is intentionally narrow |
| `hide-stealth-chain` | candidate | blocked | `battle-spatial-expansion` | visibility/stealth correctness | Inspiration item `11` |
| `forced-movement-vs-oa` | candidate | blocked | `battle-spatial-expansion` | OA legality fidelity | Inspiration item `17` |
| `reach-extends-oa-range` | candidate | blocked | `battle-spatial-expansion` | threat radius fidelity | Inspiration item `22` |
| `max-hp-reduction-state` | facility | complete | none | `max-hp-reduction` | Landed explicit max-HP reduction state in Quint and TS rather than overloading plain `maxHp` |
| `max-hp-reduction` | candidate | complete | `max-hp-reduction-state` | HP-reduction mechanics | Landed first consumer semantics, including effective-max clamping, reduction/restore actions, battle consistency, and targeted tests |
| `generic-per-attack-type-bonus-surface` | candidate | blocked | `closed-modifier-algebra` | reusable modifier semantics | Inspiration item `28` |

## Ready Queue

If scheduling strictly by current value and low dependency risk, outside already-complete runbooks:

1. `battle-hand-occupancy-state`

## Research Queue

Promote these through design/research before trying to package another large execution-grade runbook:

1. `closed-modifier-algebra`
2. `effect-dependency-graph`
3. `battle-spatial-expansion`
4. `battle-spellcast-action-breadth` decomposition
5. `movement-action-surface` decomposition

## Upstream Planning Sources

Use this index before researching or promoting remaining nodes. `DAG.md` is the scheduler; these are the deeper source documents.

- `available-actions-main`, `battle-spellcast-action-breadth`, `movement-action-surface`, `dm-override`, `preview-execution`, `transcript-port-to-dnd`:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [PRD_AVAILABLE_ACTIONS.md](/workspace/typescript/dnd/PRD_AVAILABLE_ACTIONS.md)
  - [PRD_READY_ACTION.md](/workspace/typescript/dnd/PRD_READY_ACTION.md)
- `qualified-damage-typing`, `qualified-physical-damage-bypass`, `weapon-property-aware-battle-resolution`, `versatile-weapon-die-switching`, `off-hand-attack-surface`, `two-weapon-fighting-bonus-attack`:
  - [PRD_ATTACK_PIPELINE.md](/workspace/typescript/dnd/PRD_ATTACK_PIPELINE.md)
  - [PRD_ATTACK_TYPE_AND_ADVANTAGE.md](/workspace/typescript/dnd/PRD_ATTACK_TYPE_AND_ADVANTAGE.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
- `battle-hand-occupancy-state`, `versatile-weapon-die-switching`, future hand-sensitive OA/grapple/spellcasting consumers:
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
  - [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Gaining-and-Casting.md)
- `closed-modifier-algebra`, `generic-per-attack-type-bonus-surface`, `max-hp-reduction-state`, `max-hp-reduction`, `next-hit-rider-consumption`, `effect-dependency-graph`:
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
  - [PRD_PASSIVE_MODIFIERS.md](/workspace/typescript/dnd/PRD_PASSIVE_MODIFIERS.md)
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- `oa-path-vocabulary`, `battle-spatial-expansion`, `hide-stealth-chain`, `forced-movement-vs-oa`, `reach-extends-oa-range`:
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [battle/OPTIONS.md](/workspace/typescript/dnd/battle/OPTIONS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)

## Research Starting Points

Keep these compact and live. Completed historical handoffs belong in runbooks, not here.

### `battle-hand-occupancy-state`

- classification: `execution-grade facility with explicit follow-up scenario`
- owner_layer: battle-owned hand / shield / free-hand facts for hand-sensitive combat semantics
- read_first:
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
  - [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Gaining-and-Casting.md)
- raw_constraints:
  - grapple uses a free hand and is one grapple per hand
  - a hand used to maintain a grapple is busy until the grapple ends
  - a Two-Handed weapon requires two hands when you attack, not continuously
  - a Versatile weapon can be used one- or two-handed, and uses the parenthetical damage only when used with two hands to make a melee attack
  - Somatic components require at least one hand
  - Material components require a free hand, except that the same hand can satisfy Somatic and Material together, or a held focus can substitute where allowed
  - an Opportunity Attack is one melee attack with a weapon or an Unarmed Strike
- promotion_goal:
  - land one authoritative battle state seam that can answer `hasFreeHand`, `shieldOccupiesHand`, `grappleHandsBusy`, and `mainHandAttackUsesTwoHands` without inferring them from `offHandWeapon == null`
- scenario_todo:
  - explicit regression scenario: a caster begins the turn wielding a two-handed or versatile melee weapon, casts a spell with Somatic or Material requirements by freeing a hand, and therefore no longer has the two-handed attack posture for later reaction attacks unless they can re-establish it under explicit modeled rules
  - same scenario must distinguish a true Two-Handed weapon from a Versatile weapon: freeing a hand from a Versatile weapon should imply one-handed follow-up semantics rather than the two-handed damage profile
  - include grapple pressure: a creature with one occupied grapple hand and one weapon hand should not be treated as having two free hands, and double-grapple should remain possible only with two available hands
- explicit_test_target:
  - add deterministic battle tests proving that hand occupancy, spell components, grapple occupancy, and later Opportunity Attack / versatile-damage legality are derived from the same owned state rather than from weapon-slot heuristics

### `closed-modifier-algebra`

- classification: `research / promotion`
- owner_layer: shared runtime/query modifier vocabulary
- read_first:
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
  - [PRD_PASSIVE_MODIFIERS.md](/workspace/typescript/dnd/PRD_PASSIVE_MODIFIERS.md)
  - [PRD_ATTACK_TYPE_AND_ADVANTAGE.md](/workspace/typescript/dnd/PRD_ATTACK_TYPE_AND_ADVANTAGE.md)
  - [.references/inspirations/11-modifier-algebra.md](/workspace/typescript/dnd/.references/inspirations/11-modifier-algebra.md)
- promotion_goal:
  - define the smallest closed modifier algebra that can unblock `generic-per-attack-type-bonus-surface` without introducing an open registry

### `effect-dependency-graph`

- classification: `research / promotion`
- owner_layer: effect lifecycle ownership and teardown
- read_first:
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
  - [.references/inspirations/PLAN.md](/workspace/typescript/dnd/.references/inspirations/PLAN.md)
- promotion_goal:
  - define parent/child effect ownership and teardown semantics tightly enough to make `parent-child-effect-teardown` execution-grade

### `battle-spatial-expansion`

- classification: `research / promotion`
- owner_layer: battle spatial ownership
- read_first:
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [battle/OPTIONS.md](/workspace/typescript/dnd/battle/OPTIONS.md)
  - [.references/inspirations/12-opportunity-attack-path-analysis.md](/workspace/typescript/dnd/.references/inspirations/12-opportunity-attack-path-analysis.md)
- promotion_goal:
  - freeze the minimal spatial facts needed to schedule the first concrete spatial consumers without widening into a full geometry project

### `battle-spellcast-action-breadth`

- classification: `research / decomposition`
- owner_layer: available-actions and battle spell reaction/action surface
- read_first:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [PRD_AVAILABLE_ACTIONS.md](/workspace/typescript/dnd/PRD_AVAILABLE_ACTIONS.md)
  - [PRD_READY_ACTION.md](/workspace/typescript/dnd/PRD_READY_ACTION.md)
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
- promotion_goal:
  - replace the umbrella with the next concrete reaction/action slices instead of scheduling the plan node directly

### `movement-action-surface`

- classification: `research / decomposition`
- owner_layer: supported action product surface
- read_first:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [PRD_AVAILABLE_ACTIONS.md](/workspace/typescript/dnd/PRD_AVAILABLE_ACTIONS.md)
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
- promotion_goal:
  - identify the next concrete movement slices now that `stand-from-prone-in-battle` and OA path vocabulary are already complete

## Maintenance Rules

- Keep only live scheduling nodes here.
- When a node is completed and no longer informs ordering, remove it from the active DAG instead of preserving history.
- When a candidate is blocked, prefer adding the missing `facility` node rather than writing vague prose about “needs more support.”
- If a plan says “X is blocked by missing owned state,” add a concrete facility node for that owned state here.
- Keep `Upstream Planning Sources` synchronized with repo-level PRDs, audits, and feature docs so research starts from the right corpus instead of stale handoff notes.
