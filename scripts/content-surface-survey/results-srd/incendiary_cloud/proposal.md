# Proposal: surface_widening for Incendiary Cloud

## Unit

- **Name**: Incendiary Cloud
- **Slug**: `incendiary_cloud`
- **Kind**: spell (Level 8 Conjuration, concentration)

## Why no honest encoding is possible today

Incendiary Cloud is a concentration spell that plants a 20-ft-radius sphere area. The area's core mechanic is a **repeating save gate**: any creature that enters the area, has the area move into its space, or ends its turn in the area must make a Dexterity saving throw (taking 10d8 Fire on failure, half on success). A creature can be made to save at most once per turn across all three triggers.

The existing surface families and operation types cannot encode this honestly:

| Gap | Why it blocks encoding |
|---|---|
| `OngoingOperation` has no save-gate variant | The only operation kinds are `roll_modifier` (modifies dice on rolls) and `damage_on_hit` (damage on attack-roll hit). Neither applies here — Incendiary Cloud damages through a save gate on area-interaction, not via attack rolls. |
| No "once per turn" guard on area saves | The per-creature, per-turn deduplication is a first-class rule. No surface type or operation field supports this. |
| No area self-movement | The area moves 10 ft at the start of the caster's turns (caster chooses direction). The v4 `move`/`force_move` atoms apply to creatures, not to spell areas. No `Attachment` variant carries a per-turn displacement. |
| No Heavily Obscured operation | The area applies the Heavily Obscured condition to its space. No `OngoingOperation` variant covers visibility-zone effects. |

## What widening would suffice

### 1. `OngoingOperation` — new variant: `area_save_gate`

```typescript
export type AreaSaveGateOperation = {
  readonly kind: "area_save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;
  readonly onSuccess: Effect;
  // What triggers the save (all three for Incendiary Cloud):
  readonly triggers: ReadonlyArray<"on_enter" | "on_area_enters" | "on_turn_end">;
  // Optional per-turn deduplication:
  readonly oncePerTurn?: true;
};
```

This variant would encode the full repeating-damage loop. The initial burst (when cloud appears) uses the same save/damage as the ongoing loop; both map to `on_enter`/`on_area_enters` without needing a separate `activation` phase.

### 2. `Attachment.area` extension — `selfMovePerTurn`

The area attachment needs an optional field describing how the area moves each turn:

```typescript
// Added to the area Attachment variant:
readonly selfMove?: {
  readonly feetPerTurn: number;
  readonly directionChosenBy: "caster";
  readonly onTurn: "caster_turn_start";
};
```

This is a new shape on an existing attachment kind — minimal surface change.

### 3. `OngoingOperation` — new variant: `apply_zone_effect`

For Heavily Obscured (and future vision/zone effects):

```typescript
export type ApplyZoneEffectOperation = {
  readonly kind: "apply_zone_effect";
  readonly effect: "heavily_obscured"; // closed enum, widen as needed
};
```

## Classification

- **Outcome**: `surface_widening`
- **Rationale**: The `ongoing_effect` family + `area` attachment is structurally correct. No new top-level kind or family is needed. The entire gap lives in `OngoingOperation` (missing save-gate and zone-effect variants) and in the `Attachment.area` shape (missing self-movement). All four gaps are variants of existing surface types, not missing v4 atoms (`save_gate`, `repeat_save`, `area`, `move` all exist in v4).

## Comparable spells with the same pattern

Several SRD spells share the "persistent concentration area, save each turn / on enter" pattern:
- Cloudkill (Poison, save each turn / on enter)
- Insect Plague (Piercing, save each turn / on enter)
- Spirit Guardians (Radiant/Necrotic, save when entering area)
- Moonbeam (Radiant, save when entering/starting turn)

All would require `area_save_gate` once it lands. This is a high-frequency pattern — not narrow pressure.
