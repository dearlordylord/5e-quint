# Proposal: Bowl of Commanding Water Elementals

**Outcome:** `structural_widening`

## Primary blocker — no `MagicItemRecord` in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` type. The tracer's `traceUnit` switch handles only `"spell"`, `"class_feature"`, and `"mastery"` — any record with `kind: "magic_item"` hits the exhaustive `never` branch and throws. This is the wall that blocks the entire magic-item class from being encoded.

The v4 taxonomy lists `magic_item_root` as a source atom, confirming the intent was always to support magic items, but the surface type and tracer were never widened to reflect it.

## Required widenings

### 1. `MagicItemRecord` top-level type (structural)

A new record type is needed, analogous to `SpellRecord` and `ClassFeatureRecord`. Minimum shape:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;         // common | uncommon | rare | very_rare | legendary | artifact
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

And `UnitRecord` must include `MagicItemRecord`.

### 2. `MagicItemMechanics` family — activation with use-count and dawn reset

The Bowl's mechanic is activation-triggered (Magic action), uses once per dawn, and produces a companion. A new family analogous to `ClassFeatureActivationMechanics` is needed:

```typescript
export type MagicItemActivationMechanics = {
  readonly family: "activation";
  readonly activationCost: { kind: "magic_action" } | { kind: "bonus_action" } | ...; // needs `magic_action` variant
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;  // needs `dawn` variant (see §3)
  readonly activationCondition?: ActivationCondition;  // see §4
  readonly effect: MagicItemEffect;
};
```

### 3. `dawn` reset cadence variant (surface widening)

`RestResetCadence` covers short/long rest patterns only. Magic items commonly reset "at dawn" — a calendar-time boundary unrelated to rests.

```typescript
| { readonly kind: "dawn" }
```

This item uses "next dawn". Other elemental-commanding items (Brazier of Commanding Fire Elementals, Censer of Controlling Air Elementals, Stone of Controlling Earth Elementals) use the same cadence.

### 4. Proximity + fill activation condition (surface widening)

The bowl requires two prerequisites before use:
- The bowl must be filled with water (item-state condition)
- The user must be within 5 feet of it (range condition)

No existing shape in the surface captures item-state or proximity prerequisites. A closed `ActivationCondition` type is needed:

```typescript
export type ActivationCondition =
  | { readonly kind: "within_range_of_item"; readonly feet: number }
  | { readonly kind: "item_state"; readonly state: string }   // "filled_with_water" etc.
  | { readonly kind: "all_of"; readonly conditions: ReadonlyArray<ActivationCondition> };
```

### 5. `create_companion` effect atom (atom widening)

The core effect is summoning a specific creature type that:
- appears in an unoccupied space near the item
- understands the user's languages
- obeys the user's commands
- acts on the user's initiative (immediately after)
- persists until 1 hour elapses, it dies, or is dismissed

`create_companion` is listed in the v4 atom inventory but is absent from `types.ts` effect unions. A `MagicItemEffect` union will need it:

```typescript
export type CreateCompanionEffect = {
  readonly kind: "create_companion";
  readonly companionType: string;   // e.g. "water_elemental"
  readonly initiative: "after_summoner";
  readonly dismissCost?: { kind: "bonus_action" };
  readonly duration: Duration;
};
```

### 6. `ClassFeatureActivationCost` — `magic_action` variant (surface widening)

The activation cost is a "Magic action" — a specific standard action kind (`magic` in `StandardActionKind`). The current `ClassFeatureActivationCost` only has `free` and `bonus_action`. Magic items commonly cost a Magic action; this variant should be added.

## Coverage note

This item is one of four elemental-commanding items (Bowl / Brazier / Censer / Stone). All four share the same mechanic pattern: Magic action, once per dawn, summon the matching elemental, 1-hour duration, Bonus Action dismiss, proximity + fill/light condition. The widenings proposed here would encode all four cleanly once implemented.

## Atoms that would be used (if widened)

| Atom | Category | Notes |
|---|---|---|
| `magic_item_root` | source | source root for the item |
| `activate` | procedure | Magic action activation |
| `action_quota` | resource | Magic action consumed |
| `use_count` | resource | once per dawn |
| `create_companion` | effect | Water Elemental summoned |
| `expire` | lifecycle | 1-hour duration |
| `persist` | lifecycle | companion persists |

## Relations that would be used

`roots`, `consumes`, `grants`, `attaches_to`, `persists_until`
