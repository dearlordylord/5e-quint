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

### Batch 3: Spell-Rider Runtime Batch

Files:

- [packages/core/src/competitor-battle-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-battle-scenarios.test.ts)
- [packages/core/src/types.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/types.ts)
- [packages/core/src/battle-machine-creature.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-helpers.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-machine-actions-attack.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-actions-movement.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/battle-machine-actions-turn.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine-actions-turn.ts)

Added runtime coverage and support for:

- `Shocking Grasp` blocking Opportunity Attacks until the start of the target's next turn,
- `Ray of Frost` reducing Speed by 10 until the start of the caster's next turn.

What changed:

- `ActiveEffect` now carries optional rider data for OA blocking and speed deltas.
- `ActiveEffect` now also carries an optional `expiryOwnerId`.
- battle turn processing now advances effect durations by expiry owner rather than assuming the affected creature always owns the duration boundary.
- OA eligibility now derives from effect state instead of only `reactionAvailable`.
- battle speed derivation now includes active-effect speed deltas.
- generic battle attacks can carry an optional on-hit effect payload, which is enough for the current competitor regressions.

Important RAW correction discovered during implementation:

- `Shocking Grasp` says "until the start of its next turn" and is therefore target-relative.
- `Ray of Frost` says "until the start of your next turn" and is therefore caster-relative.
- The correct generalized model is not "caster-relative only"; it is "effect owner relative."

## Architectural Conclusion So Far

The current battle layer is strong enough for:

- one-shot retroactive reactions like Shield,
- reaction spending and OA sequencing,
- generic hit / damage / after-damage interrupt windows.

The runtime layer now also supports:

- effect-driven OA suppression,
- effect-driven temporary speed reduction,
- mixed expiry ownership for temporary attack riders.

Batch 4 completed the missing proof layer:

- `battle.qnt` now generates attack-hit riders for `Shocking Grasp` and `Ray of Frost`,
- battle MBT now maps Quint rider choices into battle-machine attack events,
- battle projection MBT now replays the same rider path against creature actors,
- start-of-turn ownership semantics are now exercised end to end for these cases.

Important implementation note:

- Quint battle spec did not need a shared-effect shape change to express owner-relative expiry.
- The TS bridge in this worktree did need to align to the shared effect contract so MBT could replay the same semantics without projection-only effect payloads.
- That alignment added generic turn-hook support in the worktree TS effect model.

Current remaining caveat:

- the projection harness still carries a small local shim for `Ray of Frost` expiry ownership, because the single-creature actor still has no creature identity and cannot decide "whose turn owns this expiry" from local state alone.
- This is a bridge limitation, not a battle-spec limitation.

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

Batch-3 verification completed in this worktree:

- focused battle regressions:
  - `pnpm exec vitest run src/competitor-battle-scenarios.test.ts`
  - passed: 4 tests
- focused combined competitor suite:
  - `pnpm exec vitest run src/competitor-scenarios.test.ts src/competitor-battle-scenarios.test.ts`
  - passed: 15 tests
- typecheck:
  - `pnpm --filter @dnd/core typecheck`
  - passed
- battle projection MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - seed: `0x5db20e93`
  - total: `37s`
- battle machine MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`
  - seed: `0xafdde94b`
  - total: `12s`

Batch-4 verification completed in this worktree:

- battle spec typecheck:
  - command: `pnpm exec quint typecheck battle.qnt`
  - passed
- focused battle regressions:
  - command: `pnpm exec vitest run src/competitor-battle-scenarios.test.ts`
  - passed: 4 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed
- battle machine MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`
  - seed: `0xe186be24`
  - total: `16s`
- battle projection MBT Tier 1, reproduced failing seed after projection fixes:
  - command: `QUINT_SEED=0x6c82836d MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - seed: `0x6c82836d`
  - total: `16s`
- battle projection MBT Tier 1, fresh run:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - seed: `0xf151cb03`
  - total: `14s`

## Current Worktree State

This worktree now contains:

- competitor-driven creature regressions,
- competitor-driven battle regressions,
- runtime rider support,
- spec-level rider generation,
- MBT coverage for the rider path,
- and a small TS effect-contract alignment to support owned-effect replay.

The next step is not "add rider proof coverage." That work is now done in this worktree.

## Next Step Options

### Option A: Reconcile This Branch With Main-Branch Effect Ownership Work

Recommended next step.

Goal:

- merge or rebase this worktree onto the main-branch authoritative `ActiveEffect` ownership changes,
- remove any duplicated compatibility logic introduced here while preserving the now-green battle/spec MBT path,
- decide whether the projection `Ray of Frost` ownership shim can disappear once creature actors carry enough identity to own expiry decisions locally.

Scope:

- re-read the parallel effect-ownership branch before changing the shared effect files,
- compare [packages/core/src/types.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/types.ts), [packages/core/src/machine-types.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine-types.ts), [packages/core/src/machine.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine.ts), [packages/core/src/machine-startturn.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine-startturn.ts), and [packages/core/src/machine-endturn.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine-endturn.ts) against `master`,
- keep [battle.qnt](/workspace/typescript/dnd-competitor-tests-batch-1/battle.qnt), [packages/core/src/battle-machine.mbt.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine.mbt.test.ts), and [packages/core/src/battle-projection.mbt.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-projection.mbt.test.ts) as the behavioral reference,
- rerun the same Tier 1 MBT checks after reconciliation.

Why this is next:

- the battle/spec proof work is done here,
- the main branch is now evolving the shared effect contract in the same direction,
- the highest-value remaining task is to converge the two branches instead of letting them drift.

### Option B: Replace The Projection Ownership Shim

Only do this if main-branch effect ownership work is blocked.

Goal:

- remove the battle-projection local `Ray of Frost` ownership helper by giving the replay layer enough identity/context to derive expiry ownership from actor state alone.

Why this is weaker:

- it is a bridge clean-up, not a new proof win,
- it may be superseded by the main-branch effect work,
- it should not be done in isolation if the shared effect contract is changing under it.
- more tests without spec/MBT uplift increase the proof gap rather than shrinking it.

## If You Continue This Work Next Time

Start here:

1. read this file,
2. read [ARCHITECTURE.md](/workspace/typescript/dnd-competitor-tests-batch-1/ARCHITECTURE.md),
3. read [battle/DOMAIN.md](/workspace/typescript/dnd-competitor-tests-batch-1/battle/DOMAIN.md),
4. inspect [packages/core/src/competitor-battle-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-battle-scenarios.test.ts),
5. choose `Option A` unless there is a reason to avoid spec/MBT work.

If choosing `Option A`, inspect these implementation anchors before editing:

- [battle.qnt](/workspace/typescript/dnd-competitor-tests-batch-1/battle.qnt)
- [creature.qnt](/workspace/typescript/dnd-competitor-tests-batch-1/creature.qnt)
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
- run battle projection MBT Tier 1,
- run battle machine MBT Tier 1,
- run battle machine MBT Tier 1,
- record commands and seeds back into this file.
