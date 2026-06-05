# L3MSPELL-05 Enlarge/Reduce Object Lifecycle

Task 5 classified Enlarge/Reduce object growth, carried/worn item interactions,
and creature Size support against the current battle reducer. No runtime
behavior, Surface shape, QNT owner, or MBT driver was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce` for the
  spell target, object, carried/worn item, dropped-item, thrown weapon,
  ammunition, Size, Strength roll-mode, and damage clauses.
- `UBIQUITOUS_LANGUAGE.md#Movement` for Size category terminology.
- `UBIQUITOUS_LANGUAGE.md#Equipment` for Holding / Wielding terminology.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Invocation, and Spell Effect ownership.

Relevant RAW facts:

- Enlarge/Reduce is a level-2 Action spell with 30-foot range and
  Concentration up to 1 minute.
- The target can be one visible creature or object, but a targeted object must
  be neither worn nor carried.
- An unwilling creature makes a Constitution Saving Throw; a successful save
  leaves the spell with no effect.
- When a creature is targeted, its worn and carried items change size with it;
  dropped items return to normal immediately, and thrown weapons or ammunition
  return to normal immediately after the hit or miss.
- Enlarge and Reduce each move the target one Size category and project
  Strength Ability Check, Strength Saving Throw, and attack-hit damage effects.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/enlarge_reduce.dhall` and generated
  `packages/surface/content/enlarge_reduce.json` encode one creature-or-object
  target hole, object visibility, the neither-worn-nor-carried object filter,
  unwilling-creature Constitution Saving Throw gating, and the two authored
  effect modes.
- The same Surface record represents the creature branch by shape, not by a
  spell-name special case: one-step Size category modification, Strength
  Ability Check and Strength Saving Throw Advantage or Disadvantage, and the
  1d4 attack-hit damage adjustment with Reduce's minimum total damage floor.

Promoted creature branch:

- `plans/unit-profile-coverage/profiles.jsonl` binds
  `spell.invocation-creature-size-change` to the Enlarge/Reduce creature
  size-change profile and its QNT/runtime/test owners.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/creature-size-change.ts`
  admits the profile from the parsed Surface shape: level, Magic Action
  casting, 30-foot range, 1-minute Concentration, one creature-or-object target
  with the object filter, an unwilling-creature Constitution Saving Throw, and
  matching Enlarge/Reduce effect atoms.
- `packages/battle-runtime/src/battle-reducer/creature-size-change-effects.ts`
  owns the active creature Size projection, Strength roll-mode projection,
  attack-hit damage adjustment, single active-effect replacement, and cleanup
  helpers used by promoted runtime readers.
- `plans/unit-profile-coverage/task-claims.jsonl` already records
  `L12G-FOLLOWUP-ENLARGE-REDUCE-CREATURE-RUNTIME` QNT proof and completed
  runtime parity for the creature branch.

Existing closure ledger:

- `plans/unit-profile-coverage/unit-claims.jsonl` keeps `enlarge_reduce` as
  `profile-subset-supported` under `spell.invocation-creature-size-change`.
  Its supported mechanics cover the creature branch and its deferred mechanic
  assigns object Size-category lifecycle, carried/worn item size changes,
  dropped-item normalization, and thrown weapon or ammunition normalization to
  a runtime-detached object and item lifecycle owner.
- Generated `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md` and
  `plans/unit-profile-coverage/level1-3-full-support.json` already classify
  the residual as `closed-outside-battle-runtime-boundary`.

## Boundary Decision

Creature Size support is already promoted and should remain under
`spell.invocation-creature-size-change`. The current reducer owns the
battle-visible creature consequences: spell resource spending, caster-owned
Concentration, active Size projection, Strength roll modes, attack-hit damage
adjustment, and active-effect cleanup.

Object growth is not promoted. The battle runtime has typed object target facts
for specific spell profiles, but it does not own canonical object Size state or
a generic object lifecycle that can mutate and clean up an object's dimensions.
Adding Enlarge/Reduce-specific object Size state would duplicate that future
owner.

Carried and worn item interactions are not promoted. The creature branch
already models the attack-hit damage consequence without storing parallel item
Size facts. The RAW item clauses require equipment/item lifecycle state for
items changing with the creature, returning to normal on drop, and normalizing
thrown weapons or ammunition after the attack hit or miss. Those facts belong
to a generic object/item lifecycle owner, not to an Enlarge/Reduce-local battle
field.

## Plan Impact

- L3MSPELL-05 can close as boundary resolved.
- L3MSPELL-11 can remain unchanged; this task did not find a selected-identity
  replay gap in the promoted creature branch.
- L3MSPELL-12 should include this note and the existing Enlarge/Reduce closure
  ledger when consolidating spell-boundary evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding object Size, carried/worn item Size, dropped-item
  location, or thrown weapon/ammunition normalization fields to `BattleState`.
  Those would duplicate generic object, equipment, and occurrence lifecycle
  state.
- Round 2: retained the existing Surface object target facts and promoted
  creature branch. The object and item clauses are real SRD mechanics, but the
  right executable owner is a future generic object/item lifecycle, not a
  spell-local reducer path.
