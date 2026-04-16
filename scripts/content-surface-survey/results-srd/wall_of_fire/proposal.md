# Proposal: Wall of Fire — structural_widening

## Unit summary

Wall of Fire (4th-level Evocation, concentration 1 min, range 120 ft) creates a persistent fire wall on a solid surface. It has two mechanically distinct effects:

1. **On-cast:** each creature in the wall's area makes a Dex save → 5d8 fire on fail, half on success.
2. **Ongoing (while concentration holds):** one designated side of the wall deals 5d8 fire to every creature that enters the wall or ends its turn within 10 ft of that side (or inside). The other side deals no damage.
3. **Slot scaling:** +1d8 fire per slot above 4th (both effects scale together).

## Why no existing family fits

### Primary gap: no family covers "initial activation + ongoing area damage"

The two effects require different families:

| Effect | Nearest family | Honest? |
|---|---|---|
| On-cast save_gate | `activation` | Yes — but `activation` is one-shot; it cannot express the ongoing component |
| Ongoing turn-end area damage | `ongoing_effect` | Possible shape — but `ongoing_effect` has no mechanism for an initial activation save |

There is no way to compose these two families into a single `SpellMechanics` union member. Forcing the spell into either family alone produces a false trace:
- `activation`-only: misses the persistent damage zone (the main tactical purpose of the spell).
- `ongoing_effect`-only: misses the on-cast area save (a real mechanical event the engine must resolve).

### Secondary gap 1: wall/ring area shapes

`Attachment.area.shape` supports only `{ kind: "sphere"; radiusFeet: number }`. Wall of Fire requires:

```
{ kind: "line"; lengthFeet: 60; heightFeet: 20; thickFeet: 1 }
// OR
{ kind: "ring"; diameterFeet: 20; heightFeet: 20; thickFeet: 1 }
```

This gap will recur for every wall spell in the SRD (Wall of Ice, Wall of Stone, Wall of Force, Wall of Thorns, Blade Barrier, Fire Storm).

### Secondary gap 2: turn-end/entry area operation

`OngoingOperation` supports:
- `roll_modifier` — adds a dice delta to rolls
- `damage_on_hit` — deals damage when the caster's attack roll hits a creature in the attachment scope

Neither covers "deal damage when a creature enters this area for the first time on its turn, or ends its turn inside/within 10 ft". This is a distinct trigger pattern: **spatial proximity at a turn-boundary event**, not an attack resolution.

A new operation variant is needed, tentatively:

```typescript
export type DamageOnAreaTriggerOperation = {
  readonly kind: "damage_on_area_trigger";
  readonly trigger: "enter_or_turn_end";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};
```

### Secondary gap 3: directional area damage

The wall has a "designated side" (chosen at cast) that deals damage and an opposite side that is inert. This directionality is new — areas in the current surface are symmetric. Modeling it requires either a `directedSide: true` flag on the area attachment, or a narrower `attachment` atom for walls that makes the directional choice explicit.

## Proposed widenings

### W1 — New spell family: `activation_plus_ongoing` (or `zoned_activation`)

A new `SpellMechanics` family that combines:
- A required `phases: ReadonlyArray<ActivationPhase>` (one-shot resolution on cast)
- A required `ongoingOperation: OngoingOperation` with area attachment and duration

This covers Wall of Fire, and will also cover Flaming Sphere (bonus action move + damage on contact), Moonbeam (initial save + ongoing turn-end save), and Spirit Guardians.

### W2 — New `area.shape` variants: `line` and `ring`

```typescript
export type AreaShape =
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "line"; readonly lengthFeet: number; readonly heightFeet: number; readonly thickFeet?: number }
  | { readonly kind: "ring"; readonly diameterFeet: number; readonly heightFeet: number; readonly thickFeet?: number }
  | { readonly kind: "cone"; readonly lengthFeet: number }
  | { readonly kind: "cube"; readonly sideFeet: number }
  | { readonly kind: "cylinder"; readonly radiusFeet: number; readonly heightFeet: number };
```

### W3 — New `OngoingOperation` variant: `damage_on_area_trigger`

```typescript
export type DamageOnAreaTriggerOperation = {
  readonly kind: "damage_on_area_trigger";
  readonly trigger: "enter_or_turn_end" | "turn_end_only" | "enter_only";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
  readonly directional?: boolean; // wall: only the designated side triggers
};
```

### W4 — Directional area modifier

Either extend `AreaOrigin` with a `directional: boolean` flag, or add a `DirectedSideAttachment` variant that makes the "caster chooses one face at cast time" choice explicit. This is lower priority than W1–W3 but needed for honest encoding of Wall of Fire's asymmetric damage.

## What is representable today

- Casting time, range, components, concentration duration — all fit current surface types.
- Slot scaling (+1d8 per slot above 4) — representable as `DiceAmount` with `kind: "linear_per_level"`, `axis: "slot"`, `base: { dice: 5, dieSize: 8 }`, `perLevel: { dice: 1 }`, `startingAtLevel: 4`.
- The `save_gate` resolution pattern (Dex save, fail = full, success = half) — representable as an `ActivationPhase` of kind `save_gate` once the family gap is solved.
- The `damage` effect atom — exists in v4 taxonomy.

## Impact on peer spells

The `activation_plus_ongoing` family gap is shared by at least: Moonbeam, Spirit Guardians, Flaming Sphere, Cloudkill, Incendiary Cloud. The `line`/`ring` area shape gap is shared by: Wall of Ice, Wall of Stone, Wall of Thorns, Blade Barrier, Fire Storm.
