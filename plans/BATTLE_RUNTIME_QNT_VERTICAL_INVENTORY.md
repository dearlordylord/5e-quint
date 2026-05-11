# Battle Runtime QNT Vertical Inventory

Date: 2026-05-11

This inventory is the controlling migration map for splitting
`packages/battle-runtime/battle-runtime.qnt`. It is intentionally policy-bearing:
each row records where semantic authority should move, what evidence already
exists, and what must be true before broad battle assertions can be deleted or
narrowed.

The two primary goals are:

1. Keep verification runnable by avoiding one broad state machine that combines
   every character-creation, battle, spell, feature, reaction, and monster
   branch.
2. Keep QNT readable by coding agents as battle behavior grows.

File splitting alone does not reduce state space. Runnability comes from
smaller selected entrypoints, fewer mutable variables per check, fewer broad
`any` branches, and focused hybrid trace contracts where TypeScript expands
operational fills around QNT-owned semantic checkpoints.

## Ownership Policy

- `rule-core-owned`: Generic SRD procedure semantics belong in
  `packages/shared-algebras/proofs/rule-core`. Package-local battle QNT should
  project into/out of those algebras or keep only integration fixtures.
- `battle-integration-owned`: Semantics require package-local `BattleState`,
  holes, replay, interrupt frames, current actors, or public reducer protocol
  behavior.
- `focused-mbt-owned`: A focused battle-runtime MBT lane owns runtime parity for
  this vertical. Broad battle QNT may keep smoke or selected composition checks.
- `broad-only-for-now`: Broad battle QNT is currently the only useful authority.
  These rows need an exit condition before more behavior is added.
- `ts-contract-owned`: Catalog breadth, authored ids, concrete fill payloads,
  and reducer public API replay should be checked in TypeScript, not multiplied
  through broad Quint state.

## Facade Import Finding

Quint `import child.* from "./child"` names are not re-exported by a parent
module. A probe on 2026-05-11 showed that `import facade.*` cannot see a value
that `facade` only imported from `source`.

Migration consequence: `battle-runtime.qnt` can remain the stable compatibility
entrypoint only for names it still defines directly. Moved names need one of:

- explicit wrapper definitions in `battle-runtime.qnt`;
- staged updates so focused MBT imports the narrower module directly;
- acceptance that a moved internal helper is no longer part of the facade.

This makes a pure "facade imports every child module" split insufficient.

## Vertical Matrix

| Vertical | Broad QNT area | Existing smaller authority | Policy | Integration pressure | First migration step | Done means |
| --- | --- | --- | --- | --- | --- | --- |
| Domain vocabulary and runtime fixtures | `Actor`, `DamageType`, `SpellInvocation`, `ActiveEffect`, `Combatant`, `BattleState`, `initialState` near the top of `battle-runtime.qnt` | Intentional inline package-local domain vocabulary; generic procedure types exist in rule-core | `battle-integration-owned` | High: almost every package-local helper depends on these names | Completion decision: keep broad runtime state vocabulary inline until a focused lane can direct-import a smaller package-local module; do not extract a mechanical `types.qnt` that requires facade wrappers for every promoted name | Package-local state vocabulary remains intentionally inline; generic semantics move to rule-core bridges without duplicating battle state |
| Public holes and replay vocabulary | `Hole`, `AttackReplay`, chained replay types | `battle-runtime-public-trace-contract.qnt`; `battle-trace-contract.ts`; TypeScript public reducer schemas and tests | `battle-integration-owned` plus `ts-contract-owned` | High: public reducer protocol and MBT bridge depend on shape | Tracer complete for semantic Attack hit/miss hole order through public trace checkpoints; TS owns concrete fill payload width and session protocol details | QNT owns semantic hole order/checkpoints; TS owns concrete public fill payload width |
| Initiative and turn rotation | `currentActor`, `nextInitiative`, `endTurn`, recharge/death-save wrappers | `action-turn-procedures.qnt`; `battle-runtime-movement-bridge.qnt` owns projected generic start-turn reset | `battle-integration-owned` | High: start/end turn touches effects, reactions, features, death saves, recharge, movement reset | Tracer complete for projected start-turn action/bonus/reaction/movement/Dodge/Disengage/Help/Ready reset; initiative order, spell slots, readied spell expiry, feature/effect hooks, Death Saving Throw and recharge wrappers remain package-local | Local turn module has narrow imports; generic action economy uses rule-core projection |
| Action economy and standard actions | `dashFighter`, `disengageFighter`, `dodgeFighter`, `readyFighter`, `helpFighterAttack`, action/bonus gates | `action-turn-procedures.qnt`; `battle-runtime-movement-bridge.qnt`; `rule-core-movement.mbt.qnt` and TS reducer tests | `rule-core-owned` for generic costs, `battle-integration-owned` for actor/projection | Medium | Tracer complete for Dash/Bonus Action Dash/Attack action/Magic action/Bonus Action/Disengage/Dodge/Ready Movement/Help Attack: broad battle projects turn facts through `BattleRuntimeMovementProjection` and keeps actor/source gating local | Broad QNT no longer hand-owns those basic action-spend semantics; remaining action gates with spell/resource/reaction coupling should move only with their verticals |
| Hidden, Hide, Search, reveal | `HiddenDiscoveryDc`, `hideFighter`, `searchGoblinForFighter`, `revealFighterHidden` | `action-turn-procedures.qnt` has Hide/Search facts; `battle-runtime-movement-bridge.qnt`; TS protocol owns prerequisites | `rule-core-owned` plus `battle-integration-owned` | Medium: reveal occurs from attacks and verbal spell casting | Tracer complete for Hide/Search action spend and check-vs-DC semantics; battle still records concrete discovery DC and reveal triggers | Hide/Search generic procedure facts route through rule-core; broad QNT keeps battle-owned DC projection and attack/verbal-spell reveal integration |
| HP damage, temporary HP, healing, zero-HP lifecycle, death saves | `applyDamage*`, `applyHealing`, `applyDropToZeroHp`, `applyDamageAtZeroHp`, `applyInstantDeath`, `applyStartTurnDeathSave` | `hit-point-damage.qnt`, `hit-point-recovery.qnt`, `zero-hit-point-lifecycle.qnt`, their inductive MBT files | `rule-core-owned` with package-local projection wrappers | Medium: concentration and active-effect damage-break hooks wrap HP changes | Tracer complete: `battle-runtime.qnt` projects `Combatant` into rule-core `CreatureVitals`, `DeathSavingThrowLifecycle`, and positive-HP Unconscious recovery; rule-core now owns zero-HP damage after Temporary Hit Points | Broad battle still keeps integration checks for concentration/effect hooks, but pure HP arithmetic and Death Saving Throw transition truth tables should move out of broad assertions as focused package-local parity grows |
| Damage type adjustments and reductions | `damageAfterAdjustments`, `sameTypeDamageAfterAdjustments`, Resistance spell reduction helpers | `damage-component-adjustments.qnt` now covers the full SRD damage-type set | `rule-core-owned` with package-local projection wrappers | Medium: package-local `DamageType` and `ActiveEffect` need projection | Tracer complete for generic damage adjustment math: broad battle maps package-local `DamageType` sets into `DamageAdjustmentFacts`; Resistance spell use-once state remains package-local | Generic resistance/vulnerability/immunity math is no longer duplicated in broad battle |
| Attack roll and attack damage composition | `attackHits`, `attackIsCritical`, Fighter/Goblin attack resolvers, critical range, Sneak Attack hooks | `attack-damage-composition.qnt`; `unit-feature-procedure-profiles.qnt`; `battle-runtime-feature-bridge.qnt` for feature riders | `rule-core-owned` for roll/damage procedure, `battle-integration-owned` for actor resources and riders | High: state mutation, hidden reveal, reactions, concentration, riders | Tracer complete for attack hit/critical math and Champion Improved Critical threshold; later split attack replay separately | Attack roll semantics are not locally duplicated; attack replay remains package-local |
| Extra Attack and attack-count continuations | `fighterExtraAttack*`, `spendFighterAttackActionOrExtraAttackSlot`, tests | `unit-feature-procedure-profiles.qnt`; `battle-runtime-feature-bridge.qnt`; `battle-runtime-extra-attack.mbt.qnt` | `focused-mbt-owned` plus `rule-core-owned` | Medium: movement/end turn can interleave | Tracer complete for Extra Attack slot open, spend, and end-turn close facts through feature bridge; focused MBT remains the runtime parity lane | Broad QNT keeps only integration examples for attack + movement + end turn |
| Off-hand attack and Light property | `offHandAttackFighter*`, light-weapon flag | `action-turn-procedures.qnt`; `attack-damage-composition.qnt`; `battle-runtime-movement-bridge.qnt`; TS reducer owns concrete held weapon identity | `rule-core-owned` for Light-property admission/damage modifier, `battle-integration-owned` for representative off-hand attack replay | Medium | Tracer complete: shared turn algebra owns Bonus Action admission/spend for the Light property's extra attack; attack composition owns the positive/negative ability modifier rule; broad QNT passes the representative "different Light weapon" fact through the bridge | Concrete public replay and held item identity remain TS-owned; broad QNT keeps only representative off-hand integration examples |
| Unit feature reactions and modifiers | Cutting Words, Deflect Attacks, Uncanny Dodge helpers | `unit-feature-procedure-profiles.qnt`; `battle-runtime-feature-bridge.qnt`; TS reducer focused tests | `rule-core-owned` for math/admission, `battle-integration-owned` for reaction frame | High: reaction timing and resource spend | Tracer complete for Cutting Words roll admission/math, Uncanny Dodge damage, and Deflect Attacks reduction/redirect facts through feature bridge | Broad battle tests only assert reaction composition, not feature-local math |
| Rage and Reckless Attack ongoing features | `ActiveOngoingFeatureOccurrence`, Rage/Reckless helpers, extension/expiry | `unit-feature-procedure-profiles.qnt`; `battle-runtime-feature-bridge.qnt` | `rule-core-owned` plus `battle-integration-owned` | High: end turn, concentration, attack rolls, spellcasting gates | Tracer complete for Rage damage bonus, physical resistances, spellcasting block, and Reckless Attack activation/incoming Advantage through feature bridge; occurrence storage and hook timing remain package-local | Rule-core owns Rage/Reckless reusable semantics; battle owns occurrence storage and hook timing |
| Movement budget and speed kinds | movement remaining/speed, Dash with speed kind, Roving hooks | `movement-spatial-grapple.qnt`; `battle-runtime-movement-bridge.qnt`; `unit-feature-procedure-profiles.qnt`; `rule-core-movement.mbt.qnt` | `focused-mbt-owned` plus `rule-core-owned` | Medium: opportunity attacks and grapple drag | Tracer complete for movement budget, chosen speed kind, stand-from-prone, and movement spend; battle owns Speed-kind projection and Roving/active-effect Speed facts | Focused movement MBT can import a narrow module later; broad QNT keeps composition smoke and package-local Speed projection |
| Grapple and Escape Grapple | `GrappleState`, `grappleFighterGoblin`, release, escape, drag-cost facts | `movement-spatial-grapple.qnt`; `battle-runtime-movement-bridge.qnt`; `rule-core-movement.mbt.qnt` | `rule-core-owned` for procedure, `battle-integration-owned` for actor hands and links | Medium | Tracer complete for Grapple admission by size/free hand/save, Escape Grapple action/check, and Grappled attack-roll Disadvantage; battle owns hand/link projection and free release | Broad QNT owns only battle link/hand integration and release projection |
| Opportunity attacks | `goblinCanOpportunityAttack`, `moveFighterWithSpeedKind`, reaction continuation | `movement-spatial-grapple.qnt`; `battle-runtime-movement-bridge.qnt`; `battle-runtime-interrupt-bridge.qnt`; `reactions-continuations-concentration.qnt`; TS reducer tests | `battle-integration-owned` | High: movement + reaction + attack + continuation | Tracer complete for generic trigger predicate and reaction take/decline contract; battle still owns concrete attack resolution and movement continuation resume | Narrow module has no cyclic import with attack resolution; broad QNT owns only projection, concrete resolver call, and interrupt-stack mutation |
| Reaction windows and interrupt stack | `PendingReactionFrame`, `InterruptFrame`, decline/resolve/resume, Shield reaction | `reactions-continuations-concentration.qnt`; `battle-runtime-interrupt-bridge.qnt`; focused reaction MBT | `battle-integration-owned` for concrete continuations | Very high: calls back into many resolvers | Tracer complete for package-local trigger/procedure/continuation contract classification and rule-core-backed take/decline decisions | Continuations are typed events/checkpoints or localized wrappers, not cross-module cycles; concrete continuation reducers remain package-local |
| Concentration | `concentrationSavingThrowDc`, `breakConcentration`, spell effect cleanup, damage concentration interrupt | `reactions-continuations-concentration.qnt`; `battle-runtime-concentration-bridge.qnt`; spell profile algebras | `battle-integration-owned` for cleanup/projection, `rule-core-owned` for generic DC/protocol facts | High: active effects, damage, spells, reactions | Tracer complete for damage-save DC: broad battle delegates DC arithmetic to rule-core through a bridge; effect cleanup and interrupt frames remain package-local | Rule-core owns generic concentration protocol; battle owns effect removal projection and interrupt stack composition |
| Stat-block resources and controls | recharge roll, Legendary Action window/use, Multiattack dispatches | `stat-block-controls.qnt`; `battle-runtime-stat-block-bridge.qnt`; `rule-core-stat-block-controls.mbt.qnt`; TS stat-block tests | `focused-mbt-owned` plus `rule-core-owned` | Medium: attack replay and end turn compose with dispatches | Tracer complete for Recharge roll, Legendary Action resource spend/admission, and Goblin Multiattack dispatch counts through stat-block rule-core bridge | Broad QNT keeps selected Multiattack + movement/end-turn integration only |
| Spell slot and spellcasting turn protocol | `spellInvocationSpendsLevelOneSlot`, `canExpendSpellSlotThisTurn`, spell action gates | `action-turn-procedures.qnt`; `battle-runtime-movement-bridge.qnt`; `spell-procedure-profiles.qnt`; TS resource tests | `rule-core-owned` plus `battle-integration-owned` | High: action/bonus/reaction costs and Rage gates | Tracer complete for Magic-action/Bonus-action cost projection in direct healing, scalar buffs, and Heroism; spell slot ledger, Rage gates, and authored spell profile support remain package-local | Broad QNT stops owning spell slot truth tables for every spell |
| Spell attack damage | Ray of Frost, Poison Spray, Chill Touch, Starry Wisp object, Eldritch Blast beams, Shocking Grasp, Guiding Bolt, Ray of Sickness, Produce Flame hurl | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; `battle-runtime-starry-wisp-object.mbt.qnt`; `battle-runtime-eldritch-blast.mbt.qnt`; TS spell tests | `rule-core-owned` for profile damage/effect/beam facts, `focused-mbt-owned` for object and beam verticals, `battle-integration-owned` for mutation | High: attack roll, reaction Shield, active effects, object damage, multi-beam replay | Tracer complete for SRD spell-attack profile damage types, hit riders, object-target support, Eldritch Blast beam count scaling, Force damage type, object targeting, and beam replay step classification through spell bridge; broad QNT maps bridge facts into package-local `ActiveEffect` and replay storage | Focused modules own replay/object/result breadth; broad battle keeps reaction/object smoke, beam target history, and package-local active-effect mutation |
| Save-gated damage and conditions | Acid Splash, Sacred Flame, Inflict Wounds, Burning Hands, Color Spray, Entangle, Animal Friendship, Charm Person, Vicious Mockery, Faerie Fire, Sleep repeat-save lifecycle | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; `rule-core-spells.mbt.qnt`; `battle-runtime-sleep-repeat-save.mbt.qnt`; TS tests | `rule-core-owned` for save profile facts and Sleep repeat-save lifecycle facts, `battle-integration-owned` for targets/effects and concentration cleanup | High: concentration and effect cleanup | Tracer complete for profile targeting, damage success policy, damage type, slot requirement, failed-save effects, target creature-type admissibility, target-list scaling, Charm Person hostile-save Advantage, and Sleep pending/repeat/unconscious/end-on-damage-shake facts through spell bridge | Save-gated families are grouped by procedure; broad QNT owns replay holes, target mutation, Sleep condition restoration, and concentration/effect cleanup |
| Direct healing and scalar buff spells | Cure Wounds, Healing Word, Mass Healing Word, False Life, Longstrider, Shield of Faith, Heroism | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; scalar buff focused MBT | `focused-mbt-owned` plus `rule-core-owned` | Medium | Tracer complete for direct hit-point restoration profile action cost, target count, and healing amount; scalar buff action, target count, temporary HP scaling, active-effect identity, and concentration requirement now route through spell bridge | Broad QNT keeps target mutation, temp-HP replacement, source/caster concentration cleanup, and selected integration assertions |
| Weapon and marked damage rider spells | Divine Favor, Divine Smite, Hunter's Mark, Ensnaring Strike, Searing Smite | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; unit-feature attack rider algebras | `rule-core-owned` for profile facts, `battle-integration-owned` for after-hit timing/concentration/target transfer | High: after-hit timing, concentration, target transfer, repeated damage | Tracer complete for Bonus Action profile, concentration requirement, damage type, duration, range, damage dice scaling, Divine Smite Fiend/Undead bonus dice, and Ensnaring Strike Large+ save Advantage through spell bridge | Broad QNT keeps after-hit timing, target mutation, mark transfer state, repeated damage ticks, and concentration cleanup |
| Chained spell attacks | Chromatic Orb replay, D8 duplicate-face, leap target history | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; TS chained spell tests | `rule-core-owned` for profile/math facts, `battle-integration-owned` for replay state and target history | High: custom replay state and ordered holes | Tracer complete for Chromatic Orb damage choices, damage type, slot scaling, d8 face accounting, duplicate-face detection, and leap-budget predicate through spell bridge | Broad battle keeps ordered replay holes, target history, and target-admission smoke |
| Attack-burst save damage | Ice Knife attack plus burst and single concentration check | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt` | `rule-core-owned` for Ice Knife profile facts, `battle-integration-owned` for combined resolver/concentration/reactions | High: combines attack, save, burst, concentration, reactions | Tracer complete for slot requirement, attack damage type, burst damage type, slot-scaled burst dice, and no-damage-on-success burst policy through spell bridge | Single-concentration behavior, hit reaction ordering, and target inclusion remain package-local integration facts |
| Object-target spell damage | Starry Wisp object target/disposition/outcome | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; `battle-runtime-starry-wisp-object.mbt.qnt`; TS object fill tests | `focused-mbt-owned` plus `ts-contract-owned` | Medium: object identity is caller/table supplied | Tracer complete for HP damage threshold, clamped next HP, and destruction result through spell bridge; object identity and table/disposition wrapping remain package-local | Broad battle does not enumerate object catalog/geometry |
| Active effect expiry and start/end hooks | `expireStartOfTurnSpellEffects`, `tickDurationActiveEffects`, Heroism THP, Resistance reset, timed effects | `spell-procedure-profiles.qnt`; `battle-runtime-spell-bridge.qnt`; spread across feature profile algebras | `battle-integration-owned` | High: one turn hook touches many features/spells | Tracer complete for Heroism turn-start Temporary Hit Points replacement, Resistance once-per-turn reset, Shield start-of-next-turn expiry, and timed spell duration tick/removal through spell bridge | Adding a timed effect requires one local hook entry and one focused semantic owner |
| Hybrid trace contract | Public reducer replay checkpoints | `battle-runtime-public-trace-contract.qnt`; `battle-trace-contract.ts`; `battle-trace-contract.test.ts` | `ts-contract-owned` plus focused QNT checkpoints | High but essential for north-star traces | Tracer complete for weapon Attack hit/miss replay: act availability, target hole, attack-roll hole, damage-roll-on-hit hole, and resolved checkpoint | QNT does not emit internal `BattleState` diffs; TS rolls representative public reducer traces with checkpoint projection |
| Broad package-local integration shell | Entire `battle-runtime.qnt`; broad `run` tests | Existing broad tests and MBT wrappers | `battle-integration-owned` with shrinking scope | High | Keep compatibility wrappers for moved public names only as needed | Broad file stops growing by default and records why each remaining vertical is broad |

## First Tracer-Bullet Recommendation

The first tracer started with attack roll critical/hit semantics:

- `attack-damage-composition.qnt` now exposes
  `naturalD20MeetsCriticalThreshold`.
- `battle-runtime.qnt` keeps compatibility helpers named `attackHits` and
  `attackIsCritical`, but delegates their generic SRD semantics to
  `attack-damage-composition.qnt`.

The second tracer re-anchored the HP lifecycle:

- `zero-hit-point-lifecycle.qnt` now exposes
  `applyDamageToZeroHitPointCreature`, covering Temporary Hit Points before
  Death Saving Throw failures at 0 HP.
- `battle-runtime.qnt` keeps package-local compatibility helpers for damage,
  healing, explicit drop-to-zero, instant death, and start-turn Death Saving
  Throws, but delegates the generic HP/death-save transitions to rule-core.
- The package-local wrappers still own battle integration facts: concentration
  cleanup, active-effect cleanup after caster/ally damage, and projection from
  `Combatant.lifecycle` into rule-core creature/death-save state.

The movement/grapple tracer then proved direct narrow imports for generic
movement facts:

- Movement/grapple tests whether a focused runtime lane can import narrower
  modules directly instead of the broad facade.

The current interrupt tracer splits the next highest-coupling boundary:

- `battle-runtime-interrupt-bridge.qnt` maps package-local reaction triggers,
  reaction procedures, and continuation kinds into rule-core reaction-window
  contracts.
- `battle-runtime.qnt` still mutates `BattleState`, calls concrete attack/spell
  resolvers, and resumes continuations, but take/decline admission now routes
  through the bridge.

The wrapper/import finding means larger moves should decide up front whether
the moved names remain facade-compatible wrappers or become direct imports for
focused MBT only.

The spell-profile tracer now includes object HP damage arithmetic:

- `spell-procedure-profiles.qnt` owns the generic object HP damage threshold,
  clamped next-HP, and destruction result.
- `battle-runtime-spell-bridge.qnt` projects those facts into package-local
  battle runtime shape.
- `battle-runtime.qnt` keeps object identity, spell damage type wrapping, and
  public object-damage disposition integration local.

The same spell-profile tracer now owns the reusable active-effect hook facts:

- Heroism turn-start Temporary Hit Points use the rule-core "keep the higher
  Temporary Hit Points" projection.
- Resistance once-per-turn state resets through the spell bridge at turn start.
- Shield's one-round AC bonus expiry and timed spell duration decrement/removal
  are bridge-projected, while the package-local scheduler still enumerates the
  concrete `ActiveEffect` variants.

The first hybrid trace contract now exists:

- `battle-runtime-public-trace-contract.qnt` owns a small checkpoint vocabulary
  and representative weapon Attack hit/miss checkpoint order.
- `battle-trace-contract.ts` projects public `AvailableBattleAct` and
  `BattleResolutionResult` values into that checkpoint vocabulary without
  exposing internal state diffs.
- `battle-trace-contract.test.ts` rolls real public reducer Attack hit/miss
  traces and compares only the checkpoint sequence.

The runtime-domain vocabulary row is intentionally closed without extraction:

- The facade/import probe showed that moving broad `battle-runtime.qnt` names
  into a child module would not re-export them to existing focused specs.
- `Actor`, `Combatant`, `BattleState`, `ActiveEffect`, `Hole`, and replay
  variants are high-connascence package-local integration vocabulary, not
  reusable SRD procedure semantics.
- Moving them now would create compatibility wrappers or parallel state names
  without reducing state space. Rule-core bridges should continue to receive
  projections from these inline types instead.

## Verification Policy

- Do not run battle-runtime MBT for exploratory inventory work.
- For a small QNT refactor, run focused `quint test` or targeted TypeScript
  tests that cover the moved helper.
- For end-to-end runtime behavior changes, follow the repo MBT protocol and run
  only the relevant focused MBT lane or the selected broad MBT once code changes
  are complete.
- If a vertical changes modeled rules, confirm SRD 5.2.1 anchors in the local
  corpus and `UBIQUITOUS_LANGUAGE.md` before implementation.
