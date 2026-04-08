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

Batch 6 added the next small deterministic inspiration batch without widening battle state:

- `inspiration-battle-scenarios.test.ts` now covers readied-spell timing through the existing battle ready/reaction pipeline,
- a readied spell can be released with a Reaction and apply its effect,
- an unreleased readied spell dissipates at the start of the caster's next turn while still consuming the slot spent at ready time.

Why this batch:

- RAW support was already present in the battle machine,
- it exercises a real reaction/concentration/turn-boundary interaction,
- and it avoids colliding with the still-unlanded grappler-link work on `master`.

Batch 7 added the next smallest deterministic battle regression batch after Ready timing:

- `inspiration-battle-scenarios.test.ts` now covers `Disengage` suppressing Opportunity Attacks for the rest of the current turn,
- and confirms that the suppression ends when the mover's next turn starts.

Why this batch:

- the battle machine already carried `disengaged` state and an OA eligibility gate,
- the SRD outcome is a simple deterministic yes/no timing check,
- and it extends inspiration coverage without adding new battle state or colliding with grapple work.

Batch 8 adds the explicit positive reaction-refresh boundary:

- `inspiration-battle-scenarios.test.ts` now proves that a spent Reaction refreshes at the start of that creature's next turn,
- and that the refreshed Reaction can immediately participate in a later Opportunity Attack window.

Why this batch:

- the battle machine already enforced the reset through fresh-turn state,
- the existing inspiration suite only proved the negative side ("no second reaction before next turn"),
- and this closes the deterministic SRD timing contract without requiring new battle state.

Batch 9 adds the next small Dodge-timing inspiration proof:

- `inspiration-battle-scenarios.test.ts` now covers `Dodge` suppressing ally-adjacent Sneak Attack while the dodging target can still see the attacker,
- and confirms that the suppression ends at the start of the dodger's next turn.

Why this batch:

- the battle event surface does not expose raw advantage/disadvantage dice directly,
- but `dodging` still has an observable battle-level effect because it disables ally-adjacent Sneak Attack by imposing Disadvantage,
- and that gives an inspiration-derived turn-boundary proof without adding new battle state.

Batch 10 adds the missing non-spell Ready timing proof:

- `inspiration-battle-scenarios.test.ts` now covers an ordinary readied attack releasing with a Reaction and dealing damage,
- and confirms that an unreleased readied attack expires at the start of the creature's next turn.

Why this batch:

- the inspiration suite already covered readied spells but not the separate non-spell `BATTLE_READY` / `BATTLE_READY_RELEASE` path,
- the battle machine already had the ready window and release pipeline,
- and this closes another deterministic SRD reaction/turn-boundary contract without widening battle state.

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

Batch-6 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 6 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed
- battle projection MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - seed: `0xc1a962c6`
  - total: `13s`
- battle machine MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`
  - seed: `0x81ee392c`
  - total: `13s`

Batch-7 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 8 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed

Batch-8 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 9 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - blocked by unrelated local `packages/core/src/available-actions.ts` errors on `master`

Batch-9 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 10 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed

Batch-10 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 12 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - blocked by unrelated `packages/core/src/available-actions.test.ts` brand-type errors already present on local `master`

Batch-11 verification completed in this worktree:

- focused creature-machine ownership hardening:
  - command: `pnpm exec vitest run src/machine.test.ts`
  - passed: 280 tests
- focused available-actions fixture check:
  - command: `pnpm exec vitest run src/available-actions.test.ts`
  - passed: 8 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed

Batch-12 verification completed in this worktree:

- focused battle regressions:
  - command: `pnpm exec vitest run src/inspiration-battle-scenarios.test.ts`
  - passed: 15 tests
- package typecheck:
  - command: `pnpm --filter @dnd/core typecheck`
  - passed
- compiled battle spec refresh:
  - command: `node scripts/compile-battle-spec.cjs`
  - result: rebuilt `.quint-cache/battle-compiled.json`
- battle projection MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - passed with seed `0x92440b11`, total `2s`
- battle machine MBT Tier 1:
  - command: `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`
  - passed with seed `0x08383261`, total `2s`

## Current Worktree State

This worktree now contains:

- inspiration-driven creature regressions,
- inspiration-driven battle regressions,
- ready-spell timing regressions for release-vs-fizzle behavior,
- disengage/OA timing regressions,
- explicit reaction-refresh timing regressions,
- dodge/sneak-attack timing regressions,
- non-spell ready timing regressions,
- direct creature-level ownership/speedDelta hardening tests,
- battle-layer grapple relationship state and lifecycle actions,
- deterministic grapple regressions for auto-release, attack disadvantage exception, and drag-speed penalty,
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
  - explicit battle coverage for manual grapple release / escape if you want the remaining grapple lifecycle edges proved in inspiration form,
  - another deterministic scenario-mining batch from `natural_20` that does not require new battle state,
  - or another deterministic scenario-mining batch from `natural_20` if grapple now feels sufficiently covered.

Why this is next:

- the rider-path cleanup and the small Ready timing batch are now complete,
- the former grapple architecture blocker is now cleared in this worktree,
- the previously suggested Disengage, reaction-refresh, Dodge timing, and non-spell Ready timing batches are already covered in this worktree,
- manual grapple release / escape is now a genuinely small deterministic follow-up because the battle/runtime/spec surface already exists,
- the remaining value is back in discovering the next missing mechanic interaction that the current battle surface can already express.

Parallel pre-research plan for a later sub-agent pass:

- one sub-agent should scout 2-3 deterministic inspiration candidates that fit the current battle/runtime surface without adding new battle state,
- one sub-agent can prepare the explicit grapple release / escape proofs since the underlying architecture is now in place,
- one sub-agent may take the weaker Option B hardening track and prepare direct creature-level ownership tests for `expiryOwnerId` and `speedDeltaFeet`,
- the main thread should only start implementation after the scout results agree on the smallest safe batch.

### Option B: Add Direct Creature-Level Ownership Tests

Do this before a larger mechanic batch if you want a tighter local contract around the recent convergence work.

Status:

- completed in this worktree as Batch 11.

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

What Batch 11 added:

- `START_TURN` now has direct tests showing owned start-of-turn effects decrement for `selfId` while foreign-owned effects do not advance,
- `START_TURN` has a direct test for `speedDeltaFeet` changing `effectiveSpeed` and `movementRemaining`,
- `END_TURN` has a direct test showing foreign-owned end hooks are ignored,
- and this branch also carries the branded test-input cleanup needed for local package typecheck.

## Parallel Pre-Research

If this work is resumed with subagents, they can scout these in parallel before implementation. All of them fit the current battle/runtime surface and avoid new battle state.

### Candidate 1: Dodge Applies Attack Disadvantage Until The Start Of The Dodger's Next Turn

Status:

- completed in this worktree as Batch 9 via a battle-level Sneak Attack suppression proof.

Why it is small:

- `dodging` already exists on battle creature state,
- attack-mod aggregation already consumes `targetDodging`,
- and turn-start reset behavior is already part of the battle start-turn pipeline.

Likely files:

- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts)
- [battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts)

RAW anchors:

- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Dodge [Action]`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Reaction`
- [battle/REQUIREMENTS.md](../../battle/REQUIREMENTS.md) `R1`, `R2`

### Candidate 2: A Spent Reaction Refreshes At The Start Of The Creature's Next Turn

Status:

- completed in this worktree as Batch 8.

Why it was small:

- the battle layer already spends reactions for Shield, Opportunity Attacks, and readied actions,
- existing inspiration tests cover "no second reaction before next turn" but not the explicit refresh boundary,
- and the check is deterministic with current turn sequencing.

Likely files:

- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts)
- [battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)

RAW anchors:

- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Reaction`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Opportunity Attacks`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Ready [Action]`
- [battle/REQUIREMENTS.md](../../battle/REQUIREMENTS.md) `R2`, `R5`

### Candidate 3: Disengage Suppresses Opportunity Attacks For The Rest Of The Turn

Status:

- completed in this worktree as Batch 7.

Why it was small:

- the battle machine already tracked `disengaged`,
- movement OA offering already went through a single eligibility gate,
- and the expected behavior was a deterministic yes/no regression.

Likely files:

- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [battle-machine-actions-movement.ts](../../packages/core/src/battle-machine-actions-movement.ts)
- [battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)

RAW anchors:

- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Disengage [Action]`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Reaction`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Opportunity Attacks`
- [battle/REQUIREMENTS.md](../../battle/REQUIREMENTS.md) `R2`, `R5`

### Parallel Audit: Grapple Readiness Check

This is a separate subagent task, not an implementation target.

Goal:

- determine whether `master` has gained battle-layer grappler identity/link state beyond a bare `grappled: boolean`,
- and answer whether "grappler incapacitation auto-releases target" is now a small deterministic batch or still an architectural batch.

Current local finding:

- completed in this worktree. Battle state now carries explicit grapple ownership links, attack-context projection consumes them, drag-speed uses them, and incapacitating the grappler auto-releases the target in both TS and Quint.

Files to inspect:

- [battle.qnt](../../battle.qnt)
- [battle-machine-types.ts](../../packages/core/src/battle-machine-types.ts)
- [battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts)
- [battle-machine-actions-movement.ts](../../packages/core/src/battle-machine-actions-movement.ts)

### Design Handoff: Grapple Auto-Release

Status:

- completed in this worktree as Batch 12.

RAW anchor:

- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Grappled [Condition]`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Grappling`
- key rule: "The condition also ends if the grappler has the Incapacitated condition ..."

What Batch 12 changed:

1. Added explicit battle-layer relationship state.
   - [battle.qnt](../../battle.qnt) combatants now track `grappledBy`, `grapplingTarget`, and `grappledTargetTwoSizesSmaller`
   - [battle-machine-types.ts](../../packages/core/src/battle-machine-types.ts) mirrors the same fields
2. Added relationship-aware helpers and lifecycle actions.
   - [battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts) now links, clears, normalizes, and speed-refreshes grapple relationships
   - [battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts) now supports battle-level grapple, release, and escape actions
3. Replaced the attack/speed placeholders with authoritative relationship facts.
   - [battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts) now projects `attackerGrappled` and `targetIsGrappler`
   - [battle.qnt](../../battle.qnt) now uses relationship-aware attack-context projection and drag-speed calculation
4. Added deterministic battle regressions and parity verification.
   - [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts) now proves auto-release on incapacitation, the grappler attack-disadvantage exception, and the drag-speed penalty
   - both Tier 1 battle MBT checks passed against the updated spec/runtime pair

Files likely involved:

- [battle.qnt](../../battle.qnt)
- [creature.qnt](../../creature.qnt)
- [packages/core/src/battle-machine-types.ts](../../packages/core/src/battle-machine-types.ts)
- [packages/core/src/battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-machine-actions-attack.ts](../../packages/core/src/battle-machine-actions-attack.ts)
- [packages/core/src/battle-machine-actions-movement.ts](../../packages/core/src/battle-machine-actions-movement.ts)
- [packages/core/src/inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [packages/core/src/battle-machine.mbt.test.ts](../../packages/core/src/battle-machine.mbt.test.ts)
- [packages/core/src/battle-projection.mbt.test.ts](../../packages/core/src/battle-projection.mbt.test.ts)

What remains if grapple work resumes:

- add an explicit inspiration proof for manual release / escape if that lifecycle edge still matters,
- or expand to movement-out-of-reach release once battle spatial ownership is modeled beyond caller-supplied threatened sets.

### Design Handoff: Manual Grapple Release / Escape Inspiration Batch

Status:

- completed in Batch 13
- this is no longer the next step; use it as a verification/history note

Goal:

- add explicit inspiration battle regressions for the remaining grapple lifecycle edges already supported by the runtime/spec:
  - voluntary release by the grappler
  - successful escape by the grappled creature
  - failed escape leaving the grapple intact

Why this is small now:

- [battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts) already has `battleReleaseGrapple` and `battleEscapeGrapple`
- [battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts) already clears both sides of the link and refreshes speed
- [battle.qnt](../../battle.qnt) already has matching `bReleaseGrapple` and `bEscapeGrapple`
- this should be test-first in [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts), with little or no production code change unless the tests expose a real semantic gap

RAW anchors:

- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Grappled [Condition]`
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md) `Grappling`
- key text:
  - "The grappler can release the target at any time (no action required)."
  - "As an action, the grappled creature can make a Dexterity or Strength saving throw ... ending the condition on itself on a success."

Suggested regression set:

1. Voluntary release clears both sides immediately.
   - active grappler uses `BATTLE_RELEASE_GRAPPLE`
   - expect grappler `grapplingTarget == null`
   - expect target `grappled == false` and `grappledBy == null`
   - expect no action/reaction cost was spent by the release itself
2. Successful escape spends the target's action and clears the grapple.
   - grappler establishes the link first
   - on the target's turn, send `BATTLE_ESCAPE_GRAPPLE { escapeSucceeded: true }`
   - expect target action spent
   - expect both sides of the relationship cleared
3. Failed escape spends the target's action but leaves the grapple intact.
   - same setup as above
   - send `BATTLE_ESCAPE_GRAPPLE { escapeSucceeded: false }`
   - expect target action spent
   - expect target still grappled and grappler link still present

Nice-to-have assertion:

- after successful release or escape, the formerly grappled creature's next `effectiveSpeed` / `movementRemaining` reflects the cleared grapple state if it is the active creature

Likely files:

- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [battle-machine-actions-turn.ts](../../packages/core/src/battle-machine-actions-turn.ts)
- [battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts)
- [battle.qnt](../../battle.qnt) only if tests expose a parity gap

Recommended implementation order:

1. add the three deterministic regressions in [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
2. run the focused battle test file
3. only touch TS/Quint code if one of the new regressions fails
4. if code changes are needed, keep spec/runtime in lockstep and re-run Tier 1 battle MBT

Expected verification:

- `pnpm --filter @dnd/core exec vitest run src/inspiration-battle-scenarios.test.ts`
- `pnpm --filter @dnd/core typecheck`
- if code changed beyond tests:
  - `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-projection.mbt.test.ts`
  - `MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=3 pnpm exec vitest run src/battle-machine.mbt.test.ts`

Cold-start recommendation:

- start with the existing grapple helper fixture in [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- do not reopen the architecture problem unless the regressions prove a mismatch
- treat this as a small closure batch on top of Batch 12, not a new design task

Batch 13 result:

1. Added deterministic battle regressions for the remaining grapple lifecycle edges.
   - voluntary release now has explicit coverage via `BATTLE_RELEASE_GRAPPLE`
   - successful and failed escape now have explicit coverage via `BATTLE_ESCAPE_GRAPPLE`
2. Confirmed the existing runtime/spec behavior was already correct.
   - no TS or Quint production changes were required
   - the batch stayed test-only, which is the expected result for a closure pass after Batch 12
3. Verified speed refresh semantics on the active creature after release/escape.
   - successful release restores the grappler's current-turn `effectiveSpeed` / `movementRemaining`
   - successful escape restores the target's current-turn `effectiveSpeed` / `movementRemaining`
   - failed escape leaves the target grappled with Speed 0

Files touched:

- [packages/core/src/inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)

Verification:

- `pnpm --filter @dnd/core exec vitest run src/inspiration-battle-scenarios.test.ts`
- `pnpm --filter @dnd/core typecheck`

What is next now:

- `Action Surge` battle coverage is now in inspiration form, so do not re-pick it as the next batch
- the `Ray of Frost` + `Dash` follow-up is now covered in inspiration form, so do not re-pick it as the next batch
- scout the next small deterministic inspiration batch outside grapple and outside the already-covered `Ray of Frost`/`Dash` interaction
- if you resume in a fresh session, start from this file and [packages/core/src/inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts), then pick the next `natural_20`-style scenario that fits current battle state without reopening architecture

Batch 14 result:

1. Added explicit battle coverage that `Dash` uses modified Speed, not base Speed.
   - [packages/core/src/inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts) now proves a `Ray of Frost`-slowed creature gains only 20 extra feet from `BATTLE_DASH`, reaching 40 movement rather than 60
2. Confirmed the existing implementation already matched RAW.
   - no production TS or Quint changes were required
   - the batch stayed test-only

Verification:

- `pnpm --filter @dnd/core exec vitest run src/inspiration-battle-scenarios.test.ts`
- `pnpm --filter @dnd/core typecheck`

Batch 15 result:

1. Added explicit battle coverage for Fighter `Action Surge`.
   - [packages/core/src/inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts) now proves:
     - a Fighter can take one additional non-Magic action on the same turn,
     - a level-17 Fighter still cannot use `Action Surge` twice on the same turn,
     - the surge-granted action cannot be the Magic action
2. Confirmed the existing implementation already matched RAW.
   - no production TS or Quint changes were required
   - the batch stayed test-only

Verification:

- `pnpm --filter @dnd/core exec vitest run src/inspiration-battle-scenarios.test.ts`
- `pnpm --filter @dnd/core typecheck`

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
