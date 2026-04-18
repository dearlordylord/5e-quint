# Proposal: `create_object` atom + fabrication surface

## Unit: Fabricate (SRD 5.2.1, Level 4 Transmutation)

## Blocking gap

The v4 taxonomy lists `create_object` as an Effect Atom (TAXONOMY_atoms_graph.md §9) but it has never been surfaced in `types.ts`. Fabricate is the first spell that forces it in.

## What Fabricate needs

```
activation spell
  direct phase
    attachment: object (raw materials within 120 ft)
    effect: create_object { ... }
```

The `create_object` atom needs to carry:

1. **Material constraint** — the output must be made from the input raw material ("products of the same material"). The input and output share a material identity; the atom is not conjuration out of nothing.
2. **Size bounds** — a maximum size for the created object, with a material-dependent tighter bound (Large for general materials; Medium for metal/stone/mineral).
3. **Proficiency gate** — certain output categories (weapons, armor, high-skill craft items) require the caster to have proficiency with the relevant Artisan's Tools. This is a cast-time eligibility check, not a saving throw.
4. **Exclusion list** — creatures and magic items cannot be the output. This is an absolute constraint, not a die roll.

## Proposed surface shape

```typescript
export type CreateObjectSizeConstraint =
  | { readonly kind: "fixed"; readonly maxSize: "tiny" | "small" | "medium" | "large" }
  | {
      readonly kind: "material_dependent";
      readonly default: "tiny" | "small" | "medium" | "large";
      readonly materials: ReadonlyNonEmptyArray<{
        readonly material: string;  // "metal" | "stone" | "mineral" — extend ObjectMaterial
        readonly maxSize: "tiny" | "small" | "medium" | "large";
      }>;
    };

// New EffectAtom variant:
| {
    readonly kind: "create_object";
    // Output must match input material — no conjuration from nothing
    readonly sameInputMaterial: true;
    readonly sizeConstraint: CreateObjectSizeConstraint;
    // Caster must have proficiency with relevant tools to create these
    readonly requiresToolProficiencyFor?: ReadonlyNonEmptyArray<"weapons" | "armor">;
    // Absolute exclusions regardless of material/size
    readonly cannotCreate?: ReadonlyNonEmptyArray<"creature" | "magic_item">;
  }
```

## Secondary gap: ObjectFilter material enum

The `object` attachment's `ObjectFilter.material` is `"metal" | "flammable"`. Fabricate targets "raw materials" broadly. A `"raw_material"` material tag or a more general "unprocessed stock" concept would be needed to accurately express the attachment predicate. This is a lesser concern — authors could omit the material filter as an approximation — but the primary blocker remains the missing effect atom.

## Why `alter_item_kind` is not a substitute

`alter_item_kind` is designed for "Folding Boat switches between box / rowboat / keelboat forms" — it targets one specific existing item and changes which named form it presents as. The atom carries no raw-material input, no size or material bounds, and no proficiency gate. Using it for Fabricate would produce a trace that says the spell changes an existing item's kind, which is mechanically false. Fabricate creates a new object from raw stock; the raw stock is consumed, not transformed in place.

## Classification

- `create_object` is a **v4 atom** (taxonomy §9) — this is `atom_widening`, not `structural_widening`.
- The `activation` family with a `direct` phase and `minutes` casting time is the correct structural home. No new family is needed.
