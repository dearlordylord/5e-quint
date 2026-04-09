# Plans Dependency DAG

## Purpose

This file is a scheduling artifact.

It exists to answer:

- what is currently active
- what is blocked on what
- what is ready to schedule next

It is intentionally smaller than the full plan corpus. Completed historical redesigns should be removed from the active DAG instead of preserved here forever.

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
available-actions-main
  -> movement-action-surface
  -> dm-override
  -> transcript-port-to-dnd

battle-spellcast-action-breadth
  -> legendary-resistance-fallback

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
  -> fighting-styles-in-battle
  -> versatile-weapon-die-switching

battle-spatial-expansion
  -> hide-stealth-chain
  -> forced-movement-vs-oa
  -> reach-extends-oa-range

max-hp-reduction-state
  -> max-hp-reduction

shared-attack-damage-modifier-surface
  -> generic-per-attack-type-bonus-surface
```

## Node Table

| Node | Kind | Status | Depends on | Unblocks | Notes |
| --- | --- | --- | --- | --- | --- |
| `available-actions-main` | plan | active | none | `movement-action-surface`, `preview-execution`, `battle-spellcast-action-breadth`, `dm-override`, `transcript-port-to-dnd` | Source of truth: [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md) |
| `battle-spellcast-action-breadth` | plan | later | `available-actions-main` | later spell-cast reactions | `CAST_COUNTERSPELL` is already complete; this is the remaining breadth umbrella |
| `legendary-resistance-fallback` | batch | ready | `battle-spellcast-action-breadth` | additional battle interrupt breadth | Fallback only if the next spell-cast reaction batch exposes hidden complexity |
| `movement-action-surface` | plan | later | `available-actions-main` | explicit `cost.movement` bucket | Too broad as a handoff; prefer concrete slices like `stand-from-prone-in-battle` |
| `preview-execution` | batch | ready | `available-actions-main` | no-spend scripted action preview | Inspiration item `34` |
| `dm-override` | plan | later | `available-actions-main` | descriptive-mode legality warnings | Phase 6 in [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md) |
| `transcript-port-to-dnd` | plan | later | `available-actions-main` | end-to-end audio/transcript/action loop | Hellenvald demo + tail facilities already exist; port is still later |
| `same-name-magical-effect-non-stacking` | candidate | ready | none | runtime policy alignment | Inspiration item `6` |
| `exhaustion-d20-penalty` | candidate | ready | none | TS/runtime parity with Quint | Inspiration item `23` |
| `armor-training-disadvantage` | candidate | ready | none | STR/DEX d20 disadvantage wiring | Inspiration item `25` |
| `sneak-attack-any-disadvantage` | candidate | ready | none | correctness win in rogue attack policy | Inspiration item `24` |
| `sneak-attack-once-per-turn-boundary` | candidate | ready | none | battle turn-boundary regression coverage | Inspiration item `4` |
| `stand-from-prone-in-battle` | candidate | ready | none | battle action exposure for standing | Inspiration item `14` |
| `duration-boundary-audit` | candidate | ready | none | timing-sensitive effect regression coverage | Inspiration item `5` |
| `qualified-damage-typing` | facility | blocked | none | `qualified-physical-damage-bypass` | Need `magical` / `silvered` / `adamantine` distinctions |
| `qualified-physical-damage-bypass` | candidate | blocked | `qualified-damage-typing` | monster/effect fidelity | Inspiration item `7` |
| `battle-helped-target-state` | facility | blocked | none | `help-advantage-state` | Need helped-target/help-consumption battle state |
| `help-advantage-state` | candidate | blocked | `battle-helped-target-state` | core action-economy mechanic | Inspiration item `10` |
| `effect-dependency-graph` | facility | blocked | none | `parent-child-effect-teardown` | Need parent/child effect ownership graph |
| `parent-child-effect-teardown` | candidate | blocked | `effect-dependency-graph` | concentration-linked cleanup correctness | Inspiration item `31` |
| `one-shot-rider-consumption-metadata` | facility | blocked | none | `next-hit-rider-consumption` | Need consume-on-next-qualifying-hit metadata |
| `next-hit-rider-consumption` | candidate | blocked | `one-shot-rider-consumption-metadata` | recurring spell/feature semantics | Inspiration item `33` |
| `off-hand-attack-surface` | facility | blocked | none | `two-weapon-fighting-bonus-attack` | Need battle off-hand attack event/action token |
| `two-weapon-fighting-bonus-attack` | candidate | blocked | `off-hand-attack-surface` | battle bonus-action attack support | Inspiration item `3` |
| `weapon-property-aware-battle-resolution` | facility | blocked | none | `fighting-styles-in-battle`, `versatile-weapon-die-switching` | Battle is still weapon-property blind in relevant places |
| `fighting-styles-in-battle` | candidate | blocked | `weapon-property-aware-battle-resolution` | broader weapon semantics | Inspiration item `8` |
| `versatile-weapon-die-switching` | candidate | blocked | `weapon-property-aware-battle-resolution` | hand-usage / wield-state semantics | Inspiration item `13` |
| `battle-spatial-expansion` | facility | blocked | none | `hide-stealth-chain`, `forced-movement-vs-oa`, `reach-extends-oa-range` | Current battle spatial model is intentionally narrow |
| `hide-stealth-chain` | candidate | blocked | `battle-spatial-expansion` | visibility/stealth correctness | Inspiration item `11` |
| `forced-movement-vs-oa` | candidate | blocked | `battle-spatial-expansion` | OA legality fidelity | Inspiration item `17` |
| `reach-extends-oa-range` | candidate | blocked | `battle-spatial-expansion` | threat radius fidelity | Inspiration item `22` |
| `max-hp-reduction-state` | facility | blocked | none | `max-hp-reduction` | Need max-HP modifier/reduction state, not only `maxHp` |
| `max-hp-reduction` | candidate | blocked | `max-hp-reduction-state` | HP-reduction mechanics | Inspiration item `27` |
| `shared-attack-damage-modifier-surface` | facility | blocked | none | `generic-per-attack-type-bonus-surface` | Current bonuses are too ad hoc |
| `generic-per-attack-type-bonus-surface` | candidate | blocked | `shared-attack-damage-modifier-surface` | reusable modifier semantics | Inspiration item `28` |

## Ready Queue

If scheduling strictly by current value and low dependency risk:

1. `sneak-attack-any-disadvantage`
2. `same-name-magical-effect-non-stacking`
3. `exhaustion-d20-penalty`
4. `sneak-attack-once-per-turn-boundary`
5. `stand-from-prone-in-battle`
6. `duration-boundary-audit`
7. `preview-execution`
8. `armor-training-disadvantage`
9. `legendary-resistance-fallback`
10. `movement-action-surface`

## Researched Nodes

### `cast-counterspell`

- classification: `complete / superseded`
- owner_layer: battle action surface (`available-actions.ts` + battle resolution + MCP routing)
- read_first:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts)
  - [available-actions.test.ts](/workspace/typescript/dnd/packages/core/src/available-actions.test.ts)
  - [server.test.ts](/workspace/typescript/dnd/packages/mcp/src/server.test.ts)
- actual_blockers:
  - none for `CAST_COUNTERSPELL` itself
- suggested_first_edit_set:
  - none; this batch already exists end to end in core and MCP tests
- verification:
  - existing discovery and execution tests already cover it in core and MCP

### `sneak-attack-any-disadvantage`

- classification: `light follow-up reading`
- owner_layer: rogue feature policy plus battle attack-context policy
- read_first:
  - [class-rogue.ts](/workspace/typescript/dnd/packages/core/src/features/class-rogue.ts)
  - [class-rogue.test.ts](/workspace/typescript/dnd/packages/core/src/features/class-rogue.test.ts)
  - [battle-machine-actions-attack.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-attack.ts)
  - [battle-rules-scenarios.test.ts](/workspace/typescript/dnd/packages/core/src/battle-rules-scenarios.test.ts)
  - [.references/srd-5.2.1/Classes/Rogue.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Rogue.md)
- actual_blockers:
  - no missing state-model blocker found
  - current TS policy in `canSneakAttack(...)` returns true on `hasAdvantage` before accounting for simultaneous disadvantage
  - battle attack flow likely shares the same early resolution assumption
- suggested_first_edit_set:
  - `packages/core/src/features/class-rogue.ts`
  - `packages/core/src/features/class-rogue.test.ts`
  - `packages/core/src/battle-machine-actions-attack.ts`
  - `packages/core/src/battle-rules-scenarios.test.ts`
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/features/class-rogue.test.ts src/battle-rules-scenarios.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`

### `same-name-magical-effect-non-stacking`

- classification: `light follow-up reading`
- owner_layer: shared effect lifecycle in creature and battle runtime
- read_first:
  - [creature.qnt](/workspace/typescript/dnd/creature.qnt)
  - [dndTest.qnt](/workspace/typescript/dnd/dndTest.qnt)
  - [battle-machine-creature.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-creature.ts)
  - [battle-machine-helpers.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-helpers.ts)
  - [machine.ts](/workspace/typescript/dnd/packages/core/src/machine.ts)
  - [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Gaining-and-Casting.md)
- actual_blockers:
  - no missing facility blocker found
  - Quint already enforces unique `spellId`
  - battle helper `applyOnHitEffect(...)` already replaces by `spellId`
  - creature/battle `addEffect(...)` paths are not fully aligned; `battle-machine-creature.ts:addEffect` still appends
- suggested_first_edit_set:
  - `packages/core/src/battle-machine-creature.ts`
  - `packages/core/src/battle-machine-helpers.ts`
  - `packages/core/src/machine.test.ts`
  - `packages/core/src/battle-rules-scenarios.test.ts`
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/machine.test.ts src/battle-rules-scenarios.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`
  - `pnpm exec quint test --match "same|effect" dndTest.qnt`

### `exhaustion-d20-penalty`

- classification: `light follow-up reading`
- owner_layer: creature query/modifier aggregation
- read_first:
  - [machine-queries.ts](/workspace/typescript/dnd/packages/core/src/machine-queries.ts)
  - [machine.test.ts](/workspace/typescript/dnd/packages/core/src/machine.test.ts)
  - [creature.qnt](/workspace/typescript/dnd/creature.qnt)
  - [dndTest.qnt](/workspace/typescript/dnd/dndTest.qnt)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
- actual_blockers:
  - no missing state blocker found
  - TS comments explicitly say exhaustion penalty is “applied separately,” but the query surface shown in `machine-queries.ts` does not apply it
- suggested_first_edit_set:
  - `packages/core/src/machine-queries.ts`
  - `packages/core/src/machine.test.ts`
  - any direct query consumers that currently assume only advantage/disadvantage/autofail
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/machine.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`
  - `pnpm exec quint test --match "exhaustion_penalty|check_exhaustion|save_exhaustion" dndTest.qnt`

### `armor-training-disadvantage`

- classification: `fuller handoff still needed`
- owner_layer: creature equipment/training state plus d20 aggregation
- read_first:
  - [machine-queries.ts](/workspace/typescript/dnd/packages/core/src/machine-queries.ts)
  - [features/feature-bridge.ts](/workspace/typescript/dnd/packages/core/src/features/feature-bridge.ts)
  - [creature.qnt](/workspace/typescript/dnd/creature.qnt)
  - [dndTest.qnt](/workspace/typescript/dnd/dndTest.qnt)
  - [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md)
  - [.references/srd-5.2.1/Equipment.md](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md)
- actual_blockers:
  - the repo represents armor/training in pieces, but the creature query seam does not appear to own a single authoritative “wearing armor you lack training for” fact
  - `features/feature-bridge.ts` still contains armor-tracking TODOs
- suggested_first_edit_set:
  - start with a design pass on where the authoritative untrained-armor fact should live
  - then update `machine-queries.ts`, bridge/init code, and tests
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/machine.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`
  - `pnpm exec quint test --match "armor" dndTest.qnt`

### `sneak-attack-once-per-turn-boundary`

- classification: `light follow-up reading`
- owner_layer: battle turn semantics
- read_first:
  - [battle-rules-scenarios.test.ts](/workspace/typescript/dnd/packages/core/src/battle-rules-scenarios.test.ts)
  - [battle-machine-actions-turn.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-turn.ts)
  - [battle-machine-actions-movement.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-movement.ts)
  - [battle.qnt](/workspace/typescript/dnd/battle.qnt)
  - [.references/srd-5.2.1/Classes/Rogue.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Rogue.md)
- actual_blockers:
  - no model blocker found
  - there is already substantial battle regression coverage around `sneakAttackUsedThisTurn`; this batch is mostly deterministic edge tightening
- suggested_first_edit_set:
  - `packages/core/src/battle-rules-scenarios.test.ts` first
  - production edits only if the new boundary cases expose drift
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/battle-rules-scenarios.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`
  - battle Tier 1 MBT only if battle semantics actually change

### `stand-from-prone-in-battle`

- classification: `light follow-up reading`
- owner_layer: battle event surface over already-owned creature movement semantics
- read_first:
  - [machine-states.ts](/workspace/typescript/dnd/packages/core/src/machine-states.ts)
  - [machine-helpers.ts](/workspace/typescript/dnd/packages/core/src/machine-helpers.ts)
  - [machine.test.ts](/workspace/typescript/dnd/packages/core/src/machine.test.ts)
  - [battle-machine-events.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-events.ts)
  - [battle-rules-scenarios.test.ts](/workspace/typescript/dnd/packages/core/src/battle-rules-scenarios.test.ts)
- actual_blockers:
  - no semantic blocker found
  - creature-level `STAND_FROM_PRONE` already exists and is tested
  - battle layer appears to lack the surfaced event/action only
- suggested_first_edit_set:
  - `packages/core/src/battle-machine-events.ts`
  - relevant battle turn/movement reducer files
  - `packages/core/src/battle-rules-scenarios.test.ts`
  - optionally `packages/core/src/available-actions.ts` only if this should also become a surfaced movement token
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/battle-rules-scenarios.test.ts src/machine.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`

### `duration-boundary-audit`

- classification: `fuller handoff still needed`
- owner_layer: shared effect timing semantics across creature and battle
- read_first:
  - [.references/inspirations/PLAN.md](/workspace/typescript/dnd/.references/inspirations/PLAN.md)
  - [types.ts](/workspace/typescript/dnd/packages/core/src/types.ts)
  - [battle-machine-creature.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-creature.ts)
  - [machine-startturn.ts](/workspace/typescript/dnd/packages/core/src/machine-startturn.ts)
  - [machine-endturn.ts](/workspace/typescript/dnd/packages/core/src/machine-endturn.ts)
  - [battle-rules-scenarios.test.ts](/workspace/typescript/dnd/packages/core/src/battle-rules-scenarios.test.ts)
  - [machine.test.ts](/workspace/typescript/dnd/packages/core/src/machine.test.ts)
- actual_blockers:
  - not blocked by missing facilities
  - but it is audit-shaped rather than a single sharp regression, so it needs a curated scenario list before implementation
- suggested_first_edit_set:
  - write the concrete audit checklist first
  - add deterministic regressions before touching production code
- verification:
  - `pnpm --filter @dnd/core exec vitest run src/machine.test.ts src/battle-rules-scenarios.test.ts`
  - `pnpm --filter @dnd/core exec tsc --noEmit`
  - Tier 1 MBT only if timing semantics change

### `hellenvald-mock-llm-demo`

- classification: `complete / superseded`
- owner_layer: Hellenvald transcript demo scaffolding
- read_first:
  - [transcript-demo.ts](/workspace/typescript/osr-hellenvald/examples/transcript-demo.ts)
  - [TranscriptInterpreter.ts](/workspace/typescript/osr-hellenvald/src/transcript/TranscriptInterpreter.ts)
- actual_blockers:
  - none found
  - demo mode, fake latency, and `TRANSCRIPT_INTERPRETER_MODE=demo` wiring already exist
- suggested_first_edit_set:
  - none
- verification:
  - existing examples and transcript tests already cover the service boundary

### `movement-action-surface`

- classification: `fuller handoff still needed`
- owner_layer: supported action product surface
- read_first:
  - [available-actions.md](/workspace/typescript/dnd/plans/available-actions.md)
  - [available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts)
  - [battle-machine-events.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-events.ts)
  - [battle-rules-scenarios.test.ts](/workspace/typescript/dnd/packages/core/src/battle-rules-scenarios.test.ts)
- actual_blockers:
  - the node is too broad to be a good handoff
  - the repo has no single agreed first movement token for the action surface
  - `stand-from-prone-in-battle` is the clean concrete slice inside this umbrella
- suggested_first_edit_set:
  - do not schedule this umbrella directly
  - schedule `stand-from-prone-in-battle` first, then decide whether to expose a wider movement bucket
- verification:
  - depends on the chosen concrete movement slice

## Maintenance Rules

- Keep only live scheduling nodes here.
- When a node is completed and no longer informs ordering, remove it from the active DAG instead of preserving history.
- When a candidate is blocked, prefer adding the missing `facility` node rather than writing vague prose about “needs more support.”
- If a plan says “X is blocked by missing owned state,” add a concrete facility node for that owned state here.
