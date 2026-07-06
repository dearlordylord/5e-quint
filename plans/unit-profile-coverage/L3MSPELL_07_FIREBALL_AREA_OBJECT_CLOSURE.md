# L3MSPELL-07 Fireball Area Object Closure

Task 7 audited Fireball flammable-object and area-effect support against the
production battle reducer. No runtime behavior, Surface shape, QNT owner, or
MBT driver was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Fireball` for the
  point-origin Sphere, Dexterity Saving Throw, Fire damage, half damage on
  success, slot scaling, and flammable unworn/un-carried object ignition
  clause.
- `.references/srd-5.2.1/Rules-Glossary.md#Areas of Effect` and
  `.references/srd-5.2.1/Rules-Glossary.md#Sphere [Area of Effect]` for
  point-of-origin, Total Cover line blocking, and Sphere geometry.
- `.references/srd-5.2.1/Rules-Glossary.md#Breaking Objects`,
  `.references/srd-5.2.1/Rules-Glossary.md#Burning [Hazard]`, and
  `.references/srd-5.2.1/Playing-the-Game.md#What Is an Object` for object
  identity, object harm, object fire vulnerability adjudication, and the
  Burning hazard.
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Definition, Spell
  Invocation, and Spell Effect ownership.
- `UBIQUITOUS_LANGUAGE.md#Spellcasting` for Area of Effect terminology.

Relevant RAW facts:

- Fireball is a level-3 Action spell with 150-foot point range and
  Instantaneous duration.
- Each creature in the 20-foot-radius Sphere centered on the chosen point makes
  a Dexterity Saving Throw and takes 8d6 Fire damage on a failed save or half
  as much on a successful one.
- The damage increases by 1d6 for each Spell Slot level above 3.
- Flammable objects in the area start burning only if they are not being worn
  or carried.

## Existing Evidence Chain

Surface shape:

- `packages/surface/content/fireball.dhall` and generated
  `packages/surface/content/fireball.json` encode one `save_gate` phase and one
  `direct` phase sharing the same `fireball_point` area hole.
- The `save_gate` phase records the Dexterity Spell Save DC gate, 20-foot
  point-origin Sphere, 8d6 Fire damage, half damage on success, and
  slot-scaling from spell level 3.
- The `direct` phase records exactly one `ignite_objects` effect with
  `material = flammable` and `targetRelation = not_worn_or_carried`.

QNT witness/proof ownership:

- `packages/battle-runtime/battle-runtime-save-gated-spell.qnt` includes the
  `saveGatedAreaObjectIgnitionOutcomes` rule for Fireball. It emits
  `ObjectStartsBurning` only for `ObjectFlammableUnattended`.
- `packages/battle-runtime/battle-runtime-spell-facts-tests.qnt` proves the
  Fireball flammable-unattended object branch emits one starts-burning outcome
  and the worn-or-carried branch emits none.

Production reducer reachability:

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts`
  admits Fireball by parsed Surface shape and returns
  `postSaveAreaEffect: { kind: "fireballObjectIgnition" }`; this is not a
  test-only projection.
- `packages/battle-runtime/src/battle-reducer/spells-resolve-save-gates.ts`
  accepts only a `fireballArea` fill for that post-save area effect, rejects
  duplicate object facts, requires caller-supplied object ignition facts, and
  maps `flammableUnattended` facts to `startsBurning` outcomes.
- The reducer does not own automatic Sphere membership, Total Cover line
  clipping, object inventory discovery, flammable-material discovery,
  worn/carried discovery, grid geometry, or ongoing Burning hazard damage.
  Those remain table/spatial or future object/hazard owner facts supplied at
  the battle-runtime boundary.

Runtime and replay evidence:

- `packages/battle-runtime/src/unit-profile-admission-damage-spells.test.ts`
  covers Fireball admission, slot-scaled save damage, object ignition outcomes,
  empty-creature-area object ignition, and rejection when the required Fireball
  object ignition facts are omitted.
- `packages/battle-runtime/src/fireball-selected-identity.mbt.test.ts` replays
  Fireball selected identity through the production `spellAct` discovery path
  and asserts the admitted `saveGatedDamage` invocation includes
  `postSaveAreaEffect: { kind: "fireballObjectIgnition" }`.

Coverage ledgers:

- `plans/unit-profile-coverage/unit-claims.jsonl` now records `fireball` as a
  `supported-profile` under `spell.invocation-damage-save-or-attack`, with an
  explicit `table-spatial-derivation` closure for automatic area membership,
  line of effect, object inventory discovery, flammable/unworn object
  discovery, and grid geometry derivation.
- `plans/unit-profile-coverage/unit-evidence.jsonl` already records
  deterministic admission projection and selected-identity replay evidence for
  Fireball.
- `plans/unit-profile-coverage/profiles.jsonl` binds
  `spell.invocation-damage-save-or-attack` to the shared spell procedure QNT,
  runtime reducer, focused MBT, and runtime test owners.

## Boundary Decision

Fireball is promoted to a full supported Unit profile because its object
ignition effect is reachable from the real reducer path. The runtime-owned
slice is narrow: Magic Action and Spell Slot spending, caller-supplied
point-origin Sphere affected-creature facts, Dexterity save-gated Fire damage,
slot scaling, explicit caller-supplied object ignition facts, and emitted
starts-burning outcomes.

Automatic area membership, line of effect, object inventory discovery,
flammable-material discovery, worn/carried discovery, grid geometry, and
ongoing Burning hazard damage remain outside the Fireball reducer. Adding
Fireball-local object inventory or Burning state would duplicate future
generic object/hazard ownership rather than strengthening this profile.

## Plan Impact

- L3MSPELL-07 can close as Fireball area object support promoted through the
  existing reachable reducer path.
- L3MSPELL-11 should verify that its selected-identity audit keeps Fireball's
  `postSaveAreaEffect` assertion, because that is the production-reachability
  evidence for the object ignition branch.
- L3MSPELL-12 should include this note and the regenerated Fireball ledger
  claim when consolidating spell-boundary evidence.

## Reviewer Loop Convergence

- Round 1: rejected adding Fireball-local object inventory, environmental fire,
  or Burning hazard state. Those facts are not currently canonical in
  `BattleState` and would duplicate future generic object/hazard ownership.
- Round 2: promoted the Unit claim because the existing Surface, QNT, runtime,
  deterministic tests, and selected-identity QNT replay witness all route Fireball's
  caller-supplied flammable-object ignition facts through the production
  `saveGatedDamage` reducer path.
