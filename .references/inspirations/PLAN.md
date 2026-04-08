# Inspiration-Driven Testing Plan

## Goal

Use the clearest, most engine-like external implementations as prompts for high-value SRD 5.2.1 regression tests, without treating any external codebase as an authority.

The point of this workstream is:

- find mechanic interactions that are easy to miss in our spec/runtime,
- turn them into deterministic tests first,
- then validate parity with MBT,
- and only expand architecture when an inspiration case exposes a real modeling gap.

This is downstream of the project purpose in [ARCHITECTURE.md](../../ARCHITECTURE.md): the real target is still Quint proof + XState parity for SRD 5.2.1 combat.

## Why This Work Exists

Earlier repository analysis showed:

- external engines are useful as sources of scenario ideas, state/action vocabulary, and tricky interaction patterns,
- they are not useful as correctness oracles,
- the fastest value comes from converting their strongest examples into our own RAW-traceable tests.

That led to a small-step worktree strategy:

- batch 1: creature-layer scenarios already close to our current model,
- batch 2: battle-layer scenarios already supported by current reaction architecture,
- defer any case that requires broader state/effect changes until it is isolated as the next deliberate batch.

## Domain Reading List

Read these before changing anything:

1. [ARCHITECTURE.md](../../ARCHITECTURE.md)
2. [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md)
3. [ASSUMPTIONS.md](../../ASSUMPTIONS.md)
4. [battle/DOMAIN.md](../../battle/DOMAIN.md)
5. [battle/REQUIREMENTS.md](../../battle/REQUIREMENTS.md)

For the rules involved in this workstream, use:

- [.references/srd-5.2.1/Playing-the-Game.md](../srd-5.2.1/Playing-the-Game.md)
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Spells/Descriptions-Q-R.md](../srd-5.2.1/Spells/Descriptions-Q-R.md)
- [.references/srd-5.2.1/Spells/Descriptions-S-Z.md](../srd-5.2.1/Spells/Descriptions-S-Z.md)

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

- [inspiration-scenarios.test.ts](../../packages/core/src/inspiration-scenarios.test.ts)

Added inspiration-sourced creature regressions for:

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
- they were directly motivated by scenario mining,
- they gave immediate regression value without changing architecture.

### Batch 2: Battle-Level Clear Wins

File:

- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)

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

- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [types.ts](../../packages/core/src/types.ts)
- [battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)
- [battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts)
- [battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts)
- [battle-machine-actions-movement.ts](../../packages/core/src/battle-machine-actions-movement.ts)
- [battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts)

Added runtime coverage and support for:

- `Shocking Grasp` blocking Opportunity Attacks until the start of the target's next turn,
- `Ray of Frost` reducing Speed by 10 until the start of the caster's next turn.

What changed:

- `ActiveEffect` now carries optional rider data for OA blocking and speed deltas.
- `ActiveEffect` now also carries an optional `expiryOwnerId`.
- battle turn processing now advances effect durations by expiry owner rather than assuming the affected creature always owns the duration boundary.
- OA eligibility now derives from effect state instead of only `reactionAvailable`.
- battle speed derivation now includes active-effect speed deltas.
- generic battle attacks can carry an optional on-hit effect payload, which is enough for the current inspiration regressions.

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

Batch 5 completed the remaining projection convergence work:

- the single-creature machine now accepts an optional `selfId`,
- start-turn and end-turn hook processing now respects `expiryOwnerId` when actor identity is available,
- creature-level speed derivation now includes `ActiveEffect.speedDeltaFeet`,
- battle projection no longer carries a parallel `Ray of Frost` ownership/speed shim.

Current conclusion:

- battle projection now replays `Shocking Grasp` and `Ray of Frost` through shared `ActiveEffect` state rather than a projection-local side map,
- the remaining effect-ownership work is no longer this branch's cleanup task; it is broader shared-effect evolution on `master`.

## Verification Already Completed

Focused tests:

- `pnpm exec vitest run src/inspiration-scenarios.test.ts`
- `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
- `pnpm exec vitest run src/inspiration-scenarios.test.ts src/inspiration-battle-scenarios.test.ts`
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
  - `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 4 tests
- focused combined inspiration suite:
  - `pnpm exec vitest run src/inspiration-scenarios.test.ts src/inspiration-battle-scenarios.test.ts`
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
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
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

Batch-5 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 4 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed
- battle projection MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - seed: `0x00d2f982`
  - total: `12s`
- battle machine MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`
  - seed: `0xfe48b3f7`
  - total: `45s`

## Current Worktree State

This worktree now contains:

- inspiration-driven creature regressions,
- inspiration-driven battle regressions,
- runtime rider support,
- spec-level rider generation,
- MBT coverage for the rider path,
- TS effect-contract alignment to support owned-effect replay,
- and projection replay that now uses shared effect state for `Ray of Frost` as well as `Shocking Grasp`.

The next step is not "add rider proof coverage" or "remove the projection ownership shim." Both are now done in this worktree.

## Next Step Options

### Option A: Pick The Next Inspiration Scenario Batch

Recommended next step.

Goal:

- return to the deferred inspiration scenarios that still represent real mechanic gaps or useful proof targets,
- choose the smallest one that does not collide with active parallel work on `master`,
- keep following the same pattern: deterministic regression first, then parity/MBT only if the scenario touches authoritative combat semantics.

Scope:

- prefer scenarios already identified in the inspiration scenario inventory,
- coordinate with active parallel branches before picking grapple/forced-movement work,
- favor one of these:
  - grappler incapacitation auto-releases target, if the main grappling work has landed or can be cleanly rebased,
  - another owner-relative effect case if an external engine exposes one not yet covered,
  - a deterministic scenario-mining batch from `natural_20` that does not require new battle state.

Why this is next:

- the prior recommended cleanup is now complete,
- the current proof gap is no longer in `Ray of Frost` projection ownership,
- the remaining value is back in discovering the next missing mechanic interaction, not in polishing the already-green rider path.

### Option B: Add Direct Creature-Level Ownership Tests

Do this before a larger mechanic batch if you want a tighter local contract around the recent convergence work.

Goal:

- add focused unit tests for owner-relative effect timing and speed derivation in the single-creature machine.

Suggested coverage:

- `START_TURN` only advances start-owned effects whose `expiryOwnerId` matches `selfId`,
- foreign-owned start effects stay active through this actor's turn,
- `speedDeltaFeet` changes `effectiveSpeed` on `START_TURN`,
- end-turn hooks ignore foreign-owned effects.

Why this is weaker:

- it strengthens the shared machine contract but does not expand inspiration-derived mechanic coverage,
- the main battle proof path is already green,
- it is best treated as local hardening, not as the primary next milestone.

## If You Continue This Work Next Time

Start here:

1. read this file,
2. read [ARCHITECTURE.md](../../ARCHITECTURE.md),
3. read [battle/DOMAIN.md](../../battle/DOMAIN.md),
4. inspect [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts),
5. choose `Option A` unless there is a reason to avoid another inspiration scenario batch.

If choosing `Option A`, inspect these implementation anchors before editing:

- [battle.qnt](../../battle.qnt)
- [creature.qnt](../../creature.qnt)
- [types.ts](../../packages/core/src/types.ts)
- [battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)
- [battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts)
- [battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts)
- [battle-machine-actions-movement.ts](../../packages/core/src/battle-machine-actions-movement.ts)
- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [battle-machine.mbt.test.ts](../../packages/core/src/battle-machine.mbt.test.ts)
- [battle-projection.mbt.test.ts](../../packages/core/src/battle-projection.mbt.test.ts)

Then preserve the same workflow:

- add focused tests first,
- keep the change SRD-traceable,
- run typecheck,
- run focused tests,
- run battle projection MBT Tier 1,
- run battle machine MBT Tier 1,
- record commands and seeds back into this file.
