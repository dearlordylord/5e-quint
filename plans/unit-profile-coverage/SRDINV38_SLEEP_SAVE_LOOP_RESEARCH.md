# SRDINV38 Sleep Save Loop Research

Task 228 researched Sleep's SRD 5.2.1 runtime shape. Sleep should be split
before implementation because target admission, repeat-save timing, and wake-up
cleanup are separate executable invariants.

## Source Review

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Sleep`: point-origin
  5-foot-radius Sphere, caster-chosen creatures, Wisdom save, Incapacitated
  until the end of each failed target's next turn, repeat save at that moment,
  Unconscious on the failed repeat save, target-specific ending on damage or
  adjacent action to shake the target out, and automatic save success for
  creatures that do not sleep or have Immunity to Exhaustion.
- `.references/srd-5.2.1/Rules-Glossary.md#Incapacitated-Condition`:
  Incapacitated blocks actions, Bonus Actions, and Reactions; breaks
  Concentration; blocks speech; and affects Initiative.
- `.references/srd-5.2.1/Rules-Glossary.md#Unconscious-Condition`:
  Unconscious implies Incapacitated and Prone, drops held items, keeps the
  creature Prone after Unconscious ends, sets Speed to 0, grants attack-roll
  Advantage against the target, causes automatic Strength/Dexterity save
  failure, and causes adjacent hit Critical Hits.
- `.references/srd-5.2.1/Rules-Glossary.md#Concentration`: Concentration ends
  when the creator has Incapacitated or dies, and concentration-owned effects
  end when Concentration is lost.
- `.references/srd-5.2.1/Rules-Glossary.md#Exhaustion-Condition`: Exhaustion is
  a distinct leveled condition; Sleep keys on Immunity to Exhaustion, not on a
  current Exhaustion level.
- `UBIQUITOUS_LANGUAGE.md`: checked Condition Immunity, Exhaustion Immunity,
  Incapacitated, Unconscious, Concentration, Duration, Area of Effect, Target,
  Creature, Magic Action, Saving Throw, and Action vocabulary.

## Current Model Surface

`packages/surface/content/sleep.dhall` already records the SRD 5.2.1 shape:

- `range = { kind = "point", feet = 60 }`
- `duration = { kind = "concentration", upTo = 1 minute, earlyEnd =
  target_takes_damage }`
- one `save_gate` attached to a point-origin 5-foot-radius Sphere
- Wisdom save against caster Spell Save DC
- failed initial save applies `incapacitated`
- `repeatSave.cadence = "end_of_target_turn"`
- failed repeat save applies `unconscious`

The Surface record is still explicitly partial: it defers the non-sleeper /
Exhaustion-immune auto-success predicate and the adjacent shake-awake action.

## Runtime State

Sleep is currently unsupported in `@dnd/battle-runtime`.

- `packages/battle-runtime/src/unit-profile-admission.test.ts` has an explicit
  guard that Sleep remains unsupported by the Color Spray condition-save
  admission path.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts`
  rejects current save-gated condition profiles when `"repeatSave" in phase`.
- Existing `spellCondition` effects can represent one condition with one
  expiration, optional caster-or-ally damage escape, and optional turn-start
  damage. They do not represent a pending per-target repeat save or escalation
  from one condition to another.
- Existing `BattleActiveEffectExpiration` has start-turn, end-turn with an
  explicit round, concentration, and duration forms. That can anchor the initial
  Incapacitated window, but it cannot by itself store "repeat the save exactly
  when this expires, then either end this target's Sleep effect or replace it
  with Unconscious."
- `conditions-algebra.ts` correctly projects Unconscious as Prone and
  Incapacitated, and keeps Prone when Unconscious ends. Sleep can reuse that
  behavior for the second failed save.
- `removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly` is too narrow
  for Sleep: RAW says the spell ends on a target if it takes damage from any
  source.
- There is no current runtime command for "someone within 5 feet takes an
  action to shake the target out" with table-supplied adjacency facts.

## Required Split

Do not implement Sleep as one omnibus task. Split it into the following
runnable tasks.

1. **Sleep target admission and automatic-save boundary**

   Add a Sleep-specific invocation projection for SRD 5.2.1 Sleep only. It
   should accept a caller-supplied point-origin 5-foot-radius Sphere target set
   and produce Wisdom saving throw holes for selected creatures that are not
   automatic successes. Exhaustion Immunity can be derived from existing
   stat-block `immunities.conditions` data where present. The non-sleeper fact
   is not currently modeled and needs an explicit domain shape before it can be
   executable; do not infer it from creature type or species name.

2. **Sleep pending repeat-save lifecycle**

   Add a per-target Sleep effect that makes the initial failed-save state
   explicit: Incapacitated until that target's next turn ends, with a required
   repeat Wisdom save at that boundary. On repeat success, the target's Sleep
   effect ends. On repeat failure, replace the pending Incapacitated effect
   with a concentration-owned Unconscious effect. The implementation should
   encode this as a typed lifecycle state rather than a generic
   `spellCondition` plus an implicit convention.

3. **Sleep wake-up and Concentration cleanup lifecycle**

   Add target-specific cleanup for both Sleep stages. Damage from any source
   ends Sleep on that target. A separate action command should allow a creature
   within 5 feet to shake the target out using a caller/table-supplied adjacency
   fact, spending that helper's action. Breaking the caster's Concentration must
   remove every remaining Sleep effect. This task should also verify that
   Unconscious removal leaves Prone, reusing the shared condition algebra.

## Modeling Notes

- Sleep no longer uses the 2014 HP-pool allocation model. No target allocation
  by current Hit Points should be introduced.
- The point-origin Sphere should follow the existing caller-supplied spatial
  fact pattern. Do not add grid state, pathfinding, or cached area membership.
- Sleep's first stage is not simply "a one-round Incapacitated spell
  condition"; it owns the repeat-save obligation. The obligation must be
  executable at the end-turn boundary.
- Sleep's second stage is not the positive-HP Knock Out lifecycle. It is a
  spell-owned Unconscious condition on a target with ordinary HP. Do not use
  `positiveHpUnconscious`, which is specifically for the melee Knock Out rule.
- Unconscious implies Incapacitated, so the second stage should not preserve a
  separate direct Incapacitated source after escalation unless a non-Sleep
  source already existed.

## Verification Guidance

Implementation tasks should use focused package-local runtime tests first.
Battle-runtime MBT is appropriate only after a behavior-changing Sleep
implementation is complete and should use the Tier 1 protocol from
`AGENTS.md`.

`pnpm unit-profile-coverage:check` is not required by this research note
because no generated inventory evidence changed.

## reviewer loop Convergence

- Round 1: split the apparent "save-gated condition spell" into separate
  target admission, pending repeat-save lifecycle, and wake-up cleanup tasks.
- Round 2: removed the tempting `spellCondition` reuse as the primary model for
  the first stage because it would hide the repeat-save obligation in an
  expiration convention. The remaining split keeps each executable invariant
  type-visible.
