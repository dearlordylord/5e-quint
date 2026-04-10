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
  -> battle-ready-spell-payload-state
  -> after-damage-trigger-state
  -> runbook6-quint-parity
  -> dm-override
  -> transcript-port-to-dnd

available-actions-main
  -> preview-execution

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

battle-ready-spell-payload-state
  -> battle-ready-spell-surface

after-damage-trigger-state
  -> after-damage-reaction-surface

battle-ready-spell-payload-state
  -> runbook6-quint-parity

after-damage-trigger-state
  -> runbook6-quint-parity

runbook6-quint-parity
  -> dm-override
  -> transcript-port-to-dnd

weapon-property-aware-battle-resolution
  -> battle-hand-occupancy-state
  -> fighting-styles-in-battle

battle-armor-worn-state
  -> defense-fighting-style-in-battle

damage-die-face-resolution
  -> great-weapon-fighting-in-battle

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

authoritative-d20-modifier-query-surface
  -> armor-training-disadvantage
```

## Node Table

| Node | Kind | Status | Depends on | Unblocks | Notes |
| --- | --- | --- | --- | --- | --- |
| `resolve-commit-doctrine` | facility | complete | none | `preview-execution`, `dm-override`, `transcript-port-to-dnd` | Landed in repo architecture/domain docs and battle vocabulary; retain only because later descriptive-mode and transcript work still depend on the doctrine |
| `canonical-condition-effects` | facility | complete | none | `duration-boundary-audit` | Landed canonical condition-consequence ownership in runtime query/types surfaces; keep here only because it still explains why the audit node is now complete |
| `first-class-consumption-model` | facility | complete | none | `preview-execution`, `dm-override` | Landed typed spend/refund/quota vocabulary in available-actions support surfaces; keep here because later action-surface work still builds on it |
| `closed-modifier-algebra` | facility | complete | none | `archery-in-battle`, `two-weapon-fighting-style-in-battle` | Landed as narrow battle-owned concrete fields for Ranged-weapon attack-roll bonuses and Light-property extra-attack ability-modifier damage. Deliberately did not introduce a generic modifier registry or tag-driven system. |
| `oa-path-vocabulary` | facility | complete | none | `movement-provocation-kind`, `reach-extends-oa-range` | Landed in [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md), [battle.qnt](/workspace/typescript/dnd/battle.qnt), and [battle-machine-actions-movement.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-movement.ts); geometry remains caller-owned by design |
| `authoritative-d20-modifier-query-surface` | facility | complete | none | `armor-training-disadvantage` | Landed authoritative d20 modifier/disadvantage query ownership in machine query/types surfaces; keep here because downstream planning still references the seam |
| `available-actions-main` | plan | active | none | `battle-basic-action-surface`, `battle-ready-action-surface`, `battle-ready-spell-surface`, `after-damage-reaction-surface`, `runbook6-quint-parity`, `preview-execution`, `dm-override`, `transcript-port-to-dnd` | Source of truth: [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md). Do not schedule the umbrella directly; schedule the concrete slices below. |
| `legendary-resistance-fallback` | batch | complete | none | additional battle interrupt breadth | Closed as a narrow AoE failed-save regression slice; no separate breadth batch remains to schedule here |
| `battle-basic-action-surface` | candidate | complete | `available-actions-main` | unified projection/execution of `dash`, `disengage`, and `dodge` in battle scope | Landed in core available-actions and MCP with deterministic action-surface coverage |
| `battle-ready-action-surface` | candidate | complete | `available-actions-main` | battle-scoped `READY`, `READY_PASS`, and `READY_RELEASE` action-surface support | Landed in core available-actions and MCP over the existing battle ready window; follow-up simplification can reduce registry boilerplate, but the runbook slice is closed |
| `battle-ready-spell-payload-state` | facility | complete | `available-actions-main` | `battle-ready-spell-surface`, `runbook6-quint-parity` | TS battle state now owns typed readyable-spell save/effect payloads for the modeled ready-spell slice. Authoritative Quint parity is tracked by `runbook6-quint-parity`; do not treat the TS-only shape as final spec ownership. |
| `battle-ready-spell-surface` | candidate | complete | `available-actions-main`, `battle-ready-spell-payload-state` | battle-scoped `READY_SPELL` and `READY_SPELL_RELEASE` action-surface support | Landed in core available-actions and MCP with per-spell tokens, slot-level choice holes, target holes, and battle-owned event finalization. |
| `after-damage-trigger-state` | facility | complete | `available-actions-main` | `after-damage-reaction-surface`, `runbook6-quint-parity` | TS battle state now carries after-damage trigger qualifiers plus narrow reactive active-effect payloads. `battle.qnt` mirrors the attack-derived qualifier shape for Hellish Rebuke and Retaliation; Fire Shield reactive payload parity remains tracked by `runbook6-quint-parity`. |
| `after-damage-reaction-surface` | candidate | complete | `available-actions-main`, `after-damage-trigger-state` | battle-scoped `PIAfterDamage` reaction discovery/execution such as Hellish Rebuke / Fire Shield / Retaliation | Landed in core available-actions and MCP for Hellish Rebuke, Retaliation, and Fire Shield from owned trigger/effect facts without adding a generic reaction registry. |
| `runbook6-quint-parity` | batch | active | `battle-ready-spell-payload-state`, `after-damage-trigger-state` | `dm-override`, `transcript-port-to-dnd` | Spec-first follow-up for Runbook 6. Ready-spell payload derivation and attack-derived Hellish Rebuke/Retaliation trigger qualifiers are mirrored in `battle.qnt`; Fire Shield reactive active-effect payload semantics remain before product consumers rely on Runbook 6 as fully authoritative battle ownership. |
| `preview-execution` | batch | complete | `available-actions-main`, `resolve-commit-doctrine`, `first-class-consumption-model` | no-spend scripted action preview | Landed end to end in core and MCP; retain only because later descriptive-mode/transcript work still depends on the doctrine/model it consumed |
| `dm-override` | plan | later | `available-actions-main`, `runbook6-quint-parity`, `resolve-commit-doctrine`, `first-class-consumption-model` | descriptive-mode legality warnings | Phase 6 in [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md). Do not promote until Runbook 6's TS/MCP action-surface facts have Quint parity. |
| `transcript-port-to-dnd` | plan | later | `available-actions-main`, `runbook6-quint-parity`, `resolve-commit-doctrine` | end-to-end audio/transcript/action loop | Hellenvald demo + tail facilities already exist; port is still later, and should not promote while Runbook 6 action-surface facts are TS-only. |
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
| `effect-dependency-graph` | facility | complete | none | `parent-child-effect-teardown` | Landed parent spell/caster dependency metadata on active effects, with MBT normalization updated. |
| `parent-child-effect-teardown` | candidate | complete | `effect-dependency-graph` | concentration-linked cleanup correctness | Concentration teardown now removes the parent effect plus dependents without deleting another caster's same-spell effect. |
| `one-shot-rider-consumption-metadata` | facility | complete | none | `next-hit-rider-consumption` | Landed consume-on-next-qualifying-hit metadata and consumption hooks without widening to the full downstream rider batch |
| `next-hit-rider-consumption` | candidate | complete | `one-shot-rider-consumption-metadata` | recurring spell/feature semantics | Landed battle consumption of qualifying next-hit rider effects with deterministic regression coverage |
| `off-hand-attack-surface` | facility | complete | none | `two-weapon-fighting-bonus-attack` | Battle off-hand attack event/action surface landed in Quint and TS battle machines |
| `two-weapon-fighting-bonus-attack` | candidate | complete | `off-hand-attack-surface` | battle bonus-action attack support | Landed the light-weapon bonus-action off-hand attack slice; fighting-style modifiers remain separate follow-up work |
| `weapon-property-aware-battle-resolution` | facility | complete | none | `battle-hand-occupancy-state`, `fighting-styles-in-battle` | Battle attack resolution now consumes weapon-property ownership for immediate combat semantics |
| `battle-hand-occupancy-state` | facility | complete | `weapon-property-aware-battle-resolution` | `versatile-weapon-die-switching` | Landed explicit battle-owned hand occupancy for weapons, shields, grapples, and spell-component legality |
| `archery-in-battle` | candidate | complete | `closed-modifier-algebra` | partial `fighting-styles-in-battle` progress | Landed through the narrow battle-owned `rangedWeaponAttackRollBonus` field, with TS fighter content projecting the specific +2 and regressions proving the bonus does not affect natural critical-hit range |
| `two-weapon-fighting-style-in-battle` | candidate | complete | `closed-modifier-algebra`, `off-hand-attack-surface` | partial `fighting-styles-in-battle` progress | Landed through the battle-owned Light-property extra-attack damage flag, preserving negative ability-modifier behavior and positive-modifier omission when the style is absent |
| `battle-armor-worn-state` | facility | complete | none | `defense-fighting-style-in-battle` | Landed the smallest battle-owned `isWearingArmor` fact needed by Defense; no armor inventory/don/doff system added. |
| `defense-fighting-style-in-battle` | candidate | complete | `battle-armor-worn-state` | partial `fighting-styles-in-battle` progress | Defense now contributes through named `defenseArmorClassBonus`, guarded by battle-owned armor-worn state. |
| `damage-die-face-resolution` | facility | complete | `battle-hand-occupancy-state`, `weapon-property-aware-battle-resolution` | `great-weapon-fighting-in-battle` | Landed explicit weapon damage die-face event data for battle attacks; eligible GWF attacks require per-die faces rather than aggregate-only damage. |
| `great-weapon-fighting-in-battle` | candidate | complete | `damage-die-face-resolution` | partial `fighting-styles-in-battle` progress | Concrete Great Weapon Fighting consumer landed: Melee weapon held with two hands, Two-Handed or Versatile property, treat 1/2 weapon damage dice as 3. |
| `fighting-styles-in-battle` | candidate | later | future style-specific ownership facts | broader weapon semantics | Keep decomposed. The Runbook 5 and 7 concrete consumers landed without needing a broad umbrella or generic modifier registry. |
| `versatile-weapon-die-switching` | candidate | complete | `battle-hand-occupancy-state` | hand-usage / wield-state semantics | Landed in Quint and TS attack resolution with deterministic one-hand/two-hand regression coverage plus spellcasting grip-relaxation coverage |
| `movement-provocation-kind` | facility | complete | `oa-path-vocabulary` | `forced-movement-vs-oa` | Landed explicit movement provocation kind in battle Quint/TS plus battle domain docs; voluntary and non-provoking movement no longer share the same event meaning |
| `battle-hidden-state` | facility | complete | none | `hide-stealth-chain` | Landed combatant-owned `hiddenDiscoveryDc` state; cover/obscurement/line-of-sight remain caller-provided facts. |
| `hide-stealth-chain` | candidate | complete | `battle-hidden-state` | visibility/stealth correctness | Hide/Search, hidden attacker reveal, unseen-attacker advantage, and verbal-spell reveal landed without a geometry engine. |
| `forced-movement-vs-oa` | candidate | complete | `movement-provocation-kind` | OA legality fidelity | Landed deterministic non-provoking-movement coverage and Quint/TS movement-contract parity |
| `reach-extends-oa-range` | candidate | complete | `oa-path-vocabulary` | threat radius fidelity | Landed deterministic coverage that reach-sensitive OAs are not hardcoded to 5 feet, including prone-sensitive attack-context handling |
| `max-hp-reduction-state` | facility | complete | none | `max-hp-reduction` | Landed explicit max-HP reduction state in Quint and TS rather than overloading plain `maxHp` |
| `max-hp-reduction` | candidate | complete | `max-hp-reduction-state` | HP-reduction mechanics | Landed first consumer semantics, including effective-max clamping, reduction/restore actions, battle consistency, and targeted tests |
| `generic-per-attack-type-bonus-surface` | candidate | later | real multi-source attack-bonus composition pressure | reusable modifier semantics | Do not promote from Runbook 5 alone. The concrete Archery/TWF consumers favored named battle-owned fields over a reusable modifier abstraction. |

## Ready Queue

If scheduling strictly by current value and low dependency risk, outside already-complete runbooks:

- `runbook6-quint-parity`
- Runbook 7 is complete. No Runbook 7 nodes remain in the ready queue.

## Research Queue

Promote these through design/research before trying to package another large execution-grade runbook:

1. `fighting-styles-in-battle` umbrella cleanup after Runbook 7's concrete consumers land
2. `dm-override` / `transcript-port-to-dnd` only after `runbook6-quint-parity` lands

## Upstream Planning Sources

Use this index before researching or promoting remaining nodes. `DAG.md` is the scheduler; these are the deeper source documents.

- `available-actions-main`, `battle-basic-action-surface`, `battle-ready-action-surface`, `battle-ready-spell-payload-state`, `battle-ready-spell-surface`, `after-damage-trigger-state`, `after-damage-reaction-surface`, `dm-override`, `preview-execution`, `transcript-port-to-dnd`:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [PRD_AVAILABLE_ACTIONS.md](/workspace/typescript/dnd/PRD_AVAILABLE_ACTIONS.md)
  - [PRD_READY_ACTION.md](/workspace/typescript/dnd/PRD_READY_ACTION.md)
- `runbook6-quint-parity`:
  - [DAG_RUNBOOK_6.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_6.md)
  - [battle.qnt](/workspace/typescript/dnd/battle.qnt)
  - [packages/core/src/battle-machine-types.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-types.ts)
  - [packages/core/src/battle-projection.mbt.test.ts](/workspace/typescript/dnd/packages/core/src/battle-projection.mbt.test.ts)
- `qualified-damage-typing`, `qualified-physical-damage-bypass`, `weapon-property-aware-battle-resolution`, `versatile-weapon-die-switching`, `off-hand-attack-surface`, `two-weapon-fighting-bonus-attack`, `fighting-styles-in-battle`:
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
- `battle-armor-worn-state`, `defense-fighting-style-in-battle`, `damage-die-face-resolution`, `great-weapon-fighting-in-battle`:
  - [DAG_RUNBOOK_7.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_7.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Feats.md](/workspace/typescript/dnd/.references/srd-5.2.1/Feats.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
- `battle-hand-occupancy-state`, `versatile-weapon-die-switching`, future hand-sensitive OA/grapple/spellcasting consumers:
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
  - [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Gaining-and-Casting.md)
- `generic-per-attack-type-bonus-surface`, `max-hp-reduction-state`, `max-hp-reduction`, `next-hit-rider-consumption`, `effect-dependency-graph`:
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- `oa-path-vocabulary`, `movement-provocation-kind`, `battle-hidden-state`, `hide-stealth-chain`, `forced-movement-vs-oa`, `reach-extends-oa-range`:
  - [DAG_RUNBOOK_7.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_7.md)
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [battle/OPTIONS.md](/workspace/typescript/dnd/battle/OPTIONS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
  - [.references/srd-5.2.1/Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md)

## Research Starting Points

Keep these compact and live. Completed historical handoffs belong in runbooks, not here.

### `effect-dependency-graph`

- classification: `promoted / runbook 7`
- owner_layer: effect lifecycle ownership and teardown
- read_first:
  - [DAG_RUNBOOK_7.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_7.md)
  - [PLAN_AUDIT.md](/workspace/typescript/dnd/PLAN_AUDIT.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
  - [.references/inspirations/PLAN.md](/workspace/typescript/dnd/.references/inspirations/PLAN.md)
- execution_goal:
  - implement parent/child effect ownership and teardown semantics tightly enough to close `parent-child-effect-teardown`

### `battle-ready-spell-payload-state`

- classification: `complete / TS+MCP landed; Quint ready-payload parity mirrored`
- owner_layer: battle-owned readied-spell payload metadata
- read_first:
  - [DAG_RUNBOOK_6.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_6.md)
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [PRD_READY_ACTION.md](/workspace/typescript/dnd/PRD_READY_ACTION.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [packages/core/src/available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts)
- execution_goal:
  - landed the smallest battle-owned spell save/effect payload facts needed to expose `READY_SPELL` and `READY_SPELL_RELEASE` honestly through available-actions / MCP
  - Quint parity: `battle.qnt` now derives modeled ready-spell payload facts from spell identity and slot level instead of caller-provided opaque save/effect values

### `after-damage-trigger-state`

- classification: `complete / TS+MCP landed; Quint trigger parity partly mirrored`
- owner_layer: battle-owned after-damage reaction trigger facts
- read_first:
  - [DAG_RUNBOOK_6.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_6.md)
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [packages/core/src/battle-machine-helpers.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-helpers.ts)
- execution_goal:
  - landed the smallest owned trigger qualifiers and stored reactive effect choice facts needed to surface `PIAfterDamage` reactions honestly without inventing a generic registry
  - Quint parity: `battle.qnt` now carries explicit source-visible/source-within-5ft/source-within-60ft/melee-hit trigger facts for attack-derived after-damage windows used by Hellish Rebuke and Retaliation
  - follow-up: mirror Fire Shield's active-effect reactive payload in `creature.qnt`/`battle.qnt` if the authoritative spec surface needs that automatic effect fully visible

### `runbook6-quint-parity`

- classification: `active / partial spec parity`
- owner_layer: `battle.qnt` authoritative combat spec plus MBT bridge
- read_first:
  - [DAG_RUNBOOK_6.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_6.md)
  - [battle.qnt](/workspace/typescript/dnd/battle.qnt)
  - [packages/core/src/battle-machine-types.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-types.ts)
  - [packages/core/src/battle-projection.mbt.test.ts](/workspace/typescript/dnd/packages/core/src/battle-projection.mbt.test.ts)
- execution_goal:
  - complete: Runbook 6's TS/MCP readyable spell payload ownership is mirrored into Quint so `BATTLE_READY_SPELL` uses modeled spell payload facts instead of caller-fabricated save/effect parameters at the spec layer
  - complete: Runbook 6's attack-derived after-damage trigger qualifiers are mirrored into Quint and MBT bridge/tests for Hellish Rebuke and Retaliation
  - remaining: mirror Fire Shield's reactive active-effect payload semantics into `creature.qnt`/`battle.qnt` if product consumers need that automatic effect fully spec-visible

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

### `battle-armor-worn-state`

- classification: `promoted / runbook 7`
- owner_layer: battle-owned armor-worn facts
- read_first:
  - [DAG_RUNBOOK_7.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_7.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Feats.md](/workspace/typescript/dnd/.references/srd-5.2.1/Feats.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
- execution_goal:
  - implement the smallest battle-owned Light/Medium/Heavy armor-worn fact needed to close `defense-fighting-style-in-battle`

### `damage-die-face-resolution`

- classification: `promoted / runbook 7`
- owner_layer: battle-owned weapon damage die-face facts
- read_first:
  - [DAG_RUNBOOK_7.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_7.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/srd-5.2.1/Feats.md](/workspace/typescript/dnd/.references/srd-5.2.1/Feats.md)
  - [packages/core/src/battle-machine-actions-attack.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-attack.ts)
- execution_goal:
  - implement the smallest battle-owned weapon damage die-face shape needed to close `great-weapon-fighting-in-battle`

### `battle-hidden-state`

- classification: `promoted / runbook 7`
- owner_layer: battle-owned visibility / hidden-state semantics
- read_first:
  - [DAG_RUNBOOK_7.md](/workspace/typescript/dnd/plans/DAG_RUNBOOK_7.md)
  - [battle/DOMAIN.md](/workspace/typescript/dnd/battle/DOMAIN.md)
  - [battle/REQUIREMENTS.md](/workspace/typescript/dnd/battle/REQUIREMENTS.md)
  - [FEATURES.md](/workspace/typescript/dnd/FEATURES.md)
  - [.references/inspirations/12-opportunity-attack-path-analysis.md](/workspace/typescript/dnd/.references/inspirations/12-opportunity-attack-path-analysis.md)
- execution_goal:
  - implement the smallest battle-owned hidden/seen state that can support `hide-stealth-chain` without widening into a full grid/geometry model

## Maintenance Rules

- Keep only live scheduling nodes here.
- When a node is completed and no longer informs ordering, remove it from the active DAG instead of preserving history.
- When a candidate is blocked, prefer adding the missing `facility` node rather than writing vague prose about “needs more support.”
- If a plan says “X is blocked by missing owned state,” add a concrete facility node for that owned state here.
- Keep `Upstream Planning Sources` synchronized with repo-level PRDs, audits, and feature docs so research starts from the right corpus instead of stale handoff notes.
