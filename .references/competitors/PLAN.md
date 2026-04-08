# Competitor-Driven Testing Plan

## Goal

Use the clearest, most engine-like competitor behaviors as prompts for high-value SRD 5.2.1 regression tests, without treating competitor code as an authority.

The point of this workstream is:

- find mechanic interactions that are easy to miss in our spec/runtime,
- turn them into deterministic tests first,
- then validate parity with MBT,
- and only expand architecture when a competitor case exposes a real modeling gap.

This is downstream of the project purpose in [ARCHITECTURE.md](/workspace/typescript/dnd-competitor-tests-batch-1/ARCHITECTURE.md): the real target is still Quint proof + XState parity for SRD 5.2.1 combat.

## Why This Work Exists

Earlier competitor research showed:

- competitors are useful as sources of scenario ideas, state/action vocabulary, and tricky interaction patterns,
- competitors are not useful as correctness oracles,
- the fastest value comes from converting their strong examples into our own RAW-traceable tests.

That led to a small-step worktree strategy:

- batch 1: creature-layer scenarios already close to our current model,
- batch 2: battle-layer scenarios already supported by current reaction architecture,
- defer any case that requires broader state/effect changes until it is isolated as the next deliberate batch.

## Domain Reading List

Read these before changing anything:

1. [ARCHITECTURE.md](/workspace/typescript/dnd-competitor-tests-batch-1/ARCHITECTURE.md)
2. [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd-competitor-tests-batch-1/UBIQUITOUS_LANGUAGE.md)
3. [ASSUMPTIONS.md](/workspace/typescript/dnd-competitor-tests-batch-1/ASSUMPTIONS.md)
4. [battle/DOMAIN.md](/workspace/typescript/dnd-competitor-tests-batch-1/battle/DOMAIN.md)
5. [battle/REQUIREMENTS.md](/workspace/typescript/dnd-competitor-tests-batch-1/battle/REQUIREMENTS.md)

For the rules involved in this workstream, use:

- [.references/srd-5.2.1/Playing-the-Game.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Playing-the-Game.md)
- [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Spells/Descriptions-Q-R.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Spells/Descriptions-Q-R.md)
- [.references/srd-5.2.1/Spells/Descriptions-S-Z.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Spells/Descriptions-S-Z.md)

Relevant RAW passages:

- death saving throw, stable, instant death
- resistance and vulnerability order of application
- grapple / grappled / incapacitated ending a grapple
- reaction limits
- opportunity attacks
- Shield
- Shocking Grasp
- Ray of Frost

## What We Implemented

### Batch 1: Creature-Level Clear Wins

File:

- [packages/core/src/competitor-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-scenarios.test.ts)

Added competitor-sourced creature regressions for:

- death save failure progression to death,
- stabilization and reset of the death-save track,
- natural 20 recovery to 1 HP and consciousness,
- damage breaking stability,
- resistance,
- vulnerability,
- resistance then vulnerability in RAW order,
- grapple apply,
- grapple auto-success versus an incapacitated target,
- grapple escape,
- manual release of grapple.

Why these first:

- they already mapped cleanly onto existing creature state and events,
- they were directly motivated by competitor scenario mining,
- they gave immediate regression value without changing architecture.

### Batch 2: Battle-Level Clear Wins

File:

- [packages/core/src/competitor-battle-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-battle-scenarios.test.ts)

Added battle regressions for:

- Shield negating the triggering hit and spending the reaction,
- opportunity attack reaction consumption, including no second OA before the reactor's next turn.

Why these second:

- the battle machine already had the generic reaction pipeline,
- `RShield` already existed in the hit-reaction branch,
- movement already modeled OA windows and reaction expenditure,
- tests were the missing piece, not architecture.

## What We Explicitly Did Not Implement Yet

These were examined and intentionally deferred:

### Grappler Incapacitation Auto-Releases Target

Reason for deferral:

- the single-creature machine does not model grappler identity,
- forcing this into the batch would have required a broader relationship model,
- that violates the small-step rule for the first pass.

### Shocking Grasp

Reason for deferral:

- battle state does not currently model a first-class temporary "cannot make Opportunity Attacks" effect,
- the correct representation is probably an `ActiveEffect`-driven rider, not an ad hoc flag,
- the spell rider expires at the start of the caster's next turn, which is a battle effect-lifecycle issue.

### Ray of Frost

Reason for deferral:

- battle state does not currently model transient speed-reduction riders,
- current battle effect duration handling decrements only on the affected creature's turn,
- Ray of Frost expires at the start of the caster's next turn, so this exposes the same lifecycle gap as Shocking Grasp.

## Architectural Conclusion So Far

The current battle layer is strong enough for:

- one-shot retroactive reactions like Shield,
- reaction spending and OA sequencing,
- generic hit / damage / after-damage interrupt windows.

The next missing capability is:

- caster-relative temporary combat riders stored as effects and recomputed into battle state.

That is the real next frontier, not more one-off battle tests.

## Verification Already Completed

Focused tests:

- `pnpm exec vitest run src/competitor-scenarios.test.ts`
- `pnpm exec vitest run src/competitor-battle-scenarios.test.ts`
- `pnpm exec vitest run src/competitor-scenarios.test.ts src/competitor-battle-scenarios.test.ts`
- `pnpm --filter @dnd/core typecheck`
- `pnpm exec quint test --match "test_grapple|test_death_save_|test_take_damage_resist_vuln_sequential" dndTest.qnt`

MBT verification completed in this worktree:

- creature MBT:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 pnpm exec vitest run src/creature.mbt.test.ts`
  - seed: `0xedf7edf6`
  - total: `18s`
- battle projection MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - seed: `0x48c0d676`
  - total: `12s`
- battle machine MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`
  - seed: `0x5727a497`
  - total: `12s`

Earlier batch-1 verification in this worktree also passed:

- creature MBT seed: `0xf8aa11bf`
- creature MBT seed: `0xedf7edf6`

## Current Worktree State

Uncommitted files:

- [packages/core/src/competitor-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-scenarios.test.ts)
- [packages/core/src/competitor-battle-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-battle-scenarios.test.ts)

No spec or runtime code changed in these two batches.

That means the next step can be chosen cleanly:

- continue test-only work on already-supported mechanics, or
- begin the first real battle-state/effect architecture extension.

## Next Step Options

### Option A: Start The Spell-Rider Batch

Recommended next step.

Goal:

- add the minimal battle-layer effect model needed for `Shocking Grasp` and `Ray of Frost`.

Scope:

- extend `ActiveEffect` with enough typed rider data to express:
  - no opportunity attacks until a given expiry point,
  - speed reduction by a fixed amount until a given expiry point
- make battle start-turn processing handle caster-relative expiry correctly,
- recompute battle turn capabilities from active effects rather than storing redundant ad hoc flags,
- add focused battle regression tests for:
  - Shocking Grasp blocks OAs until the start of the caster's next turn,
  - Ray of Frost reduces speed by 10 until the start of the caster's next turn,
  - expiry actually restores the baseline behavior.

Why this is next:

- it is the smallest real architecture gap exposed by competitor scenario mining,
- it unlocks multiple deferred scenarios with one coherent model change,
- it remains tightly aligned with SRD combat formalization.

### Option B: Add More Test-Only Battle Regressions

Only do this if avoiding architecture work.

Candidates:

- more Shield cases around hit thresholds,
- additional OA sequencing variants,
- more reaction-availability edge cases.

Why this is weaker:

- the best clear wins in the current model are already covered,
- returns diminish quickly without addressing the spell-rider gap.

## If You Continue This Work Next Time

Start here:

1. read this file,
2. read [ARCHITECTURE.md](/workspace/typescript/dnd-competitor-tests-batch-1/ARCHITECTURE.md),
3. read [battle/DOMAIN.md](/workspace/typescript/dnd-competitor-tests-batch-1/battle/DOMAIN.md),
4. inspect [packages/core/src/competitor-battle-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-battle-scenarios.test.ts),
5. choose `Option A` unless there is a reason to avoid model changes.

If choosing `Option A`, inspect these implementation anchors before editing:

- [packages/core/src/types.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/types.ts)
- [packages/core/src/battle-machine-creature.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-helpers.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-machine-actions-attack.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-actions-movement.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-machine.mbt.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine.mbt.test.ts)
- [packages/core/src/battle-projection.mbt.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-projection.mbt.test.ts)

Then preserve the same workflow:

- add focused tests first,
- keep the change SRD-traceable,
- run typecheck,
- run focused tests,
- run creature MBT if creature-layer touched,
- run battle projection MBT Tier 1,
- run battle machine MBT Tier 1,
- record commands and seeds back into this file.
