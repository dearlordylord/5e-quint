# Inspiration-Driven Testing Plan

## Purpose

This file is forward-looking only.

- The raw mined inventory lives in [SCENARIO-MINING.md](./SCENARIO-MINING.md).
- Historical batch narrative lives in git history and the regression suites.
- This file answers one question: which mined scenarios are worth doing next with the facilities the repo already has?

It also records a second decision boundary for this workstream:

- which mined items are worth adopting later once missing facilities exist
- which competitor findings should remain design/test input only rather than become product architecture

## Inputs

Read these before promoting any item from the mined backlog into implementation:

1. [ARCHITECTURE.md](../../ARCHITECTURE.md)
2. [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md)
3. [ASSUMPTIONS.md](../../ASSUMPTIONS.md)
4. [battle/DOMAIN.md](../../battle/DOMAIN.md)
5. [battle/REQUIREMENTS.md](../../battle/REQUIREMENTS.md)
6. [SCENARIO-MINING.md](./SCENARIO-MINING.md)

Use the local SRD corpus in [.references/srd-5.2.1/](../srd-5.2.1/) as the authority.

## Current Actionable Subset

> **Note (2026-04-09 audit):** Items 4, 5, 6, 14, 23, 24, 25 and the "Best Next Batch" ordering below are all **complete** — landed in DAG Runbooks 1-3. Items 7, 10, 33, 3, 27 from "Worth Taking Later" are also complete. See `plans/DAG.md` node table for authoritative status.

These mined scenarios were viable without introducing new core facilities. All are now complete.

### 4. Sneak Attack once-per-turn boundary (COMPLETE)

Why it is actionable:

- battle state already carries `sneakAttackUsedThisTurn`
- Sneak Attack already flows through ordinary attacks and opportunity attacks
- the remaining question is deterministic turn-boundary behavior, not architecture

Evidence:

- [battle.qnt](../../battle.qnt)
- [packages/core/src/battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts)
- [packages/core/src/battle-machine-actions-movement.ts](../../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../../packages/core/src/battle-rules-scenarios.test.ts)
- [.references/srd-5.2.1/Classes/Rogue.md](../srd-5.2.1/Classes/Rogue.md)

### 5. Duration boundary audit for timing-sensitive effects

Why it is actionable:

- the shared effect model already has `expiresAt` and `expiryOwnerId`
- current coverage proves some owner-relative timing, but not the full mined audit around start/end-turn persistence
- this is primarily a deterministic regression pass on existing semantics

Evidence:

- [packages/core/src/types.ts](../../packages/core/src/types.ts)
- [packages/core/src/battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/machine.test.ts](../../packages/core/src/machine.test.ts)
- [packages/core/src/battle-rules-scenarios.test.ts](../../packages/core/src/battle-rules-scenarios.test.ts)
- [.references/srd-5.2.1/Spells/Descriptions-S-Z.md](../srd-5.2.1/Spells/Descriptions-S-Z.md)

### 6. Same-name magical effect non-stacking

Why it is actionable:

- effect identity already exists as `spellId`
- Quint already treats duplicate spell ids as an invalid state
- the remaining gap is runtime policy alignment in TS

Evidence:

- [creature.qnt](../../creature.qnt)
- [dndTest.qnt](../../dndTest.qnt)
- [packages/core/src/battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)
- [.references/srd-5.2.1/Spells/Gaining-and-Casting.md](../srd-5.2.1/Spells/Gaining-and-Casting.md)

### 14. Stand from prone costs half movement

Why it is actionable:

- creature-level Quint and TS already model standing and half-speed cost
- the battle layer simply does not expose the action yet

Evidence:

- [creature.qnt](../../creature.qnt)
- [packages/core/src/machine-states.ts](../../packages/core/src/machine-states.ts)
- [packages/core/src/machine.test.ts](../../packages/core/src/machine.test.ts)
- [packages/core/src/battle-machine-events.ts](../../packages/core/src/battle-machine-events.ts)

### 23. Exhaustion d20 penalty in TS/runtime

Why it is actionable:

- Quint already defines and tests the rule
- TS notes that exhaustion is "applied separately" but does not actually wire the penalty through
- no new state shape is needed

Evidence:

- [creature.qnt](../../creature.qnt)
- [dndTest.qnt](../../dndTest.qnt)
- [packages/core/src/machine-queries.ts](../../packages/core/src/machine-queries.ts)
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md)

### 24. Sneak Attack is blocked by any disadvantage

Why it is actionable:

- the repo already carries the needed attack-context facts
- current TS and battle semantics resolve advantage/disadvantage too early for this rule
- this is a policy correction, not a missing-model problem

Evidence:

- [packages/core/src/features/class-rogue.ts](../../packages/core/src/features/class-rogue.ts)
- [packages/core/src/features/class-rogue.test.ts](../../packages/core/src/features/class-rogue.test.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts)
- [battle.qnt](../../battle.qnt)
- [.references/srd-5.2.1/Classes/Rogue.md](../srd-5.2.1/Classes/Rogue.md)

### 25. Armor Training disadvantage on STR/DEX d20 tests

Why it is actionable:

- the repo already represents armor training and already uses it for spellcasting restrictions
- the missing work is to thread the disadvantage rule into attack/check/save aggregation

Evidence:

- [creature.qnt](../../creature.qnt)
- [dndTest.qnt](../../dndTest.qnt)
- [packages/core/src/machine-queries.ts](../../packages/core/src/machine-queries.ts)
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md)

### 34. Dry-run / preview execution for scripted actions

Why it is actionable:

- this is not a Quint rule gap
- the available-actions pipeline already has a clear token/finalization layer where no-spend preview mode can live

Evidence:

- [PRD_AVAILABLE_ACTIONS.md](../../PRD_AVAILABLE_ACTIONS.md)
- [packages/core/src/available-actions.ts](../../packages/core/src/available-actions.ts)

## Best Next Batch (ALL COMPLETE)

All items in this batch were landed in DAG Runbooks 1-3:

1. `24` Sneak Attack blocked by any disadvantage — DONE
2. `6` same-name magical effect non-stacking — DONE
3. `23` exhaustion d20 penalty in TS/runtime — DONE
4. `25` Armor Training disadvantage — DONE
5. `4` Sneak Attack once-per-turn boundary — DONE
6. `14` stand from prone in battle — DONE
7. `5` duration-boundary audit — DONE

Reasoning:

- `24`, `6`, `23`, and `25` are the smallest correctness wins with current state and test infrastructure
- `4` is viable now but slightly more coupled because it touches battle turn semantics
- `14` is straightforward but widens the battle event surface
- `5` is worth doing, but it is an audit batch rather than a single sharp regression

## Worth Taking Later Once Facilities Exist

> **Note (2026-04-09 audit):** Items 7, 10, 33, 3, 27 are now **complete** — landed in DAG Runbooks 2-3.

### Highest-value later promotions

- `7` qualified physical damage bypass — **COMPLETE**
- `10` Help advantage state — **COMPLETE**
- `31` parent/child effect teardown — still blocked on `effect-dependency-graph`
- `33` one-shot next-hit rider consumption — **COMPLETE**

### Good later promotions once battle state grows

- `3` Two-Weapon Fighting bonus-action attack — **COMPLETE**
- `8` fighting styles in battle — still blocked on `closed-modifier-algebra`
- `13` versatile weapon die switching — ready (hand occupancy landed)
- `27` max HP reduction — **COMPLETE**
- `28` generic per-attack-type bonus surface — still blocked on `closed-modifier-algebra`

### Lower-priority later promotions tied to a larger spatial/visibility expansion

- `11` Hide/stealth chain
- `17` forced movement and OA distinction
- `22` reach extends OA range

## Blocked By Missing Facilities

Do not schedule these as the next deterministic batch without first adding the missing model support.

- `3` Two-Weapon Fighting bonus-action attack: battle has no off-hand attack event or surfaced action token.
- `7` qualified physical damage bypass: damage typing lacks `magical` / `silvered` / `adamantine` qualifiers.
- `8` fighting styles in battle: battle attack resolution is still weapon-property blind.
- `10` Help advantage state: no helped-target/help-consumption state exists.
- `11` Hide/stealth chain: no battle-level hidden state or visibility contest model exists.
- `13` versatile weapon die switching: no hand-usage / wield-state in the battle pipeline.
- `17` forced movement and OA distinction: OA is tied to voluntary move events only.
- `22` reach extends OA range: battle spatial model does not represent threat radius beyond caller-supplied adjacency.
- `27` max HP reduction: state only has `maxHp`, not a reduction/modifier field.
- `28` generic per-attack-type bonus surface: current bonuses are ad hoc, not modeled as shared attack/damage modifiers.
- `31` parent/child effect teardown: active effects have no dependency graph.
- `33` one-shot next-hit rider consumption: active effects have no consume-on-next-qualifying-hit metadata.

These are blocked for the next deterministic batch, not rejected in principle. Several of them remain strong later candidates once the missing facilities are added intentionally rather than worked around.

## Competitor Patterns To Use As Input Only

These findings are worth reusing as prompts for state review, deterministic regressions, or vocabulary audits. They are not candidates for direct architectural adoption in this repo.

- Foundry activity and condition inventories
  - use for action-vocabulary review, persisted-field discovery, and condition/effect audit
  - do not import the Foundry document/hook lifecycle
- Avrae effect-lifecycle patterns
  - use for cleanup, duration, concentration-replacement, and preview-vs-spend regression ideas
  - do not import the automation-tree interpreter or scripting architecture
- natural_20 scenario corpus
  - use for deterministic combat and timing scenarios
  - do not import the mutable entity/battle split
- dnd_engine phase vocabulary
  - use to review interrupt windows and modifier decomposition
  - do not import the global mutable registry / event-handler architecture

## Architectural Anti-Backlog

Do not create backlog items whose only goal is to copy competitor engine structure.

- no Foundry-style document lifecycle
- no Avrae-style automation interpreter
- no natural_20-style mutable entity/battle ownership split
- no dnd_engine-style global registry / injected-modifier runtime as a replacement for Quint-owned semantics

The only acceptable promotions from this workstream are:

- RAW-traceable mechanic fixes
- deterministic regression batches
- explicit state-model additions that the SRD actually requires

## Already Covered Or Superseded

These mined items should not drive the next batch.

- `1` ranged attack in melee disadvantage
- `2` unconscious grappler auto-release
- `9` heavy weapon disadvantage: mined note is stale; SRD 5.2.1 uses the current Heavy property rule already implemented here
- `12` unseen target disadvantage
- `16` Dodge benefits end on incapacitation / Speed 0
- `18` cover bonus on Dex saves
- `19` Temporary Hit Points non-stacking
- `20` healing at 0 resets death saves
- `21` cantrip damage scaling
- `26` petrified poison protections are already covered by the current model
- `29` unconscious implies prone
- `30` expanded critical threshold
- `32` concentration replacement on recast

The mined item `15` should not be promoted as written. Under the local SRD 5.2.1 corpus, `Stunned` no longer implies the old speed-zero rule, so the current repo should be treated as aligned there.

## Verification Standard

When an actionable item is promoted into implementation, the batch should:

1. add deterministic tests first
2. trace the rule to local SRD text before changing semantics
3. run the smallest relevant verification set
4. run `/simplify` until convergence after implementation

Use Tier 1 MBT only if the batch changes authoritative battle semantics.
