# Proposal: surface_widening for Insect Plague

## Unit

- Slug: `insect_plague`
- Kind: spell
- Level: 5, Conjuration
- Source: SRD 5.2.1

## What fits

- `UnitRecord` kind: `spell` ✓
- `SpellMechanics` family: `ongoing_effect` — persistent concentration area, honest fit
- Header fields:
  - `level: 5` ✓
  - `school: "conjuration"` ✓
  - `castingTime: { kind: "action" }` ✓
  - `range: { kind: "point", feet: 300 }` ✓
  - `components: { v: true, s: true, m: "a locust" }` ✓
  - `duration: { kind: "concentration", upTo: { unit: "minute", amount: 10 } }` ✓
- `attachment: { kind: "area", shape: { kind: "sphere", radiusFeet: 20 }, origin: { kind: "point_within_range" } }` ✓
- Slot scaling: `+1d10 per slot above 5` — representable as `DiceAmount.linear_per_level` with `axis: "slot"`, `perLevel: { dice: 1 }`, `startingAtLevel: 5` ✓
- v4 atoms needed: `save_gate`, `area`, `damage`, `persist`, `expire`, `concentrate` — all exist ✓

## The gap

`OngoingEffectMechanics.operation` is typed as:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant encodes Insect Plague's mechanic:

| Variant | Why it fails |
|---|---|
| `RollModifierOperation` | Modifies attack rolls / saving throws by a dice delta. Insect Plague grants no modifier — it imposes a save. |
| `DamageOnHitOperation` | Fires a damage rider when the caster lands an attack roll hit against a creature in the attachment scope. Insect Plague has no attack roll; the save fires on area interaction. |

## Proposed widening

### New `OngoingOperation` variant: `AreaSaveGateOperation`

```typescript
export type AreaInteractionTrigger =
  | { readonly kind: "enters_or_ends_turn" }   // Insect Plague, Cloudkill
  | { readonly kind: "enters_only" };           // reserve for future

export type AreaSaveGateOperation = {
  readonly kind: "area_save_gate";
  readonly trigger: AreaInteractionTrigger;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;
  readonly onSuccess: Effect;
  // "once per turn" is an inherent property of this trigger kind but could
  // be made explicit if needed for other patterns.
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | AreaSaveGateOperation;   // ← new
```

With this variant Insect Plague encodes as:

```typescript
{
  family: "ongoing_effect",
  // ... header ...
  attachment: { kind: "area", shape: { kind: "sphere", radiusFeet: 20 }, origin: { kind: "point_within_range" } },
  operation: {
    kind: "area_save_gate",
    trigger: { kind: "enters_or_ends_turn" },
    ability: "con",
    dc: { kind: "caster_spell_save_dc" },
    onFail: {
      kind: "damage",
      damageType: "piercing",
      amount: {
        kind: "linear_per_level",
        axis: "slot",
        base: { dice: 4, dieSize: 10 },
        perLevel: { dice: 1 },
        startingAtLevel: 5
      }
    },
    onSuccess: { kind: "none" }   // half damage — needs `half_damage_on_success` flag or a new Effect variant
  }
}
```

### Secondary gap: half-damage on success

The SRD says "taking 4d10 Piercing damage on a failed save or **half as much damage on a successful one**." The `Effect` type is `DamageEffect | NoneEffect`. `onSuccess: { kind: "none" }` would lose the half-damage. A `half_damage` effect variant (or a `halfOnSuccess: boolean` flag on `AreaSaveGateOperation`) would be needed for a fully faithful encoding. This pattern appears on virtually every area save-gate spell (Fireball, Insect Plague, Cloudkill, etc.) and is already present in those units' natural descriptions, so this is a known gap that would apply broadly.

### Note on initial burst

When the swarm first appears, **all creatures currently in the area** must make the save immediately. This is the same save gate but triggered at cast time rather than on creature movement/end-of-turn. Two encoding options:

1. Fold into `AreaSaveGateOperation` with `alsoOnAppear: true`. Simple; encodes the observed SRD pattern.
2. Model as a two-phase composition: `activation` (save_gate phase for the initial burst) + `ongoing_effect` (area_save_gate for persistent). Requires cross-family composition, which has no surface support and would be `structural_widening` to add.

Option 1 is narrower and sufficient; recommend folding into the new operation variant.

### Terrain and visibility effects

"The area is Lightly Obscured and Difficult Terrain" — these are caller-owned environmental state per `ARCHITECTURE.md`. They are excluded from the core mechanics atom graph. No widening needed.

## Atom coverage

| Needed atom | Status |
|---|---|
| `save_gate` | ✓ exists (v4 §5) |
| `area` | ✓ exists (v4 §3) |
| `damage` | ✓ exists (v4 §9) |
| `persist` | ✓ exists (v4 §6) |
| `expire` | ✓ exists (v4 §6) |
| `concentrate` | ✓ exists (v4 §6) |
| `scale_die_count` | ✓ exists (v4 §8, for +1d10/slot) |

No new v4 atoms required. The widening is purely a new surface type variant.

## Classification

`surface_widening` — a new variant of the existing `OngoingOperation` surface type is needed. All v4 atoms and the `ongoing_effect` family structure are sufficient once this variant exists.
