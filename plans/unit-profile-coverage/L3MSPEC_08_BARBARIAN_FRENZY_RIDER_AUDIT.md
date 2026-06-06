# L3MSPEC-08 Barbarian Frenzy Rider Audit

Task 8 audits whether the existing `unit-feature.attack-damage-rider` owners
already cover Barbarian Frenzy. This task changes no runtime behavior, QNT,
Surface schema, Unit catalog admission, or generated coverage files.

## RAW And Vocabulary Checked

- `.references/srd-5.2.1/Classes/Barbarian.md:178-180`: Frenzy applies when
  Reckless Attack is used while Rage is active, then adds same-type d6 damage to
  the first target hit on the Barbarian's turn with a Strength-based attack.
  The number of d6s is equal to the active Rage Damage bonus.
- `UBIQUITOUS_LANGUAGE.md:34-38`: an Attack Damage Rider is attached to an
  attack-roll hit or attack damage step, and is optional only when RAW grants a
  choice.
- `UBIQUITOUS_LANGUAGE.md:138-143`: Rage and Reckless-style effects are Active
  Ongoing Feature Occurrences, so Frenzy must consume active feature facts
  rather than dispatching directly on authored feature identity.

## Existing Owners Checked

- `packages/surface/content/barbarian_frenzy.dhall` records the SRD feature as
  a mandatory once-per-turn on-hit trigger with the trigger
  `rage_active_and_reckless_attack_used_this_turn`, the
  `strength_weapon_or_unarmed_strike` attack filter, `same_as_attack` damage
  type, and `rage_damage_bonus` d6 dice source.
- `packages/surface/src/surface/schema-nonspell.ts` admits that trigger and
  dice source through the shared Attack Damage Rider schema instead of a
  Frenzy-only runtime shape.
- `packages/battle-runtime/src/unit-profile-admission-martial-action-features.test.ts`
  proves deterministic admission for `barbarian_frenzy` as
  `unit-feature.attack-damage-rider`, including mandatory, once-per-turn,
  Rage/Reckless first-hit trigger, and Rage Damage bonus d6 facts.
- `packages/shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core.qnt`
  owns the semantic core for Rage, Reckless Attack, and Frenzy. Its
  `resolveFrenzy` model consumes Rage active state, Reckless-while-Raging state,
  hit and Strength attack facts, eligible attack form, first-hit state, and
  Rage Damage bonus dice.
- `packages/battle-runtime/battle-runtime-feature-bridge.qnt` projects the
  battle-runtime Frenzy damage dice from the same focused Rage/Reckless core.
- `packages/battle-runtime/src/battle-reducer/barbarian-frenzy.ts`,
  `packages/battle-runtime/src/battle-reducer/attack-roll.ts`, and
  `packages/battle-runtime/src/battle-reducer/statblock-attacks.ts` implement
  the runtime path by reading parsed attack-damage rider profiles plus active
  Rage/Reckless ongoing feature facts. The reducer does not need a new
  `barbarian_frenzy` identity dispatch path for the rider semantics.
- `packages/battle-runtime/src/battle-runtime-class-action-features.test.ts`
  covers the production reducer behavior: mandatory Frenzy d6s appear on the
  first eligible Reckless Strength hit while Raging, are recorded as used this
  turn, and do not appear when Reckless Attack happened before Rage was active.
- `packages/battle-runtime/src/rule-core-features.mbt.test.ts` already carries
  selected-identity MBT replay evidence for `barbarian_frenzy` through
  `doFrenzy`.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/UNIT_REPORT.md` already classify
  `barbarian_frenzy` as supported by `unit-feature.attack-damage-rider` with
  deterministic admission and selected-identity MBT evidence.
- `plans/rules-kernel-coverage/qnt-owner-roles.jsonl` already records
  `unit-feature-rage-reckless-core.qnt` as the semantic core owner for Rage,
  Reckless Attack, and Frenzy first-hit semantics.

## Audit Decision

No missing Frenzy runtime slice was found. The current owners cover:

- prerequisite: active Rage plus Reckless Attack used while that Rage is active;
- host: first eligible attack-roll hit on the Barbarian's turn;
- attack filter: Strength-based weapon attack or Unarmed Strike;
- payload: mandatory same-type d6 attack damage;
- dice count: derived from the active Rage Damage bonus;
- limit: once per turn with runtime used-rider state;
- evidence: deterministic admission, production reducer tests, rule-core bridge
  examples, and selected-identity MBT replay.

Task 9 should not implement a second Frenzy runtime vertical. A new Task 9
implementation would duplicate already-owned attack-damage rider behavior and
would risk divergent Rage/Reckless/Frenzy state.

## Invalid States Rejected

- A second Frenzy-specific reducer path keyed by `barbarian_frenzy` identity is
  invalid. Frenzy runtime semantics are admitted through parsed
  `attackDamageRider` support facts and active ongoing feature profiles.
- A separate stored Frenzy dice-count fact is invalid. The dice count is derived
  from the active Rage Damage bonus owner.
- A separate stored Frenzy damage-type fact is invalid. The damage type is
  projected from the triggering weapon or Unarmed Strike damage type.
- A duplicate once-per-turn Frenzy tracker outside
  `attackDamageRidersUsedThisTurn` is invalid. The existing attack-damage rider
  usage state is the runtime boundary that matters.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Confirmed Frenzy is an Attack Damage Rider, not a standalone action.
- Confirmed Frenzy consumes Active Ongoing Feature Occurrence facts for Rage and
  Reckless Attack.
- Confirmed optionality is false because the SRD grants no player choice once
  the prerequisite and first-hit condition are satisfied.

Round 2 architecture and connascence pass:

- The strongest coupling is between Rage active occurrence, Reckless Attack
  occurrence, the Reckless-while-Raging turn fact, and first eligible hit state.
  That coupling is already localized in `unit-feature-rage-reckless-core.qnt`
  and `battle-reducer/barbarian-frenzy.ts`.
- Dice count and damage type remain derived at the execution boundary, so there
  is no duplicated state to synchronize with the source facts.
- Existing evidence uses profile admission and selected-identity replay; adding
  another owner would make the implementation less type-visible and more
  identity-coupled.

## Verification

- RAW/ubiquitous-language check performed from the local SRD and
  `UBIQUITOUS_LANGUAGE.md` references above.
- `pnpm unit-profile-coverage:check` passed.
- `pnpm rules-kernel-coverage:check` passed.
- `pnpm quality` failed in the existing `@dnd/app` typecheck lane on
  `packages/app/src/battle-scene/wizard-battle-demo-runtime.ts` and
  `packages/app/src/battle-scene/wizard-battle-demo.ts` API drift around
  reaction fields/helpers and `knownLanguages`. Those files are outside this
  audit task's touched ownership surface, so broad verification stopped there.
- MBT not run: this task is an audit artifact only and changes no runtime, QNT,
  profile parser, or MBT bridge behavior.
