# Proposal: Sword of Wounding surface gaps

## Unit

**Sword of Wounding** — Weapon (Glaive, Greatsword, Longsword, Rapier, Scimitar, or Shortsword), Rare, Requires Attunement.

## SRD text

> When you hit a creature with an attack using this magic weapon, the target takes an extra 2d6 Necrotic damage and must succeed on a DC 15 Constitution saving throw or be unable to regain Hit Points for 1 hour. The target repeats the save at the end of each of its turns, ending the effect on itself on a success.

## Correct family

`on_hit_trigger` — `MagicItemComponentMechanics` already includes `OnHitTriggerMechanics`. This is the right family; the unit cannot be encoded because the types inside that family are too narrow.

---

## Gap 1 — Missing atom: `block_hp_recovery`

### What the SRD says

"unable to regain Hit Points for 1 hour"

### Why no existing atom fits

- `block_max_hp_reduction` prevents the maximum from decreasing; does not block healing of current HP.
- `apply_condition` → none of the 15 SRD conditions (blinded, charmed, …, unconscious) means "unable to regain HP".
- `modify_max_hp` (decrease) lowers the ceiling but does not block restoration below it.

### Proposed atom

```typescript
| {
    readonly kind: "block_hp_recovery";
    // No fields needed: the SRD text is unconditional (any HP regain is blocked).
    // Duration is carried by the host effect's duration window.
  }
```

This atom gates all HP-restoration events (heal, grant_temp_hp, regeneration, death-save stabilization) while active. It is a first-class debuff that several other SRD units share (Chill Touch cantrip: "the target can't regain hit points until the start of your next turn").

---

## Gap 2 — `SaveGateRiderResult` too narrow

### Current type

```typescript
export type SaveGateRiderResult =
  | { readonly kind: "apply_condition"; readonly condition: Condition }
  | { readonly kind: "none" };
```

### What is needed

The save failure result is `block_hp_recovery`, which is not a `Condition`. The type needs a third variant (or needs to be widened to a general `EffectAtom`) to express non-condition failure effects on magic-item on-hit riders.

### Minimal widening

```typescript
export type SaveGateRiderResult =
  | { readonly kind: "apply_condition"; readonly condition: Condition }
  | { readonly kind: "block_hp_recovery" }   // new
  | { readonly kind: "none" };
```

A broader alternative is `EffectAtom | { kind: "none" }`, which would future-proof the type but increase its blast radius.

---

## Gap 3 — `MasteryEffect` cannot express simultaneous damage + save_gate

### Current type

```typescript
export type MasteryEffect =
  | ModifyRollAdvantageRider
  | SaveGateRider
  | GrantWeaponAttackRider;
```

### What is needed

The Sword of Wounding fires two effects on the same hit:
1. Extra 2d6 Necrotic damage (unconditional)
2. DC 15 Con save → block_hp_recovery on failure

`MasteryEffect` is a single value, so neither a composite form nor a raw `damage` atom is expressible.

### Minimal widening option A — array of effects

Change `OnHitTriggerMechanics.effect` from a single `MasteryEffect` to `ReadonlyNonEmptyArray<MasteryEffect>`, and add a `damage` variant to `MasteryEffect`:

```typescript
export type MasteryEffect =
  | ModifyRollAdvantageRider
  | SaveGateRider
  | GrantWeaponAttackRider
  | { readonly kind: "damage"; readonly damageType: DamageType; readonly amount: DiceAmount };  // new
```

### Minimal widening option B — composite MasteryEffect

```typescript
| {
    readonly kind: "composite";
    readonly effects: ReadonlyNonEmptyArray<MasteryEffect>;
  }
```

Option A is narrower and more transparent. Option B matches the composite pattern already in `EffectAtom`.

---

## Gap 4 — `SaveGateRider` has no `repeatSave` field

### Current type

```typescript
export type SaveGateRider = {
  readonly kind: "save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: SaveGateRiderResult;
  readonly onSuccess: SaveGateRiderResult;
};
```

### What is needed

The save-to-end pattern ("target repeats at end of each turn, ends on success") is already expressed at the spell level via `RepeatSaveSpec`. The same concept needs to be available on on-hit rider save gates.

### Proposed widening

```typescript
export type SaveGateRider = {
  readonly kind: "save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: SaveGateRiderResult;
  readonly onSuccess: SaveGateRiderResult;
  readonly repeatSave?: {          // new — reuse RepeatSaveSpec shape
    readonly cadence: "end_of_target_turn";
    readonly onSuccess: "ends_on_target";
  };
};
```

---

## Dependency order for implementation

1. Add `block_hp_recovery` to `EffectAtom` (Gap 1).
2. Widen `SaveGateRiderResult` to include `block_hp_recovery` (Gap 2).
3. Add `damage` variant to `MasteryEffect` and/or composite form (Gap 3).
4. Add `repeatSave` to `SaveGateRider` (Gap 4).
5. Extend `traceEffectAtom` and `traceMasteryEffect` / `traceSaveGateResult` in `tracer.ts` for the new shapes.

After all four gaps are addressed, the Sword of Wounding encodes cleanly as:

```
on_hit_trigger
  trigger: weapon_hit_melee_only
  optional: false
  effect: composite [
    damage: 2d6 Necrotic
    save_gate: CON DC 15
      onFail: block_hp_recovery (1 hour, repeat save at end of target turn)
      onSuccess: none
  ]
```
