# Proposal: Cloak of the Manta Ray — Structural Widening

## Unit

**Cloak of the Manta Ray** — Wondrous Item, Uncommon (Requires Attunement)

> While wearing this cloak, you can breathe underwater, and you have a Swim Speed of 60 feet.

## Why the unit does not fit

`UnitRecord` in `src/surface/types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` kind. The v4 taxonomy includes `magic_item_root` as a source atom and `attune`/`attunement_slot` as procedure/resource atoms, but none are surfaced in `types.ts` or handled by `tracer.ts`. This is not a missing variant — the entire top-level kind is absent.

## Required widenings (in priority order)

### 1. `MagicItemRecord` top-level kind (structural)

A new record type and union member:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;          // new type: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact"
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;    // new union
};
```

### 2. `passive_while_worn` mechanics family (structural)

The cloak's two effects are passive — always active while the item is worn (and attuned). No activation cost, no use count, no reset cadence. This requires a new mechanics family distinct from spell `ongoing_effect` (which requires a caster and a slot) and class feature `activation` (which requires an activation cost and resource):

```typescript
export type PassiveWhileWornMechanics = {
  readonly family: "passive_while_worn";
  readonly effects: ReadonlyArray<PassiveMagicItemEffect>;
};
```

### 3. `grant_underwater_breathing` effect atom (atom widening)

Underwater breathing is not a sense — `grant_sense` covers perception-extending senses (darkvision, blindsight, tremorsense). The ability to breathe water is a distinct physiological capability with no existing v4 atom. A new atom is needed:

```typescript
export type GrantUnderwaterBreathingEffect = {
  readonly kind: "grant_underwater_breathing";
};
```

**Evidence:** "you can breathe underwater"

### 4. `modify_speed` (grant new speed type) — surface exposure + variant (surface widening)

`modify_speed` exists in the v4 taxonomy but is absent from `types.ts`. For the cloak, the grant is not a modification of an existing speed but the addition of a new speed type (Swim) at a fixed value. The surface type needs:

```typescript
export type ModifySpeedEffect =
  | { readonly kind: "modify_speed"; readonly mode: "add_flat"; readonly feet: number }
  | { readonly kind: "modify_speed"; readonly mode: "grant_swim"; readonly feet: number }
  | { readonly kind: "modify_speed"; readonly mode: "grant_fly"; readonly feet: number };
```

**Evidence:** "you have a Swim Speed of 60 feet"

## What would make this clean

Minimum required:
1. Add `MagicItemRarity` type and `MagicItemRecord` to `UnitRecord`
2. Add `passive_while_worn` mechanics family
3. Add `grant_underwater_breathing` effect atom
4. Surface `modify_speed` with `grant_swim` variant

The tracer would then need a `traceMagicItemUnit` branch and a `tracePassiveWhileWornMechanics` function.

## Attunement note

The `attune` procedure atom and `attunement_slot` resource atom exist in v4 but are not yet surfaced. The cloak requires attunement, which means the passive effects should only be active when the item is attuned. The `passive_while_worn` family design should incorporate an optional `requiresAttunement` gate that connects to `attunement_slot`.
