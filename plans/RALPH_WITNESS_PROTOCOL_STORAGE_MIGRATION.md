# Witness Protocol Storage Migration

Status: completed in `/workspace/typescript/.codex-worktrees/dnd-witness-protocol-tracers`.

## Outcome

Active package witness code now stores replay protocol state in typed records:

- character-package QNT witnesses use `qState` records with domain-prefixed outcome variants;
- large deterministic witnesses keep projection facts nested in typed facts records where that avoids scalar sprawl;
- battle-runtime witnesses read typed `protocol`/`qProtocol` records and the driver kit no longer falls back to loose top-level protocol fields;
- battle-runtime protocol-construction helpers now pass `WitnessResult` variants
  instead of string protocol outcomes in the migrated helper set;
- character-package TS MBT readers decode typed records and use `outcome`
  vocabulary for migrated witness protocol state.
- battle-runtime TS helpers still expose existing `lastResult` projection
  properties in many tests; this lane removed q-prefixed storage and loose
  decode fallbacks, not every TS projection field name.

This was a storage/reader migration only. No SRD rule behavior was intentionally changed.

## Permanent Warning

Protocol outcome, invalid-reason, and open-hole state belong in a typed protocol record or a domain-specific `qState` record. Do not add loose top-level mutable fields just to make a TS reader convenient.

Scenario labels and projection facts may remain domain-local fields when they are not protocol state. If a domain label becomes executable protocol state, model it as a typed outcome variant at that boundary.

## Verification

Static checks:

- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/battle-runtime typecheck`
- `git diff --check`
- exact removed protocol-storage name scan
- deleted typed-protocol PRD and character feasibility plan reference scan
- character-reader protocol label scan:
  `rg -n "lastResult|LastResult" packages/character-battle-runtime/src packages/character-creation-runtime/src packages/character-sheet-runtime/src --glob '*.ts'`
- guarded reader-cast scan for the repeated `tag` / `qState` parser pattern
- `node scripts/check-mbt-driver-closure.cjs --self-test`
- `node scripts/check-mbt-driver-closure.cjs`

Focused character-battle MBT, seed `0x510001`, total `52s`:

- `src/origin-feat-selected-identity.mbt.test.ts`
- `src/character-battle-settlement.mbt.test.ts`
- `src/character-sheet-feature-resources.mbt.test.ts`
- `src/character-battle-init-projection.mbt.test.ts`

Focused character-creation MBT, seed `0x510002`, total `81s` before the final
fixture-only repair:

- `src/class-feature-projections.mbt.test.ts`
- `src/class-feature-selected-identity.mbt.test.ts`
- `src/cleric-druid-order-selected-identity.mbt.test.ts`
- `src/fighter-fighting-style-selected-identity.mbt.test.ts`
- `src/rogue-expertise-selected-identity.mbt.test.ts`
- `src/warlock-eldritch-invocations-selected-identity.mbt.test.ts`
- `src/weapon-mastery-containers-selected-identity.mbt.test.ts`
- `src/weapon-mastery-level-gain.mbt.test.ts`
- `src/character-creation-runtime.mbt.test.ts`

Focused character-creation selected-identity rerun after reverting the
production support-gate experiment and making the supported species fixture
explicit, seed `0x510002`, total `36s`:

- `src/class-feature-selected-identity.mbt.test.ts`
- `src/cleric-druid-order-selected-identity.mbt.test.ts`
- `src/rogue-expertise-selected-identity.mbt.test.ts`
- `src/warlock-eldritch-invocations-selected-identity.mbt.test.ts`
- `src/weapon-mastery-containers-selected-identity.mbt.test.ts`
- `src/weapon-mastery-level-gain.mbt.test.ts`

Focused character-sheet MBT, seed `0x510003`:

- `src/ability-check-proficiency-bonus.mbt.test.ts`
- `src/arcane-recovery-selected-identity.mbt.test.ts`
- `src/armor-class-base-selected-identity.mbt.test.ts`
- `src/class-feature-selected-identity.mbt.test.ts`
- `src/healing-resource-selected-identity.mbt.test.ts`
- `src/hit-point-maximum.mbt.test.ts`
- `src/hp-rest-hit-dice.mbt.test.ts`
- `src/spell-rest-benefit-application.mbt.test.ts`
- `src/spell-slots-pact-slots.mbt.test.ts`
- `src/spellbook-ritual-selected-identity.mbt.test.ts`
- `src/weapon-mastery-class-level-reselection.mbt.test.ts`
- `src/weapon-mastery-containers-selected-identity.mbt.test.ts`

Final parser-cleanup reruns after replacing repeated guarded casts with parsed
record reads:

- character-battle focused batch, seed `0x510001`, total `31s`:
  - `src/origin-feat-selected-identity.mbt.test.ts`
  - `src/character-battle-settlement.mbt.test.ts`
  - `src/character-sheet-feature-resources.mbt.test.ts`
  - `src/character-battle-init-projection.mbt.test.ts`
- character-creation focused batch, seed `0x510002`, total `19s`:
  - `src/class-feature-projections.mbt.test.ts`
  - `src/class-feature-selected-identity.mbt.test.ts`
  - `src/cleric-druid-order-selected-identity.mbt.test.ts`
  - `src/fighter-fighting-style-selected-identity.mbt.test.ts`
  - `src/rogue-expertise-selected-identity.mbt.test.ts`
  - `src/warlock-eldritch-invocations-selected-identity.mbt.test.ts`
  - `src/weapon-mastery-containers-selected-identity.mbt.test.ts`
  - `src/weapon-mastery-level-gain.mbt.test.ts`
  - `src/character-creation-runtime.mbt.test.ts`
  - `src/wizard-scholar.test.ts`
- character-sheet focused batch, seed `0x510003`, total `18s`:
  - `src/ability-check-proficiency-bonus.mbt.test.ts`
  - `src/arcane-recovery-selected-identity.mbt.test.ts`
  - `src/armor-class-base-selected-identity.mbt.test.ts`
  - `src/class-feature-selected-identity.mbt.test.ts`
  - `src/healing-resource-selected-identity.mbt.test.ts`
  - `src/hit-point-maximum.mbt.test.ts`
  - `src/hp-rest-hit-dice.mbt.test.ts`
  - `src/spell-rest-benefit-application.mbt.test.ts`
  - `src/spell-slots-pact-slots.mbt.test.ts`
  - `src/spellbook-ritual-selected-identity.mbt.test.ts`
  - `src/weapon-mastery-class-level-reselection.mbt.test.ts`
  - `src/weapon-mastery-containers-selected-identity.mbt.test.ts`

Focused battle-runtime checks:

- `src/battle-runtime-mbt-driver-kit.test.ts`, total `3s`
- selected MBT seed `0x510004`, total `50s`:
  - `src/rule-core-stat-block-controls.mbt.test.ts`
  - `src/weapon-attack-skeleton.mbt.test.ts`
  - `src/magic-missile-allocation.mbt.test.ts`
  - `src/gust-of-wind-line-lifecycle.mbt.test.ts`
  - `src/levitated-creature-lifecycle.mbt.test.ts`
  - `src/roll-modifier-active-effects.mbt.test.ts`
  - `src/spike-growth-movement-hazard.mbt.test.ts`
- typed protocol-helper rerun, seed `0x510005`, total `66s`:
  - `src/rule-core-stat-block-controls.mbt.test.ts`
  - `src/weapon-attack-skeleton.mbt.test.ts`
  - `src/rule-core-features.mbt.test.ts`
  - `src/rule-core-movement.mbt.test.ts`
  - `src/rule-core-reactions.mbt.test.ts`
  - `src/rule-core-spells.mbt.test.ts`
  - `src/command-ordering.mbt.test.ts`
  - `src/spell-attack-ordering.mbt.test.ts`
  - `src/save-gated-spell-ordering.mbt.test.ts`
  - `src/weapon-attack-ordering.mbt.test.ts`
  - `src/hit-point-restoration-ordering.mbt.test.ts`
  - `src/starry-wisp-object.mbt.test.ts`
  - `src/spiritual-weapon.mbt.test.ts`

Additional ordinary Vitest:

- `src/wizard-scholar.test.ts`, total `2s`

## Notes

The first selected-identity character-creation runs exposed a pre-existing setup
failure for a discovered Dragonborn ancestry hole. The same failure reproduced
in the main checkout before this migration's code changes. A production
support-gate admission experiment was rejected in review because it widened
behavior in a storage-only lane, so the final fix is fixture-only: selected
identity tests now choose an already supported synthetic species option when the
species hole appears.

RAW/ubiquitous-language check: this migration does not model a new SRD rule or
change rule execution. No new RAW passage was required. The fixture-only species
choice uses an already supported test path; no Dragonborn runtime support was
added.

Reviewer-loop convergence:

- Round 1 findings: production support-gate behavior expansion, stale references
  to deleted PRD/plan files, closeout missing RAW/reviewer-loop notes, README
  wording tied to removed storage names, and battle QNT helper functions that
  still parsed protocol results from strings.
- Fixes: reverted the production support-gate change; moved fixture choice into
  tests; retargeted stale references to the ADR and this closeout; updated README
  wording; added the driver-kit negative test; changed migrated battle helpers to
  accept `WitnessResult` variants.
- Round 2 result: exact removed-name scans, stale-reference scans, typechecks,
  closure checks, unit tests, and focused MBT passed. Remaining
  `scenarioInvalidReason` strings are domain-local selected-identity projection
  labels, not the removed protocol storage convention; converting those belongs
  in a separate scenario-label modeling cleanup.
- Round 3 findings: stale shorthand references to the deleted typed-protocol PRD
  remained in docs, PRD/03 still described removed string protocol storage in its kit
  surface, ADR/README under-described the scenario-outcome follow-up, and
  character-package test readers repeated guarded casts. Fixes: removed the
  shorthand references, updated PRD/03 to typed protocol-record vocabulary,
  rewrote scenario-outcome wording as a current typed-replay-state rule, and
  replaced repeated reader casts with parsed record reads. Final typechecks,
  focused character MBT reruns, scans, and `git diff --check` passed.
