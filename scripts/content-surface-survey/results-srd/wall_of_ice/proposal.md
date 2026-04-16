# Proposal: Wall of Ice — structural_widening

## Summary

Wall of Ice cannot be encoded into any existing `SpellMechanics` family. Its core mechanic is a **multi-phase composition** that the current type system has no model for:

1. Cast → creates a physical damageable object (the wall)
2. Cast-time → pushed creatures make a DEX save (partially encodable)
3. Object section reaches 0 HP → a hazard zone spawns in that space
4. Creature enters hazard zone first time per turn → CON save for damage

No single family covers this. The unit is not `ongoing_effect` (no persistent operation on a bound target), not `activation` (not instantaneous; the wall lasts 10 minutes and creates secondary effects), not `triggered_reaction` (this is not a reactive spell), and not `anchored_trigger` (the anchor fires at cast time, but the hazard zone fires on a conditional destruction event — and signals in `anchored_trigger` carry only audible/mental payloads, not save+damage).

## Mechanics Detail

### On-cast structure

**Wall creation** — 120-ft range, solid surface, choice of:
- Hemispherical dome or globe, radius ≤ 10 ft
- Flat surface of up to ten contiguous 10-ft-square panels

**On-appearance interrupt** — If the wall's footprint overlaps a creature's space when it appears:
1. Creature is pushed to one side (caster's choice) → `force_move` effect
2. Creature makes a Dexterity saving throw:
   - Fail: 10d6 cold damage
   - Success: 5d6 cold damage (half)

**Slot scaling** — +2d6 to appearance damage per slot above 6.

### Persistent object

The wall is a created object with:
- AC 12
- 30 HP per 10-foot section
- Immunity: Cold, Poison, Psychic
- Vulnerability: Fire

None of this is representable in the current type system. `Effect` is `DamageEffect | NoneEffect`; there is no `CreateObjectEffect`. There is no `ObjectStats` sub-type for AC, per-section HP, immunities, or vulnerabilities.

### On-section-destruction trigger

When a 10-ft section of the wall reaches 0 HP:
- The section is destroyed
- A **sheet of frigid air** is left in that space

This is a conditional spawn — an effect triggered by an object's HP reaching zero. There is no window atom for this. `post_action_window` covers creature actions; `rest_window` covers rests. An `on_section_destroyed_window` (or similar) is needed.

### Frigid air hazard zone

The frigid air occupies the space of the destroyed section and persists **independently of concentration**. It is not a creature-bound effect and it is not tied to the caster's concentration. When a creature moves through it for the first time on a turn:
- Constitution saving throw:
  - Fail: 5d6 cold damage
  - Success: 2d6+3 cold damage (half of 5d6, approximately — the spell says "half as much")

**Slot scaling** — +1d6 to frigid air damage per slot above 6.

The frigid air cannot be modeled as `AnchoredSignal` (which only carries `audible` or `mental` payloads) or as an `ongoing_effect` (which attaches an operation to a creature or area at cast time, not conditionally after a destruction event).

## Required Widenings

### 1. New spell family: `object_creation`

A new `SpellMechanics` family for spells that create persistent damageable objects. The shape would need:

```typescript
export type ObjectSection = {
  readonly hpPerSection: number;
  readonly ac: number;
  readonly immunities: ReadonlyArray<DamageType>;
  readonly vulnerabilities: ReadonlyArray<DamageType>;
};

export type ObjectCreationMechanics = SpellMechanicsHeader & {
  readonly family: "object_creation";
  readonly objectShape: ObjectShape;       // new: wall panel grid, dome, globe, etc.
  readonly objectStats: ObjectSection;
  readonly onAppear?: OnAppearEffect;      // new: effects when object first appears
  readonly onSectionDestroyed?: ...; // new: effects when a section reaches 0 HP
};
```

### 2. New window atom: `on_section_destroyed_window` (or `on_object_hp_zero_window`)

A window that opens when an object or object-section is reduced to 0 HP. Required for the frigid-air-spawn trigger. Not present in v4 taxonomy; this would be a new atom.

### 3. New effect / attachment: `hazard_zone`

A persistent area hazard that issues a save gate on first entry per turn. The frigid air is:
- Not concentration-dependent
- Not tied to the caster's concentration state (can persist after concentration ends)
- Fires a `save_gate` on creature entry (first time per turn)
- Has independent duration (implicit: until cleared, or permanent)

The v4 taxonomy has `create_zone` as a candidate atom but it is not currently in `types.ts`.

### 4. New variant: `force_move` in `Effect`

The on-appearance push ("creature is pushed to one side — you choose which side") is a `force_move` effect. The v4 taxonomy lists `force_move` as an effect atom (§9) but it is absent from the `Effect` union in `types.ts`. This widening is narrower than the above — it is `surface_widening` — but it would be needed regardless.

## Encoding Note: What IS Encodable

The following parts of Wall of Ice would encode cleanly once the structural gaps are filled:

- Spell header (level 6, evocation, action, 120 ft, V/S/M, concentration 10 min)
- On-appearance DEX save with damage on both branches (fail: 10d6 cold, success: 5d6 cold)
- Slot scaling on appearance damage: `linear_per_level` with axis=`slot`, base=10d6, perLevel=+2d6, startingAtLevel=6
- Slot scaling on frigid air damage: `linear_per_level` with axis=`slot`, base=5d6, perLevel=+1d6, startingAtLevel=6
- Frigid air CON save (once the hazard_zone type exists)

A partial encoding of the on-appearance save gate (omitting wall creation and frigid air) would produce a misleading trace — it would look like a simple AoE damage spell, which is not what Wall of Ice is. The wall itself and the frigid air zones are the spell's defining mechanics.
