# Proposal: Mage Hand — Structural Widening

## Unit
- Slug: `mage_hand`
- Kind: `spell` (cantrip, level 0)
- School: Conjuration
- Provenance: SRD 5.2.1

## Outcome: `structural_widening`

No existing `SpellMechanics` family can honestly encode Mage Hand. A new family is required.

---

## Why Every Existing Family Fails

### `ongoing_effect`
Requires an `OngoingOperation` — either `roll_modifier` (adds dice delta to attack rolls / saving throws) or `damage_on_hit` (rider damage on caster hits). Mage Hand has neither. Forcing a fake operation would produce a false trace.

### `activation`
Requires `ActivationPhase[]` — each phase must be `attack_roll` or `save_gate`. Mage Hand involves no attack roll and no saving throw.

### `triggered_reaction`
Requires a reaction `CastingTime` with a `ReactionTrigger`. Mage Hand is cast using a standard Action.

### `anchored_trigger`
Models a planted trap/ward that fires passively on a matching event (Alarm pattern). Mage Hand is an actively commanded proxy the caster directs each turn by spending a Magic action. It is not a passive armed trigger.

---

## What the Spell Actually Requires

### 1. New Family: `object_proxy` (structural)

The core shape is:
- **Cast** → create a persistent object (`create_object` v4 atom) at a point within range
- **Object** persists for the duration (timed, 1 minute, non-concentration)
- **Caster** can issue commands via a recurring action cost (Magic action on later turns)
- **Object** has a constrained, enumerated capability set
- **Self-break conditions** on the object: proximity tether (> 30 ft from caster) and replaced on recast

This "create controllable object + recurring command action" pattern does not exist in the current surface.

**The v4 atom inventory already has the building blocks:**

| Atom | Category | Role |
|---|---|---|
| `create_object` | effect | creates the spectral hand |
| `object` | attachment | the hand is the attachment target for its actions |
| `activate` | procedure | each subsequent-turn command is an activation |
| `action_quota` | resource | Magic action consumed per command turn |
| `self_break` | lifecycle | proximity-tether vanish condition |
| `replace_on_recast` | lifecycle | vanish when spell is cast again |
| `persist` / `expire` | lifecycle | 1-minute timed duration |

What is missing is a surface family that composes these into the correct shape.

**Proposed minimal surface sketch (not a type proposal — authoring intent only):**

```
ObjectProxyMechanics = SpellMechanicsHeader & {
  family: "object_proxy"
  // Where the object is placed at cast time
  origin: Range
  // What the object can do when commanded
  capabilities: ReadonlyArray<ObjectInteractionKind>
  // Self-break conditions beyond duration expiry
  selfBreak: ReadonlyArray<ObjectSelfBreakCondition>
  // Cost to command the object on a subsequent turn
  commandCost: "action" | "bonus_action" | "magic_action"
}
```

### 2. New Atom: `interact_object` (atom widening)

The hand's capability set is a deterministic, SRD-enumerated list:
- manipulate an object
- open an unlocked door or container
- stow or retrieve an item from an open container
- pour the contents out of a vial

The SRD also enumerates what the hand **cannot** do: attack, activate magic items, carry > 10 lbs. This is a closed mechanical rule, not DM adjudication (per ARCHITECTURE.md, deterministic enumerated constraints belong in core).

No v4 effect atom covers non-combat environment-object interaction. A new `interact_object` atom (or a closed `ObjectInteractionKind` enum) is needed.

### 3. New Surface Variant: Proximity Tether Self-Break

The `self_break` lifecycle atom exists in v4 but has no surface type. The tether — "vanishes if ever more than 30 feet away from you" — is a distance-based break condition on a created object, distinct from a timed duration expiry. A new `ObjectSelfBreakCondition` variant would cover:

```
type ObjectSelfBreakCondition =
  | { kind: "proximity_to_caster_exceeded"; maxFeet: number }
  | { kind: "replace_on_recast" }
```

### 4. Recurring Action Cost Already Covered by Existing Atoms

The "Magic action on later turns" pattern can reuse `action_quota` + `activate` procedure from the existing v4 atom inventory once the new family exists. No new atom required here — only a new surface slot in the family shape.

---

## Secondary Omission Note

The capability constraints ("can't attack", "can't activate magic items", "can't carry > 10 lbs") are restriction metadata on the created object. If encoded, they would need an `ObjectConstraint` type. Lower priority for now — they don't affect combat mechanics directly, but they distinguish Mage Hand from spells that create attacking object proxies (e.g., Bigby's Hand, Spiritual Weapon). Worth noting for when those spells are surveyed.

---

## Summary

| Gap | Classification | v4 Atom Exists? | Surface Type Exists? |
|---|---|---|---|
| `object_proxy` mechanics family | structural_widening | partial (atoms exist, subgraph missing) | no |
| `interact_object` capability atom | atom_widening | no | no |
| proximity tether self-break variant | surface_widening | yes (`self_break`) | no |
| recurring command action cost | surface_widening | yes (`action_quota`, `activate`) | no (family missing) |
