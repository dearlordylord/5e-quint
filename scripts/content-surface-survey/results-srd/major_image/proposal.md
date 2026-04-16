# Proposal: Major Image widening

**Unit:** Major Image (spell, level 3, Illusion, SRD 5.2.1)  
**Outcome:** `surface_widening`  
**Reason encoding was not attempted:** `OngoingOperation` has no variant for illusion/object creation. The closest honest family is `ongoing_effect`, but coercing the spell into `roll_modifier` or `damage_on_hit` would produce a false trace.

---

## Why `ongoing_effect` is the right structural home

Major Image is a concentration spell (up to 10 minutes) that:
- Consumes a level-3 spell slot and an Action
- Attaches a persistent object/illusion to a point within 120 ft range
- Has no attack roll, no saving throw, no damage, no roll modifier

This maps cleanly to `ongoing_effect`: a spell procedure that `attaches_to` an area and `grants` some persistent operation while concentration holds. The header fields (level, school, castingTime, range, components, duration) all encode without issue.

## Widenings required

### 1. `OngoingOperation` — `create_object` variant (blocking)

Current `OngoingOperation`:
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Major Image's core operation is creating a persistent illusion object — a sensory phenomenon with spatial extent. The v4 taxonomy already has `create_object` as an effect atom. The `OngoingOperation` union needs a new variant, minimally:

```typescript
export type CreateObjectOperation = {
  readonly kind: "create_object";
  readonly maxExtent: { readonly shape: "cube"; readonly maxSideFeet: number };
  // sensory: sounds, smells, temperature — presentation facts, caller-owned
};
```

This is a blocking gap: without it, the spell cannot be encoded in `ongoing_effect`.

### 2. Passive ability-check detection (blocking for honest trace completeness)

The spell defines a creature-initiated detection mechanic:

> A creature that takes a Study action to examine the image can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC.

The v4 taxonomy has `ability_check` as a resolution atom. The existing `ActivationPhase` union only has `attack_roll` and `save_gate`, both caster-initiated. Detection here is:
- initiated by the creature (not the caster)
- contingent on the creature spending its Study action
- resolved via INT (Investigation) vs caster's spell save DC
- consequential: if discerned, creature can "see through" the image

This needs a new passive detection grammar. The most natural home would be a new `OngoingOperation` variant or a new `PassiveDetectionGate` field on the `create_object` operation:

```typescript
export type PassiveDetectionGate = {
  readonly kind: "ability_check";
  readonly ability: Ability;           // "int"
  readonly skill: string;              // "investigation"
  readonly dc: DcSource;               // caster_spell_save_dc
  readonly onSuccess: "reveal";        // see-through effect
};
```

This is a new sub-grammar rather than a new top-level family.

### 3. Slot-conditioned duration override (surface widening for upcast)

The higher-level text:

> The spell lasts until dispelled, without requiring Concentration, if cast with a level 4+ spell slot.

This changes the Duration **kind** (from `concentration` to `timed` with an indefinite-until-dispelled value) based on the slot used. No existing `SlotScaling<T>` shape covers a conditional switch of Duration variant. A new type is needed, e.g.:

```typescript
export type SlotConditionedDuration = {
  readonly kind: "slot_conditioned";
  readonly base: Duration;
  readonly overrideAtSlot: number;       // 4
  readonly override: Duration;           // { kind: "timed", value: { unit: "until_dispelled" } }
};
```

This also requires a new `DurationValue.unit` variant `"until_dispelled"` or a new `Duration` kind `"permanent_until_dispelled"`.

### 4. `Attachment.area.shape` — `cube` variant (minor)

The image's spatial extent is a 20-foot Cube. `Attachment.area.shape` only has `sphere`:

```typescript
// current:
readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number }
// needed:
| { readonly kind: "cube"; readonly maxSideFeet: number }
```

Note: `cube` already exists on `AnchorTarget.area` for the Alarm encoding, so this is a narrowing of an already-accepted concept into the `Attachment` type.

### 5. Secondary: caster reposition operation (minor, omittable for initial encoding)

> you can take a Magic Action to cause the image to move to any other spot within range

This is a caster-activated repositioning of the ongoing attachment. It could be expressed as a bonus action-cost operation on the ongoing effect, or as a new `caster_reposition` operation variant. This is omittable from a first widening pass — the core creation mechanic matters more.

---

## Summary table

| Gap | Kind | Blocking? |
|---|---|---|
| `OngoingOperation.create_object` | new_variant | yes |
| Passive ability-check detection on ongoing effects | new_variant | yes (for honest trace) |
| Slot-conditioned Duration override | new_variant | yes (for upcast) |
| `Attachment.area.shape.cube` | new_variant | minor |
| Caster reposition operation | new_variant | no (omittable) |

All proposed atoms (`create_object`, `ability_check`) exist in the v4 taxonomy. None of these widenings require a new top-level family — the `ongoing_effect` family remains the correct structural home.
