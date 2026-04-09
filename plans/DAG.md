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
  -> dm-override
  -> transcript-port-to-dnd

canonical-condition-effects
  -> duration-boundary-audit

first-class-consumption-model
  -> preview-execution
  -> dm-override

available-actions-main
  -> battle-basic-action-surface
  -> battle-ready-action-surface
  -> battle-ready-spell-surface
  -> after-damage-reaction-surface
  -> dm-override
  -> transcript-port-to-dnd

available-actions-main
  -> preview-execution

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
  -> movement-provocation-kind
  -> reach-extends-oa-range

movement-provocation-kind
  -> forced-movement-vs-oa

battle-hidden-state
  -> hide-stealth-chain

max-hp-reduction-state
  -> max-hp-reduction

closed-modifier-algebra
  -> archery-in-battle
  -> two-weapon-fighting-style-in-battle
  -> generic-per-attack-type-bonus-surface

archery-in-battle
  -> fighting-styles-in-battle

two-weapon-fighting-style-in-battle
  -> fighting-styles-in-battle

authoritative-d20-modifier-query-surface
  -> armor-training-disadvantage
```

## Node Table

| Node | Kind | Status | Depends on | Unblocks | Notes |
| --- | --- | --- | --- | --- | --- |
| `resolve-commit-doctrine` | facility | complete | none | `preview-execution`, `dm-override`, `transcript-port-to-dnd` | Landed in repo architecture/domain docs and battle vocabulary; retain only because later descriptive-mode and transcript work still depend on the doctrine |
| `canonical-condition-effects` | facility | complete | none | `duration-boundary-audit` | Landed canonical condition-consequence ownership in runtime query/types surfaces; keep here only because it still explains why the audit node is now complete |
| `first-class-consumption-model` | facility | complete | none | `preview-execution`, `dm-override` | Landed typed spend/refund/quota vocabulary in available-actions support surfaces; keep here because later action-surface work still builds on it |
| `closed-modifier-algebra` | facility | ready | none | `archery-in-battle`, `two-weapon-fighting-style-in-battle`, `generic-per-attack-type-bonus-surface` | Ready as a narrow battle-owned additive modifier seam. Keep it concrete: introduce only the closed fields needed by the first real consumers, not a generic modifier registry or tag-driven system. |
| `oa-path-vocabulary` | facility | complete | none | `movement-provocation-kind`, `reach-extends-oa-range` | Landed in [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md), [battle.qnt](/workspace/typescript/dnd/battle.qnt), and [battle-machine-actions-movement.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-movement.ts); geometry remains caller-owned by design |
| `authoritative-d20-modifier-query-surface` | facility | complete | none | `armor-training-disadvantage` | Landed authoritative d20 modifier/disadvantage query ownership in machine query/types surfaces; keep here because downstream planning still references the seam |
| `available-actions-main` | plan | active | none | `battle-basic-action-surface`, `battle-ready-action-surface`, `battle-ready-spell-surface`, `after-damage-reaction-surface`, `preview-execution`, `dm-override`, `transcript-port-to-dnd` | Source of truth: [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md). Do not schedule the umbrella directly; schedule the concrete slices below. |
| `legendary-resistance-fallback` | batch | complete | none | additional battle interrupt breadth | Closed as a narrow AoE failed-save regression slice; no separate breadth batch remains to schedule here |
| `battle-basic-action-surface` | candidate | ready | `available-actions-main` | unified projection/execution of `dash`, `disengage`, and `dodge` in battle scope | Battle semantics and events already exist; the remaining work is available-actions / MCP projection and deterministic coverage |
| `battle-ready-action-surface` | candidate | ready | `available-actions-main` | battle-scoped `READY`, `READY_PASS`, and `READY_RELEASE` action-surface support | Ready semantics are already implemented in battle Quint/TS; the gap is honest projection/execution through the unified action surface |
| `battle-ready-spell-surface` | candidate | ready | `available-actions-main` | battle-scoped `READY_SPELL` and `READY_SPELL_RELEASE` action-surface support | Readied spells, slot expenditure, concentration holding, and Counterspell-on-release already exist in battle semantics; the gap is action-surface exposure |
| `after-damage-reaction-surface` | candidate | ready | `available-actions-main` | battle-scoped `PIAfterDamage` reaction discovery/execution such as Hellish Rebuke / Fire Shield / Retaliation | `PIAfterDamage` and corresponding battle events already exist; the action surface currently ignores them |
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
| `effect-dependency-graph` | facility | blocked | none | `parent-child-effect-teardown` | Still design-first. Current effect identity is `spellId`/`casterId` plus owner-relative expiry; parent/child teardown needs explicit effect identity and parent linkage, not just more helper code. |
| `parent-child-effect-teardown` | candidate | blocked | `effect-dependency-graph` | concentration-linked cleanup correctness | Inspiration item `31` |
| `one-shot-rider-consumption-metadata` | facility | complete | none | `next-hit-rider-consumption` | Landed consume-on-next-qualifying-hit metadata and consumption hooks without widening to the full downstream rider batch |
| `next-hit-rider-consumption` | candidate | complete | `one-shot-rider-consumption-metadata` | recurring spell/feature semantics | Landed battle consumption of qualifying next-hit rider effects with deterministic regression coverage |
| `off-hand-attack-surface` | facility | complete | none | `two-weapon-fighting-bonus-attack` | Battle off-hand attack event/action surface landed in Quint and TS battle machines |
| `two-weapon-fighting-bonus-attack` | candidate | complete | `off-hand-attack-surface` | battle bonus-action attack support | Landed the light-weapon bonus-action off-hand attack slice; fighting-style modifiers remain separate follow-up work |
| `weapon-property-aware-battle-resolution` | facility | complete | none | `battle-hand-occupancy-state`, `fighting-styles-in-battle` | Battle attack resolution now consumes weapon-property ownership for immediate combat semantics |
| `battle-hand-occupancy-state` | facility | complete | `weapon-property-aware-battle-resolution` | `versatile-weapon-die-switching` | Landed explicit battle-owned hand occupancy for weapons, shields, grapples, and spell-component legality |
| `archery-in-battle` | candidate | blocked | `closed-modifier-algebra` | `fighting-styles-in-battle` | Best first fighting-style consumer: pure +2 bonus to attack rolls with Ranged weapons already exists in content and maps cleanly onto battle attack resolution without new armor or die-face state |
| `two-weapon-fighting-style-in-battle` | candidate | blocked | `closed-modifier-algebra`, `off-hand-attack-surface` | `fighting-styles-in-battle` | Best second consumer: SRD-backed, already has a content helper, and plugs directly into the battle-owned off-hand damage branch without needing armor state or die-face reroll ownership |
| `fighting-styles-in-battle` | candidate | blocked | `weapon-property-aware-battle-resolution` | broader weapon semantics | Inspiration item `8` |
| `versatile-weapon-die-switching` | candidate | ready | `battle-hand-occupancy-state` | hand-usage / wield-state semantics | Now schedulable: use explicit hand occupancy rather than the old “empty off hand means two-handed” shortcut |
| `movement-provocation-kind` | facility | ready | `oa-path-vocabulary` | `forced-movement-vs-oa` | Minimal spatial growth: encode whether a movement step provokes OAs instead of letting voluntary and forced movement share the same event semantics |
| `battle-hidden-state` | facility | blocked | none | `hide-stealth-chain` | Hide/stealth needs explicit hidden/seen battle state; it should not be bundled into OA/reach work now that OA path vocabulary is already caller-owned |
| `hide-stealth-chain` | candidate | blocked | `battle-hidden-state` | visibility/stealth correctness | Inspiration item `11` |
| `forced-movement-vs-oa` | candidate | ready | `movement-provocation-kind` | OA legality fidelity | Once movement-provocation kind exists, the remaining work is a narrow legality correction and deterministic OA regression coverage |
| `reach-extends-oa-range` | candidate | ready | `oa-path-vocabulary` | threat radius fidelity | Caller-owned threat sets already encode reach-exit checkpoints; the remaining work is deterministic coverage proving reach is not hardcoded to 5 feet |
| `max-hp-reduction-state` | facility | complete | none | `max-hp-reduction` | Landed explicit max-HP reduction state in Quint and TS rather than overloading plain `maxHp` |
| `max-hp-reduction` | candidate | complete | `max-hp-reduction-state` | HP-reduction mechanics | Landed first consumer semantics, including effective-max clamping, reduction/restore actions, battle consistency, and targeted tests |
| `generic-per-attack-type-bonus-surface` | candidate | blocked | `closed-modifier-algebra` | reusable modifier semantics | Inspiration item `28` |

## Ready Queue

If scheduling strictly by current value and low dependency risk, outside already-complete runbooks:

1. `versatile-weapon-die-switching`
2. `battle-basic-action-surface`
3. `battle-ready-action-surface`
4. `battle-ready-spell-surface`
5. `after-damage-reaction-surface`
6. `movement-provocation-kind`
7. `forced-movement-vs-oa`
8. `reach-extends-oa-range`
9. `closed-modifier-algebra`

## Research Queue

Promote these through design/research before trying to package another large execution-grade runbook:

1. `effect-dependency-graph`
2. `fighting-styles-in-battle`
3. `battle-hidden-state`
4. `dm-override` / `transcript-port-to-dnd` only after the product-surface slices above are landed

## Upstream Planning Sources

Use this index before researching or promoting remaining nodes. `DAG.md` is the scheduler; these are the deeper source documents.

- `available-actions-main`, `battle-basic-action-surface`, `battle-ready-action-surface`, `battle-ready-spell-surface`, `after-damage-reaction-surface`, `dm-override`, `preview-execution`, `transcript-port-to-dnd`:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [PRD_AVAILABLE_ACTIONS.md](/workspace/typescript/dnd/PRD_AVAILABLE_ACTIONS.md)
  - [PRD_READY_ACTION.md](/workspace/typescript/dnd/PRD_READY_ACTION.md)
- `qualified-damage-typing`, `qualified-physical-damage-bypass`, `weapon-property-aware-battle-resolution`, `versatile-weapon-die-switching`, `off-hand-attack-surface`, `two-weapon-fighting-bonus-attack`, `archery-in-battle`, `two-weapon-fighting-style-in-battle`, `fighting-styles-in-battle`:
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
- `battle-hand-occupancy-state`, `versatile-weapon-die-switching`, future hand-sensitive OA/grapple/spellcasting consumers:
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
  - [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Gaining-and-Casting.md)
- `closed-modifier-algebra`, `generic-per-attack-type-bonus-surface`, `max-hp-reduction-state`, `max-hp-reduction`, `next-hit-rider-consumption`, `effect-dependency-graph`:
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- `oa-path-vocabulary`, `movement-provocation-kind`, `battle-hidden-state`, `hide-stealth-chain`, `forced-movement-vs-oa`, `reach-extends-oa-range`:
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [battle/OPTIONS.md](/workspace/typescript/dnd/battle/OPTIONS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)

## Research Starting Points

Keep these compact and live. Completed historical handoffs belong in runbooks, not here.

### `closed-modifier-algebra`

- classification: `ready execution facility`
- owner_layer: battle-owned additive modifier vocabulary
- read_first:
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
  - [.references/inspirations/11-modifier-algebra.md](/workspace/typescript/dnd/.references/inspirations/11-modifier-algebra.md)
- promotion_goal:
  - freeze the smallest closed additive field set that can unblock `archery-in-battle` and `two-weapon-fighting-style-in-battle` without introducing an open registry

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

### `fighting-styles-in-battle`

- classification: `research / decomposition`
- owner_layer: battle attack/damage/AC pipelines plus fighter style content
- read_first:
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [packages/core/src/features/class-fighter.ts](/workspace/typescript/dnd/packages/core/src/features/class-fighter.ts)
  - [packages/core/src/battle-machine-actions-attack.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-attack.ts)
  - [packages/core/src/battle-machine-creature.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-creature.ts)
- promotion_goal:
  - split the umbrella into concrete style consumers instead of inventing a general-purpose modifier algebra prematurely

### `archery-in-battle`

- classification: `likely first runbook-5 consumer`
- owner_layer: battle attack-roll pipeline
- read_first:
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [packages/core/src/features/class-fighter.ts](/workspace/typescript/dnd/packages/core/src/features/class-fighter.ts)
  - [packages/core/src/battle-machine-actions-attack.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-attack.ts)
- promotion_goal:
  - wire the existing +2 ranged attack bonus into battle attack resolution through a narrow battle-owned additive-modifier seam

### `two-weapon-fighting-style-in-battle`

- classification: `possible runbook-5 consumer`
- owner_layer: battle off-hand damage pipeline
- read_first:
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [packages/core/src/features/class-fighter.ts](/workspace/typescript/dnd/packages/core/src/features/class-fighter.ts)
  - [packages/core/src/battle-machine-actions-turn.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-turn.ts)
- promotion_goal:
  - wire the existing style helper so the Light-property bonus attack can add the ability modifier to damage when the style is present

### `battle-hidden-state`

- classification: `research / promotion`
- owner_layer: battle-owned visibility / hidden-state semantics
- read_first:
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/inspirations/12-opportunity-attack-path-analysis.md](/workspace/typescript/dnd/.references/inspirations/12-opportunity-attack-path-analysis.md)
- promotion_goal:
  - define the smallest battle-owned hidden/seen state that can support `hide-stealth-chain` without widening into a full grid/geometry model

## Maintenance Rules

- Keep only live scheduling nodes here.
- When a node is completed and no longer informs ordering, remove it from the active DAG instead of preserving history.
- When a candidate is blocked, prefer adding the missing `facility` node rather than writing vague prose about “needs more support.”
- If a plan says “X is blocked by missing owned state,” add a concrete facility node for that owned state here.
- Keep `Upstream Planning Sources` synchronized with repo-level PRDs, audits, and feature docs so research starts from the right corpus instead of stale handoff notes.
