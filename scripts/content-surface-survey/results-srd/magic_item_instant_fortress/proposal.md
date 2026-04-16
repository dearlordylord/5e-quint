# Proposal: Instant Fortress widening

## Outcome: `structural_widening`

The Instant Fortress cannot be encoded in the current surface. Two independent blocking gaps exist:

1. **No `MagicItemRecord` type.** `UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no magic-item record shape anywhere in `types.ts`. The TAXONOMY lists `magic_item_root` as a v4 source atom, but the surface never grew a corresponding record type. Any JSON authored for this unit would fail typecheck before the tracer even runs.

2. **No mechanics family for "create persistent destructible object".** The Instant Fortress's primary action places an adamantine tower that has its own AC, HP, damage immunities, and resistances — a created object with combat-relevant statistics. No existing family (`ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`, class-feature `activation`, mastery `on_hit_trigger`) can honestly encode this.

---

## Required widenings

### W1 — `MagicItemRecord` + top-level `"kind": "magic_item"` (structural)

A new record type is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: MagicItemRarity;   // "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact"
  readonly mechanics: MagicItemMechanics;
};
```

And `UnitRecord` must be widened:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The tracer also needs a `traceMagicItemUnit` branch.

### W2 — `create_object` mechanics family (structural)

A new mechanics family that encodes item activation producing a persistent physical object with typed combat statistics:

```typescript
export type CreateObjectMechanics = {
  readonly family: "create_object";
  readonly activationCost: { readonly kind: "magic_action" };  // new activation cost variant
  readonly commandWord: boolean;
  readonly object: CreatedObjectSpec;
};

export type CreatedObjectSpec = {
  readonly shape: { readonly kind: "square_tower"; readonly sideFeet: number; readonly heightFeet: number }
               | /* other shapes */;
  readonly ac: number;
  readonly hp: number;
  readonly immunities: ReadonlyArray<DamageType>;
  readonly immunityExceptions?: string;   // "except siege equipment" — narrative, not modeled precisely
  readonly resistances: "all" | ReadonlyArray<DamageType>;
  readonly permanentUntilDismissed: boolean;
  readonly reversible?: ReverseCondition;
};

export type ReverseCondition =
  | { readonly kind: "empty" }   // Instant Fortress: revert only if tower is empty
  | { readonly kind: "unconditional" };
```

### W3 — `attunement` surface field (surface widening)

`MagicItemRecord` needs an attunement flag. The v4 `attunement_slot` resource atom exists; the surface just needs to expose it:

```typescript
readonly requiresAttunement: boolean;
```

### W4 — Area force-displacement on object creation (atom/surface widening)

When the tower appears, creatures in its footprint are pushed to adjacent unoccupied spaces. This is a `force_move` effect triggered by `create_object` instantiation — not by an attack roll or save gate. The `force_move` v4 atom exists, but the surface needs a way to attach it to object creation:

```typescript
readonly onAppear?: ReadonlyArray<AppearanceEffect>;
// AppearanceEffect: { kind: "force_move_occupants"; destination: "adjacent_unoccupied" }
```

### W5 — Bonus Action sub-activation on created object (surface widening)

The door opens/closes via a separate Bonus Action command. This is a secondary activation keyed to the created object (not to the item itself). Closest analogy: an ongoing effect with a Bonus Action modifier on a created object. No existing surface pattern covers this — it needs a `sub_activation` or `object_command` field on `CreatedObjectSpec`.

### W6 — `magic_action` activation cost variant (surface widening)

The casting time is "Magic action" (SRD 5.2.1's distinct action kind for item use). The current `ClassFeatureActivationCost` only has `"free"` and `"bonus_action"`. A `"magic_action"` variant is needed for item activations.

---

## What was NOT attempted

No `.dhall`, `.json`, or `.trace.md` files were written. Authoring a placeholder JSON would require either:
- Coercing the item into `SpellRecord` (wrong kind, wrong family, misleading trace), or
- Coercing it into `ClassFeatureRecord` (no class, wrong family, no attunement, no object stats).

Both would produce false traces. Per the guardrails, a misleading trace is worse than no trace.

---

## Secondary gap (not blocking)

The Wish-based repair clause ("Only a Wish spell can repair the tower") is a special interaction between two named items. This is likely `dm_agenda`-adjacent for the repair decision, but the mechanical effect (tower regains all HP on Wish) would eventually map to a `heal` effect on the created object. This is deferred; it does not need to be modeled until `CreateObjectSpec` exists and HP-restore interactions between named items are in scope.
