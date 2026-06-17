# 2026-06-16 Flagged QNT Improvement Tasks

This research replaces the broad `flagged` bucket with per-driver improvement
tasks for the 19 source QNT drivers that were flagged before the 2026-06-17
implementation pass.

Pre-implementation baseline checked with `pnpm cleanroom-branch-coverage:check`:
pass, 463 source branch obligations and 15 sampled inputs.

Implementation status after the 2026-06-17 pass:

- The 13 branch-scope-ready drivers have been added to
  `plans/cleanroom-branch-coverage/branch-scope.jsonl`.
- `battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt` is now
  documented as whole-driver `out`, and the `rule-core-features.mbt.qnt`
  Mycelium branch is explicitly source-blocked.
- The 5 remaining sequential mixed drivers were added to branch inventory with
  explicit `transit-only` replay decisions instead of source rewrites.
- The generated branch inventory now has 684 obligations and 24 sampled inputs.
- No `flagged` source drivers remain for the current level-1/2 harness.

## Summary

- Flagged drivers researched: 19.
- Whole-driver inclusion without branch decisions: 0.
- Branch-scope ready without source QNT rewrites: 18.
- Source QNT cleanup or split required before active inclusion: 0.
- Whole-driver out/source-blocker: 1.

`branch-scope.jsonl` can represent per-action scope and replay decisions, but
several drivers use a sequential `qReplayIndex`. In those drivers, an
out-of-scope action can be required to reach a later in-scope action. The
current harness handles that explicitly with `transit-only`: those branches are
allowed as pass-through actions, but are not target obligations for the
level-1/2 cleanroom run.

## Research Basis

- Scope mechanics: `plans/cleanroom-branch-coverage/branch-scope.jsonl` and
  `scripts/cleanroom-branch-coverage-check.cjs`.
- Current decisions: `plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md`.
- Domain terms: `UBIQUITOUS_LANGUAGE.md` and
  `packages/character-creation-runtime/VOCABULARY.md`.
- RAW anchors: `.references/srd-5.2.1/Character-Creation.md`,
  `.references/srd-5.2.1/Classes/*.md`,
  `.references/srd-5.2.1/Feats.md`,
  `.references/srd-5.2.1/Playing-the-Game.md`,
  `.references/srd-5.2.1/Rules-Glossary.md`, and
  `.references/srd-5.2.1/Spells/*.md`.

## Task Cards

### FQNT-001: character creation class feature selected identity

Driver:
`packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doSelectBardExpertise`, `doProjectClericChannelDivinity`,
`doProjectDruidWildShape`, `doProjectDruidWildCompanion`,
`doProjectMonksFocus`, `doProjectMonkUncannyMetabolism`,
`doSelectPaladinFightingStyle`, `doSelectRangerDeftExplorer`,
`doSelectRangerFightingStyle`, `doProjectWarlockPactMagic`,
`doSelectWizardScholar`.

Out branches:
`doSelectWizardEvocationSavant`; Wizard Evocation Savant is a level 3 subclass
feature.

Task:
Add the driver to `branch-scope.jsonl` with default in-scope replay from
`step`, add one out-of-scope branch decision for `doSelectWizardEvocationSavant`,
and change the full driver decision from `flagged` to an in-scope branch-scoped
decision.

### FQNT-002: rogue expertise selected identity

Driver:
`packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doSelectLevelOneOwnedSkillExpertise`.

Out branches:
`doSelectLevelSixAdditionalOwnedSkillExpertise`; Rogue gains the additional
Expertise instance at level 6.

Task:
Add the driver to `branch-scope.jsonl` with default in-scope replay from
`step`, add an out-of-scope branch decision for the level 6 branch, and mark the
driver as branch-scoped in the source decision table.

### FQNT-003: warlock eldritch invocations selected identity

Driver:
`packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doSelectLevelOneArmorOfShadows`, `doGainLevelTwoInvocations`,
`doRejectDuplicateInvocationSelections`.

Out branches:
`doReplaceArmorWithEldritchMindOnWarlockLevelGain`,
`doReplaceRepeatableInvocationByChoice`,
`doRejectPrerequisiteRetainedInvocationReplacement`; these use Warlock level 3+
or level 5 prerequisite/replacement facts.

Task:
Add a branch-scoped inventory row and mark the later-level replacement branches
out. Keep the level 1/2 invocation acquisition and duplicate-selection
projection active.

### FQNT-004: character sheet arcane recovery selected identity

Driver:
`packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt`

Disposition: branch-scope ready, with one source-improvement task.

In-scope branches:
`doResetArcaneRecoveryOnLongRest`, `doRejectPactSlotArcaneRecovery`.

Current out branch:
`doRecoverSecondLevelSpellSlot`; a second-level slot recovery requires a Wizard
level high enough to recover two combined slot levels, outside level 1/2.

Task:
Branch-scope the existing driver, marking `doRecoverSecondLevelSpellSlot` out.
Add a follow-up QNT improvement to introduce a level 1 legal recovery branch,
for example `doRecoverFirstLevelSpellSlot`, so Arcane Recovery has an in-scope
happy path instead of only reset/rejection coverage.

### FQNT-005: character sheet class feature selected identity

Driver:
`packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doProjectBardJackOfAllTrades`, `doProjectPaladinsSmite`,
`doProjectRangerFavoredEnemy`.

Out branches:
`doProjectClericLifeDomainSpells`, `doProjectDruidCircleLandSpells`,
`doProjectPaladinOathDevotionSpells`, `doProjectSorcererDraconicSpells`,
`doProjectWarlockFiendSpells`; these are subclass/domain/patron spell features
reached at level 3+.

Task:
Add branch-scope coverage for the level 1/2 branches and mark subclass spell
feature branches out for the current cleanroom scope.

### FQNT-006: character sheet spell slots and pact slots

Driver:
`packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`

Disposition: active branch-scoped driver with one transit-only branch and one
out terminal branch.

In-scope branches after cleanup:
capacity rejection for full-caster level 2, pact over-capacity rejection,
pact-slot short-rest recovery, long-rest ordinary/pact/created-level-1 cleanup,
rest interruption behavior, Magical Cunning recovery/rejection, and Arcane
Recovery over-refund rejection using level 1 legal slot facts.

Current out or rewrite branches:
`doShortRestArcaneRecoveryRefundsOrdinarySpellSlot` uses full-caster level 4 and
level 2 slot recovery. `doRejectArcaneRecoveryPactSlotRefund` currently reuses
the same level 4 fixture even though the rejection rule itself is in-scope.

Task:
Implemented on 2026-06-17 by adding the driver to `branch-scope.jsonl`.
`doShortRestArcaneRecoveryRefundsOrdinarySpellSlot` is out-of-scope and
transit-only; `doRejectArcaneRecoveryPactSlotRefund` is out-of-scope and
observable. A future source cleanup can still replace the rejection fixture with
level-1 legal ordinary-slot facts, but it is no longer a harness blocker.

### FQNT-007: character battle init projection

Driver:
`packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`

Disposition: active branch-scoped driver with one transit-only branch.

In-scope branches:
`doProjectSheetHitPointsArmorClassConditionsAndProfiles`,
`doRejectBuildMaximumAboveBuildMaximum`,
`doRejectStableRecoveryProgressDuringInit`.

Current out branch:
`doProjectSheetSpellcastingAndMetamagic`; it projects spell level 2 and level 3
capacities, which are not reachable for a level 2 Sorcerer even though
Metamagic itself is level 2.

Task:
Implemented on 2026-06-17 by adding the driver to `branch-scope.jsonl`.
`doProjectSheetSpellcastingAndMetamagic` is out-of-scope and transit-only. A
future source cleanup can split or replace the higher-slot projection with a
level-2 legal Sorcerer projection, but it is no longer a harness blocker.

### FQNT-008: character battle settlement

Driver:
`packages/character-battle-runtime/character-battle-settlement.mbt.qnt`

Disposition: active branch-scoped driver with one transit-only branch.

In-scope branches:
hit point/condition/level-1-slot/pact settlement, feature-resource expenditure,
identity mismatch rejection, maximum-HP drift rejection, active Wild Shape
handoff rejection, stable-recovery-progress rejection, and zero-HP stable
lifecycle settlement.

Out branch:
`doRejectAmbiguousCreatedSpellSlotSource`; the concrete fixture uses a created
level 3 slot, outside level 1/2.

Task:
Implemented on 2026-06-17 by adding the driver to `branch-scope.jsonl`.
`doRejectAmbiguousCreatedSpellSlotSource` is out-of-scope and transit-only. A
future source cleanup can move the created-level-3 ambiguity branch to a
later-level driver, but it is no longer a harness blocker.

### FQNT-009: character sheet feature resources

Driver:
`packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt`

Disposition: active branch-scoped driver with four transit-only branches and
one out terminal branch.

In-scope branches:
Lay On Hands restore/reject/long-rest reset, Druid Wild Shape and Monk Focus
short-rest recovery, level 2 Sorcerer point-pool long-rest cleanup, Uncanny
Metabolism use-state/recovery/rejection, and a Metamagic bridge rewritten to a
level 2 legal sorcery-point capacity.

Current out or rewrite branches:
`doFontOfMagicSlotToPoints`, `doRejectFontOfMagicAmbiguousSlotSource`,
`doFontOfMagicPointsToSlot`, `doRejectFontOfMagicInsufficientPoints`, and
`doMetamagicBridgeUsesSharedPointPool` currently use level 2 slots, level 3
created slots, Sorcerer level 3/5 assumptions, or a five-point pool.

Task:
Implemented on 2026-06-17 by adding the driver to `branch-scope.jsonl`.
The higher-slot Font of Magic branches before later in-scope steps are
out-of-scope and transit-only; the five-point metamagic bridge is out-of-scope
and observable. Future source cleanup can still split higher-slot Font of Magic
coverage or add level-2 legal conversion examples, but it is no longer a
harness blocker.

### FQNT-010: ability check choice search

Driver:
`packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
Search target/ability holes and rejection/resolution branches, plus Guidance
skill-choice branches.

Out branches:
`doEnhanceAbilityChoiceOpen`, `doEnhanceAbilityInvalidSkillFillRejected`,
`doEnhanceAbilityDex`; Enhance Ability is a level 2 spell.

Task:
Add the driver to branch scope with the Enhance Ability branches marked out.
The in-scope Search and Guidance branches do not require traversing the
out-of-scope branches.

### FQNT-011: after-hit damage riders

Driver:
`packages/battle-runtime/battle-runtime-after-hit-damage-riders.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
weapon-hit discovery/fills, Divine Smite slot and free-cast choices/fills,
Ensnaring Strike choices/fills/start-turn damage/escape, and Searing Smite
choices/fills/start-turn damage and save.

Out branches:
`doChooseShiningSmite`, `doFillShiningSmiteDamage`,
`doBreakShiningConcentration`, `doStartShiningSmite`; Shining Smite is a level
2 spell.

Task:
Add branch-scope coverage for non-Shining branches and mark Shining Smite
branches out for the current level 1/2 assignment.

### FQNT-012: condition saving throw selected identity

Driver:
`packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doResolveColorSprayFailedSavingThrow`, `doResolveEntangleFailedSavingThrow`,
`doResolveHideousLaughterRepeatSavingThrowSuccess`,
`doResolveSleepRepeatSavingThrowFailure`.

Out branches:
`doResolveBlindnessDeafnessBlindedSavingThrow`,
`doResolveBlindnessDeafnessDeafenedSavingThrow`,
`doResolveHoldPersonFailedSavingThrow`,
`doResolveHoldPersonRepeatSavingThrowSuccess`,
`doResolveHypnoticPatternFailedSavingThrow`; these are spell level 2 or 3
condition profiles.

Task:
Add the driver with branch decisions for spell level 2+ condition branches.

### FQNT-013: movement forced movement selected identity

Driver:
`packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doDissonantWhispersForcedReactionMovement`, `doCommandFleeTargetTurn`,
`doExpeditiousRetreatImmediateDash`, `doMonkUnarmoredMovementDash`.

Out branches:
`doRangerRovingClimbSwimMovement`, `doBarbarianFastMovementDash`; Roving is
Ranger level 6 and Fast Movement is Barbarian level 5.

Task:
Add branch-scope coverage for the level 1 spell and Monk level 2 movement
branches, and mark level 5/6 class movement branches out.

### FQNT-014: Mycelium Step selected identity

Driver:
`packages/battle-runtime/battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt`

Disposition: whole-driver out/source-blocker.

Out branches:
`doDiscoverMyceliumStepDash`, `doDashAsBonusAction`.

Reason:
The copied SRD 5.2.1 corpus has no `Mycelium Step` RAW heading or acquisition
level. Repo test support treats this as a synthetic mechanics-only fixture, not
an SRD level 1/2 source obligation.

Task:
Do not add this driver to active branch scope. Change its full driver decision
from `flagged` to `out` or source-blocked documentation with the concrete
reason above. Keep any existing TS/QNT mechanics tests as non-SRD mechanics
fixtures unless a future source-authority task supplies redistributable RAW.

### FQNT-015: reaction casting time

Driver:
`packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doHellishRebukeAfterDamage`; Hellish Rebuke is a level 1 reaction spell.

Out branches:
`doCounterspellEndsSpellCast`, `doCounterspellAllowsSpellCastResume`;
Counterspell is a level 3 spell.

Task:
Add branch-scope coverage for the Hellish Rebuke timing branch and mark
Counterspell branches out.

### FQNT-016: reaction spell selected identity

Driver:
`packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
`doResolveShieldReactionSpellHit`, `doResolveHellishRebukeFailedSavingThrow`.

Out branches:
`doResolveCounterspellMagicMissileCast`; Counterspell is a level 3 spell.

Task:
Add branch-scope coverage for Shield and Hellish Rebuke, and mark Counterspell
out.

### FQNT-017: rule-core ability, skill, and Command

Driver:
`packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`

Disposition: active branch-scoped driver with one transit-only branch.

In-scope branches:
Search fail/success, all Guidance skill projection branches, and all Command
cast/follow branches.

Out branch:
`doEnhanceAbilityChoice`; Enhance Ability is a level 2 spell.

Task:
Implemented on 2026-06-17 by exposing the `step` branches as named actions and
adding the driver to `branch-scope.jsonl`. `doEnhanceAbilityChoice` is
out-of-scope and transit-only. Future source cleanup can split Enhance Ability
into a later-level driver, but it is no longer a harness blocker.

### FQNT-018: rule-core features

Driver:
`packages/battle-runtime/rule-core-features.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
Action Surge, Second Wind, Tactical Mind, Cunning Action, Rage, Reckless Attack,
Sneak Attack, Savage Attacker, Orc-style zero-HP replacement, Defense, and
Archery.

Out branches:
`doFrenzy`, `doImprovedCritical`, `doEvasionSuccess`, `doEvasionFailure`,
`doCuttingWordsDamage`, `doDeflectAttacksDamageReduction`, `doUncannyDodge`,
`doCombatProwessMissToHit`; these are level 3+, level 5+, level 7+, or level 19
feature/boon branches.

Source-blocked branch:
`doMyceliumStepDash`; no SRD source heading or acquisition level exists in the
copied corpus.

Task:
Add the driver to branch scope with later-level branch decisions and a
source-blocker replay decision for `doMyceliumStepDash`. Do not use this branch
as evidence that Mycelium Step is in cleanroom scope.

### FQNT-019: rule-core spells

Driver:
`packages/battle-runtime/rule-core-spells.mbt.qnt`

Disposition: branch-scope ready.

In-scope branches:
Magic Missile, Ray of Frost, Acid Splash, Healing Word, Cure Wounds, Mage
Armor, one-slot-per-turn rejection, Ready Spell hold, and release of the readied
level 1 spell.

Out branches:
`doMassHealingWordNeedsTargetList`, `doMassHealingWordNeedsHealingRoll`,
`doMassHealingWordWounded`, `doMassCureWoundsNeedsTargetList`,
`doMassCureWoundsNeedsHealingRoll`, `doMassCureWoundsWounded`; Mass Healing
Word is spell level 3 and Mass Cure Wounds is spell level 5.

Task:
Add branch-scope coverage for cantrip/level-1 spell branches and mark mass
healing branches out for the current assignment.

## Implementation Order

1. Done on 2026-06-17: apply the 13 branch-scope-ready tasks first. These only
   needed `branch-scope.jsonl`, full driver decision notes, and generated
   artifact refresh.
2. Done on 2026-06-17: mark
   `battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt` out or
   source-blocked. Do not add it to the active queue.
3. Done on 2026-06-17: resolve the five sequential/rewrite drivers with
   explicit branch-level `transit-only` decisions:
   `character-sheet-spell-slots-pact-slots.mbt.qnt`,
   `character-battle-init-projection.mbt.qnt`,
   `character-battle-settlement.mbt.qnt`,
   `character-sheet-feature-resources.mbt.qnt`, and
   `rule-core-ability-skill-command.mbt.qnt`.
4. Done on 2026-06-17: refresh generated cleanroom artifacts.

## Verification For Later Implementation

For branch-scope-only implementation:

```sh
pnpm cleanroom-branch-coverage:check -- --write
pnpm cleanroom-branch-coverage:check
pnpm cleanroom-scaffold:check
git diff --check -- plans/cleanroom-branch-coverage plans/cleanroom-scaffolds/tasks
```

For source QNT cleanup or splits, also run:

```sh
pnpm check:mbt-driver-closure
pnpm --filter @dnd/battle-runtime exec vitest run src/rule-core-ability-skill-command.mbt.test.ts
```

Run focused MBT only after source QNT or TS witness behavior changes, following
the repository MBT scarcity protocol.
