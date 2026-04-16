# Widening Proposal: Efficient Quiver

**Unit slug:** `magic_item_efficient_quiver`
**Outcome:** `structural_widening`

---

## Why the unit cannot be encoded

The surface type system (`src/surface/types.ts`) defines `UnitRecord` as:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` — the `magic_item` kind does not exist. The tracer (`src/interpreter/tracer.ts`) has an exhaustive switch on `unit.kind` that only handles `"spell"`, `"class_feature"`, and `"mastery"`. Passing a magic item record would throw `unhandled unit kind`.

The Efficient Quiver cannot be honestly encoded in any existing record shape because:
- It is not a spell (no level, school, casting time, slot cost).
- It is not a class feature (no class, no level acquisition, no activation/use-count model).
- It is not a mastery (no weapon-hit trigger, no on-hit rider).

---

## Required widenings

### 1. `MagicItemRecord` type (structural)

A new top-level record kind is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The source atom `magic_item_root` is already listed in v4 TAXONOMY (§1), so the taxonomy supports this — only the surface type is missing.

### 2. `passive_item_property` mechanics family (structural)

The Efficient Quiver's mechanics are entirely passive. There is no activation event, no reaction trigger, no on-hit rider. The item grants persistent properties simply by being carried/worn.

A new mechanics family is needed:

```typescript
export type PassiveItemPropertyMechanics = {
  readonly family: "passive_item_property";
  readonly properties: ReadonlyArray<ItemProperty>;
};
```

This parallels how item properties work in the TAXONOMY (`item_property_root` source atom), but for wondrous items where the property is the entire mechanic.

### 3. Compartment storage atom/type (atom or surface widening)

The quiver's three typed compartments need a representation:

```typescript
export type ItemCompartment = {
  readonly name: string;
  readonly itemCategory: string;   // "arrow_bolt", "javelin", "long_object"
  readonly capacityCount: number;
};

export type ExtradimensionalStorageProperty = {
  readonly kind: "extradimensional_storage";
  readonly compartments: ReadonlyArray<ItemCompartment>;
  readonly weightLbs: number;   // total weight regardless of contents
};
```

The v4 taxonomy atom `create_object` covers conjuring objects; it does not model a persistent multi-compartment container with per-compartment capacity limits and typed item categories. A new atom — tentatively `item_capacity` — is needed, or `extradimensional_storage` as a surface-level property type.

---

## Secondary mechanics (draw parity)

> "You can draw any item the quiver contains as if doing so from a regular quiver or scabbard."

This is a **null mechanic** — it states that the magical storage does not impose any unusual draw cost. No new atom is needed for this clause; it is a clarifying statement that the item's draw interaction matches the default free-object-interaction rule. Once the storage model exists, this clause needs no separate representation.

---

## Weight normalization

> "never weighing more than 2 pounds"

This is a secondary property: the item has a fixed weight cap regardless of contents. It could be modeled as a `modify_weight` atom (not in v4), or treated as flavor metadata on the storage property. Single-item pressure; not promoted to a required widening but noted.

---

## Summary table

| Gap | Kind | Blocking? |
|-----|------|-----------|
| `magic_item` kind absent from `UnitRecord` | `new_subgraph` | Yes |
| No `passive_item_property` mechanics family | `new_subgraph` | Yes |
| No compartment-storage atom/surface type | `new_atom` | Yes (once record kind exists) |
| No `modify_weight` atom | `new_atom` | No (flavor/secondary) |
