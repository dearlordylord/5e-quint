# Proposal: minor_illusion

## Outcome: surface_widening

## Unit summary

Minor Illusion (cantrip, illusion school) creates a persistent sensory artifact — a sound or an image of an object — at a point within 30 ft for 1 minute. No concentration. No verbal component (S + M only). Observing creatures can spend the Study action to make an Intelligence (Investigation) check against the caster's spell save DC; on success the illusion "becomes faint to the creature." The illusion also ends when cast again.

## Why it doesn't fit

### 1. Missing `OngoingOperation` variant — primary blocker

The `ongoing_effect` family is structurally the right home. The spell header fits `SpellMechanicsHeader` exactly:

| Field | Value |
|---|---|
| level | 0 (cantrip) |
| school | `illusion` |
| castingTime | `{ kind: "action" }` |
| range | `{ kind: "point", feet: 30 }` |
| components | `{ v: false, s: true, m: "a bit of fleece" }` |
| duration | `{ kind: "timed", value: { unit: "minute", amount: 1 } }` |

The blocking issue: `OngoingOperation = RollModifierOperation | DamageOnHitOperation`. Minor Illusion creates neither a roll modifier nor damage on a hit. It creates a **sensory artifact** — an object-like illusion that occupies space and can be interacted with. The v4 taxonomy has `create_object` as an effect atom, but there is no corresponding `OngoingOperation` (or `Effect`) variant in `types.ts`.

**Required widening:**

```typescript
export type CreateObjectOperation = {
  readonly kind: "create_object";
  readonly objectKind: "illusion_sensory";
  // caster chooses one mode at cast time
  readonly modes: ReadonlyArray<"sound" | "visual_image">;
  // image mode only: max extent constraint (5-ft cube per SRD)
  readonly maxExtentFeet?: number;
};

// then:
export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | CreateObjectOperation;   // new
```

### 2. Missing `location` attachment on `Attachment` — secondary blocker

The illusion is created "within range" at a point in space — not attached to a creature, not to self. The `Attachment` type supports `self`, `target` (creature), `area` (sphere), and `mark` (creature). A bare `location` variant is absent from `Attachment`, though it exists as `AnchorTarget` in `AnchoredTriggerMechanics`. The `ongoing_effect` family cannot honestly represent "a sensory artifact placed at a location."

**Required widening:**

```typescript
// add to Attachment:
| { readonly kind: "location"; readonly feet: number }
```

### 3. Missing observer-initiated ability check rider — secondary gap

The investigation mechanic is mechanically concrete:
- **Trigger:** creature spends Study action
- **Resolution:** INT (Investigation) ability check vs. caster's spell save DC
- **Outcome (success):** illusion "becomes faint to the creature"
- **Outcome (failure):** no change

This is **observer-initiated**, not caster-initiated. All existing `ActivationPhase` variants fire at cast time on the caster's behalf. There is no surface pattern for "while this effect persists, any creature may spend a specific action to attempt an ability check against the effect." The v4 taxonomy has `ability_check` as a resolution atom, but no surface variant routes it through an observer's action window into a persisting effect.

**Proposed concept:** An optional `observerCheck` field on `CreateObjectOperation` (or a new `IllusionRider`):

```typescript
export type ObserverAbilityCheckRider = {
  readonly kind: "observer_ability_check";
  readonly triggerAction: "study";        // the Study action
  readonly skill: "investigation";
  readonly ability: "int";
  readonly dc: DcSource;                  // caster_spell_save_dc
  readonly onSuccess: ObserverCheckEffect;
};
```

### 4. Missing "faint to creature" perceptual state — secondary gap

On investigation success the illusion "becomes faint to the creature." This is:
- **not** a standard SRD condition (`apply_condition` doesn't cover it)
- **not** a termination of the effect (other creatures still perceive it normally)
- **not** any existing v4 effect atom

It is a per-observer perceptual state on the illusion artifact. No v4 atom covers this. A new atom or a new effect variant is needed:

```typescript
export type FaintToObserverEffect = {
  readonly kind: "faint_to_observer";
  // the illusion remains but is perceived as clearly illusory by this creature
};
```

This may constitute `atom_widening` for this specific concept. Classified overall as `surface_widening` because the primary blocker (`CreateObjectOperation`) is a surface variant gap, and `create_object` already exists in v4 taxonomy.

### 5. Missing `endsOnRecast` Duration termination — minor gap

"The illusion ends if you cast this spell again." The `Duration` type has no field for this condition. A small addition would cover this and likely several other SRD spells:

```typescript
// in timed duration:
| {
    readonly kind: "timed";
    readonly value: DurationValue;
    readonly endsOnRecast?: true;  // new
  }
```

## What fits cleanly

- Spell kind: `spell` ✓
- Family: `ongoing_effect` (structurally, once operation gap is filled) ✓
- All header fields have valid types ✓
- `create_object` atom exists in v4 taxonomy ✓ (just not surfaced as an operation variant)

## Priority order for widenings

1. `CreateObjectOperation` on `OngoingOperation` — required to encode the primary mechanic at all
2. `location` variant on `Attachment` — required to express "at a point in space" rather than "on a creature"
3. `ObserverAbilityCheckRider` — required to represent the investigation check honestly
4. `faint_to_observer` effect — required for the investigation success outcome
5. `endsOnRecast` flag on `Duration` — minor, affects multiple spells
