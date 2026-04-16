# Proposal: Cloudkill — surface_widening

## Unit

**Name:** Cloudkill  
**Kind:** spell (level 5, Conjuration, SRD 5.2.1)  
**Slug:** cloudkill

## Outcome

`surface_widening` — the `ongoing_effect` family is the correct outer shape, but `OngoingOperation` lacks a save-gate-on-presence variant.

## What the spell does

Cloudkill creates a 20-ft-radius Sphere of poisonous fog at a point within 120 ft:

- **Duration:** Concentration, up to 10 minutes.
- **Save trigger:** Each creature in the Sphere makes a CON save on initial placement; also when the Sphere moves into its space, when it enters the Sphere, or when it ends its turn there.
- **Damage:** 5d8 Poison on a failed save, half on a success.
- **Once-per-turn cap:** A creature makes this save only once per turn regardless of how many triggers fire.
- **Area movement:** The Sphere moves 10 feet away from the caster at the start of each of the caster's turns.
- **Environment:** The area is Heavily Obscured (caller-owned, not modeled in core).
- **Upcast:** +1d8 Poison per slot level above 5.

## Why it doesn't fit honestly

### Primary gap: no save-gate operation in `OngoingOperation`

`OngoingOperation` has two variants:

| Variant | Trigger | Resolution |
|---|---|---|
| `roll_modifier` | Any attack roll or save the target makes | Adds dice bonus (Bless) |
| `damage_on_hit` | Caster makes an attack roll and hits a creature in the attachment scope | Deals damage (Hunter's Mark) |

Cloudkill needs a third variant: damage triggered by **area presence** (not by the caster's attack roll), resolved via a **saving throw** with full/half damage. This is mechanically distinct from both existing variants.

Using `damage_on_hit` would be a lie — Cloudkill never involves the caster making an attack roll against the creatures taking damage.

### Secondary gap: area movement

The `area` attachment supports a static origin (`point_within_range` or `on_primary_target`). Cloudkill's area relocates 10 ft each round. There is no property or variant to express this. This is a first-class mechanic — it determines which creatures are in range for the presence trigger each round.

### Tertiary gap: per-creature-per-turn save frequency cap

"A creature makes this save only once per turn." The surface has no mechanism for this. The mastery `usageLimit: once_per_turn` is a per-activation cap on the wielder, not a per-creature guard on a spell's ongoing save trigger. A new property on the proposed operation variant would be needed.

### Not a gap: Heavily Obscured

The area is Heavily Obscured. Per ARCHITECTURE.md, environmental and notification effects are caller-owned and not core-mechanics atoms. No widening proposed for this.

## Proposed surface additions

### 1. New `OngoingOperation` variant: `save_gate_on_presence`

```typescript
export type AreaPresenceSaveOperation = {
  readonly kind: "save_gate_on_presence";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;      // full damage
  readonly onSuccess: Effect;   // half damage (or none)
  readonly oncePer?: "turn";    // optional per-creature frequency cap
};
```

This maps the Cloudkill/Incendiary Cloud/Insect Plague pattern: concentration area spell, presence triggers a save, save determines full vs. half damage. The existing `save_gate` resolution atom is reused downstream.

### 2. Area attachment movement property

```typescript
// In area Attachment variant, optional movement rider:
export type AreaMovement = {
  readonly direction: "away_from_caster";
  readonly feetPerTurn: number;
  readonly timing: "start_of_casters_turn";
};
```

Or alternatively, a new `Attachment` variant `moving_area` that wraps the existing `area` shape with a `movement` field.

### 3. Save frequency cap (bundled into variant 1 above)

The `oncePer?: "turn"` field on `save_gate_on_presence` handles the once-per-turn guard without introducing a new type. The Cloudkill text makes this a per-creature cap: each creature can only be asked to save once per turn regardless of how many presence-trigger conditions fire in that turn.

## What a clean encoding would look like (sketch)

Once the surface is widened, Cloudkill would encode as `ongoing_effect` with:

```
family: "ongoing_effect"
level: 5
school: "conjuration"
castingTime: { kind: "action" }
range: { kind: "point", feet: 120 }
components: { v: true, s: true, m: false }
duration: { kind: "concentration", upTo: { unit: "minute", amount: 10 } }
attachment: {
  kind: "area",
  shape: { kind: "sphere", radiusFeet: 20 },
  origin: { kind: "point_within_range" },
  movement: { direction: "away_from_caster", feetPerTurn: 10, timing: "start_of_casters_turn" }
}
operation: {
  kind: "save_gate_on_presence",
  ability: "con",
  dc: { kind: "caster_spell_save_dc" },
  onFail: { kind: "damage", damageType: "poison", amount: {
    kind: "linear_per_level", axis: "slot",
    base: { dice: 5, dieSize: 8 }, perLevel: { dice: 1 }, startingAtLevel: 5
  }},
  onSuccess: { kind: "damage", damageType: "poison", amount: { ... half ... } },
  oncePer: "turn"
}
```

The `onSuccess` half-damage case is also currently unrepresentable in `Effect` — `DamageEffect` doesn't carry a `halfOnSuccess` flag. This is another surface gap that would need addressing when the operation variant is added.

## Other pressure cases for the same widening

- **Incendiary Cloud** (level 8) — same pattern: concentration Sphere, save for fire damage each turn
- **Insect Plague** (level 5) — concentration Sphere, save for piercing damage each turn  
- **Moonbeam** (level 2) — concentration Cylinder, save for radiant each turn (with shape variant)
- **Spirit Guardians** (level 3) — concentration area centered on caster, CON save for radiant/necrotic

All of these share the `save_gate_on_presence` pattern and would benefit from the same widening.
