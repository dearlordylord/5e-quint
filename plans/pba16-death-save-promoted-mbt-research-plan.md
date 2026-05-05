# PBA16 Research Plan - Death-Save Promoted MBT Coverage

Task: PBA16 - Add Death-Save Promoted MBT Coverage

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: death-save lifecycle from local SRD 5.2.1 and `ASSUMPTIONS.md`.
- Ubiquitous-language lens: canonical terms are Death Saving Throw, Stable, Dead, Unconscious, and Hit Points.
- Architecture lens: promoted `@dnd/battle-runtime` QNT/MBT should cover death-save holes without restoring old Core battle MBT.

## RAW Anchors

- `.references/srd-5.2.1/Playing-the-Game.md`: Dropping to 0 Hit Points, Death Saving Throws, damage at 0 HP, natural 1/20, Stabilizing a Creature.
- `.references/srd-5.2.1/Rules-Glossary.md`: Dead, Death Saving Throw, Stable, Unconscious, simultaneous start-of-turn ordering.
- `ASSUMPTIONS.md`:
  - A6: current fixed ordering of death save before start-of-turn effects is documented as a RAW violation.
  - A12: monsters die at 0 HP; PCs use Death Saving Throws.
  - A16: death during start-turn does not short-circuit all modeled effect processing.
  - A33: dead/unconscious creatures remain in Initiative until caller teardown.

## Ubiquitous Language Findings

- Use "Death Saving Throw" in model-facing names; "death save" is only shorthand.
- Stable is a 0-HP state and does not mean healed or conscious.
- Dead is not equivalent to `hp === 0`.
- Runtime correctly separates `diesAtZeroHp` from `usesDeathSavingThrows`; MBT projection should preserve that split.
- `battle-runtime.qnt` has death-save behavior but the promoted MBT hole model lacks a `DeathSavingThrow` variant while TS runtime exposes `kind: "deathSavingThrow"`.

## Architecture Findings

- Relevant files:
  - `packages/battle-runtime/battle-runtime.qnt`
  - `packages/battle-runtime/battle-runtime.mbt.qnt`
  - `packages/battle-runtime/src/battle-runtime.mbt.test.ts`
  - `packages/battle-runtime/src/index.ts`
  - `packages/shared-algebras/src/death-saves-algebra.ts`
  - `packages/shared-algebras/proofs/death-saves-algebra-inductive.qnt`
- Deterministic QNT and TS tests already cover death-save behavior.
- Current promoted MBT projection rejects `deathSavingThrow` holes and only models target, attack roll, damage roll, and recharge holes.
- The current Rogue-vs-Skeleton MBT path is not a natural death-save pressure case because Skeletons use `diesAtZeroHp`.

## Read-Only Preflight - 2026-05-05

This preflight was run directly on `master` after the PBA15A source-identity
review lanes landed. No PBA16 production implementation was done.

Confirmed current state:

- Deterministic promoted runtime tests already cover the core start-turn Death
  Saving Throw lifecycle in `packages/battle-runtime/src/index.test.ts`:
  - End Turn asks for a `deathSavingThrow` hole when the next Character Build
    combatant starts at `0` HP.
  - A roll of `5` adds one failure.
  - A roll of `10` from two existing successes makes the combatant Stable and
    resets counters.
  - A natural `20` restores `1` HP and removes Unconscious.
- Shared algebra ownership already exists in
  `packages/shared-algebras/src/death-saves-algebra.ts`, with proof coverage in
  `packages/shared-algebras/proofs/death-saves-algebra-inductive.qnt`.
- Promoted runtime QNT already has helper-level death-save behavior:
  `endTurnWithDeathSave` and `applyStartTurnDeathSave` in
  `packages/battle-runtime/battle-runtime.qnt`.
- The promoted MBT harness still does not model the hole. In
  `packages/battle-runtime/src/battle-runtime.mbt.test.ts`, `MbtHole` omits
  `DeathSavingThrow`, `projectHole` throws on `kind: "deathSavingThrow"`, and
  `holeName` accepts only target/attack/damage/recharge variants.
- `packages/battle-runtime/battle-runtime.mbt.qnt` currently models the
  Rogue-vs-Skeleton attack path only. That scenario is useful for attack/rider
  parity but is the wrong pressure case for death saves because the Skeleton
  uses `diesAtZeroHp` under ASSUMPTIONS.md A12.

Recommended tracer bullet:

1. Add a second MBT scenario in the same promoted MBT test file rather than
   widening the Rogue-vs-Skeleton trace. Use two Character Build combatants:
   current actor at higher Initiative, next actor at `0` HP with
   `usesDeathSavingThrows`.
2. Add `DeathSavingThrow` to the MBT hole vocabulary and map TS
   `kind: "deathSavingThrow"` to it.
3. Model only representative fills at first: `5`, `10`, and `20`. Add `1` if
   the initial state can cheaply start with one existing failure, so the
   two-failure natural-1 path reaches dead in one replay.
4. Project only the lifecycle facts the trace needs: current actor id, pending
   holes, target HP, Unconscious/Stable/dead, and death-save success/failure
   counters. Do not pull Character Sheet/session closeout or Stable `1d4` hour
   recovery into this MBT.
5. Reuse runtime subjects through
   `{ tag: "runtimeCommand", actorId, command: "endTurn" }`; do not create an
   MBT-only command path.

What PBA15A lanes help with:

- The character-creation source/hole cleanup does not directly change
  battle-runtime death-save semantics.
- It does make the next implementation less noisy: MCP and creation-hole
  protocol ambiguity is no longer part of the PBA16 blast radius, so PBA16 can
  stay focused on promoted battle-runtime QNT/MBT coverage.
- The new PBA15A inventory identifies `AbilityScoreAssignment` and
  `CharacterBuildLoadout.itemId` as remaining primitive debt, but neither is a
  prerequisite for this narrow Death Saving Throw MBT slice.

## Suggested Implementation Shape

- A narrow promoted MBT lane could use two Character Build combatants so the next actor naturally uses `usesDeathSavingThrows`.
- The MBT model could add a `DeathSavingThrow` hole variant and actions for representative rolls: `1`, `5`, `10`, and `20`.
- The QNT harness could call existing promoted helpers such as `endTurnWithDeathSave` and `applyStartTurnDeathSave` instead of duplicating counter arithmetic.
- The TS driver could reuse the public runtime subject `{ tag: "runtimeCommand", actorId, command: "endTurn" }`.
- MBT state projection would likely need only snapshot-facing lifecycle facts: HP, Unconscious, Stable, dead, death successes, and death failures.
- Stable 1d4-hour recovery and durable post-battle closeout should stay out of this MBT unless battle runtime grows that session-time operation.

## Edge Cases Worth Covering

- End Turn with next actor at 0 HP asks for exactly one `deathSavingThrow` hole.
- Roll 2-9 adds one failure.
- Roll 1 adds two failures and can kill from one existing failure.
- Roll 10-19 adds one success.
- Third success makes Stable and resets counters.
- Roll 20 restores 1 HP and clears Unconscious while leaving Prone as applicable.
- Stable or dead actors at 0 HP do not request Death Saving Throw holes.
- Monster/stat-block combatants do not enter the death-save hole path under A12.

## Verification Suggestions

- Use the smallest promoted MBT tier that exercises the new scenario.
- Avoid broad battle MBT, fuzz, or old Core MBT.
- Suggested checks after implementation:
  - `pnpm --filter @dnd/battle-runtime typecheck`
  - `pnpm --filter @dnd/battle-runtime test src/battle-runtime.mbt.test.ts`
  - `pnpm --filter @dnd/battle-runtime test`
- `/simplify` convergence remains required.
