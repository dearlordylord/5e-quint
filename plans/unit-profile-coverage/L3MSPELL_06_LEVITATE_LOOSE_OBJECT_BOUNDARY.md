# L3MSPELL-06 Levitate Loose Object Boundary

Task 6 classified Levitate loose-object support against the current battle
reducer and object/spatial ownership boundaries. No runtime behavior, Surface
shape, QNT owner, or MBT driver was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Levitate` for the
  creature-or-loose-object target, 500-pound object gate, vertical rise,
  suspension, fixed-object-or-surface movement, caster altitude control,
  range constraint, and gentle-grounding text.
- `UBIQUITOUS_LANGUAGE.md#Movement` for Speed, Movement, and climbing
  terminology.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Invocation, and Spell Effect ownership.

Relevant RAW facts:

- Levitate is a level-2 Magic Action spell with 60-foot range and
  Concentration up to 10 minutes.
- The target can be one visible creature or one visible loose object.
- A loose object must weigh no more than 500 pounds.
- Only an unwilling creature gets the Constitution Saving Throw gate; objects
  do not.
- The target rises vertically up to 20 feet and remains suspended for the
  duration.
- The target can move only by pushing or pulling against a fixed object or
  surface within reach, moving as if climbing.
- The caster can change the target's altitude by up to 20 feet on the caster's
  turn; a non-self target must remain within spell range.
- When the spell ends, an aloft target floats gently to the ground.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/levitate.json` records the SRD target shape as one
  creature or object target, includes the loose-object filter with a 500-pound
  maximum, and models the unwilling-creature-only Constitution Saving Throw
  gate.
- The same Surface record carries the shared Levitate execution payload:
  initial rise up to 20 feet, spell-duration suspension, fixed-object-or-surface
  movement, self and caster altitude control, range-gated non-self movement, and
  gentle grounding when aloft.

Promoted creature branch:

- `plans/unit-profile-coverage/profiles.jsonl` binds
  `spell.invocation-levitated-creature` to the Levitate creature lifecycle QNT,
  runtime, and verification owners.
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/levitated-creature.ts`
  admits the profile from parsed Surface shape: level, Magic Action casting,
  60-foot range, 10-minute Concentration, one creature-or-object target with the
  loose-object filter, unwilling-creature Constitution Saving Throw gating, and
  the Levitate movement payload.
- `packages/battle-runtime/src/battle-reducer/levitate-creature.ts` owns the
  creature active effect, spell-owned altitude projection, altitude-control
  holes, target-within-range witness, fixed-object-or-surface movement witness,
  and active-effect cleanup helpers.
- `plans/unit-profile-coverage/task-claims.jsonl` records QNT proof and
  completed runtime parity for the promoted creature branch under
  `L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME`.

Existing closure ledger:

- `plans/unit-profile-coverage/unit-claims.jsonl` keeps `levitate` as
  `profile-subset-supported` under `spell.invocation-levitated-creature`.
  Its supported mechanics cover the creature branch and its deferred mechanic
  assigns the loose-object branch to a runtime-detached loose-object lifecycle
  and table/spatial vertical movement owner.
- Generated `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md` and
  `plans/unit-profile-coverage/level1-3-full-support.json` classify the
  residual as `closed-outside-battle-runtime-boundary`.

## Boundary Decision

Levitate creature support remains promoted under
`spell.invocation-levitated-creature`. The current reducer owns the
battle-visible creature consequences: Magic Action and Spell Slot spending,
caster-owned Concentration, active levitated creature altitude, caller-selected
initial rise, willing/unwilling creature targeting, target self-movement with a
fixed-object-or-surface witness, caster Magic Action altitude control with a
range witness, and cleanup on Concentration or duration end.

Levitate loose-object support is not promoted. The Surface Spell Definition
already records the loose-object target shape and 500-pound gate, but the
promoted battle runtime has no canonical loose-object position, weight,
aloft/grounded state, fixed-object attachment, surface reach, range derivation,
map geometry, or gentle-grounding lifecycle state to mutate and clean up.

Adding Levitate-specific object altitude state would duplicate the future
generic loose-object lifecycle owner. Reusing the creature active effect for
objects would also conflate creature Spell Effect state with object/spatial
state and would not make object reach, range, or gentle grounding executable.
The loose-object branch remains table/object-spatial adjudication until a
generic loose-object lifecycle owner exists.

## Plan Impact

- L3MSPELL-06 can close as boundary resolved.
- L3MSPELL-07 should remain unchanged; this task did not create a generic
  object-effect owner that Fireball can reuse.
- L3MSPELL-09 should remain unchanged; this task did not create a falling or
  automatic spatial derivation owner.
- L3MSPELL-11 can remain unchanged; this task did not find a selected-identity
  replay gap in the promoted creature branch.
- L3MSPELL-12 should include this note and the existing Levitate closure ledger
  when consolidating spell-boundary evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding object altitude, object range, object weight,
  aloft/grounded, fixed-object attachment, surface reach, map geometry, or
  gentle-grounding fields to `BattleState`. Those facts belong to a generic
  loose-object lifecycle or spatial owner, not to a Levitate-local reducer path.
- Round 2: retained the existing Surface loose-object facts and promoted
  creature branch. The loose-object branch is a real SRD mechanic, but the
  correct executable owner is future generic object/spatial lifecycle state, not
  duplicate spell-local object state.
