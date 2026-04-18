# Proposal: Fabricate — surface_widening

## Unit

**Fabricate** — SRD 5.2.1 Level-4 Transmutation spell.

## Outcome summary

The core mechanic encodes honestly as `activation` / `direct` / `create_object`. Typecheck passes; tracer emits a valid graph. Three RAW constraints cannot be expressed in the current surface; all are `surface_widening` gaps (the v4 atom `create_object` exists, but it lacks the needed predicate/variant expressiveness).

---

## Gap 1 — Material-conditional size cap

### RAW text

> "If you're working with metal, stone, or another mineral substance, however, the fabricated object can be no larger than Medium (contained within a 5-foot Cube)."

### Problem

`create_object` has a single `maxSize` field. There is no mechanism to express a conditional: "maxSize = large **unless** the target material is mineral, in which case maxSize = medium."

Two `direct` phases cannot solve this because there is no phase-level predicate gating on the attached object's material composition.

### Proposed widening

Add a `conditionalMaxSize` field to `create_object`:

```typescript
conditionalMaxSize?: ReadonlyNonEmptyArray<{
  readonly if: { readonly material: ObjectMaterial };
  readonly maxSize: Size;
}>;
```

This lets the authored unit express: "base maxSize = large; if material is mineral, maxSize = medium." The runtime resolves which constraint applies after the caster selects the target materials.

---

## Gap 2 — `ObjectMaterial` vocabulary missing stone/mineral

### RAW text

> "…metal, stone, or another mineral substance…"

### Problem

`ObjectMaterial` is `"metal" | "flammable"`. Stone and other minerals have no representation. Gap 1's conditional cannot even be authored for stone without this vocabulary.

### Proposed widening

Add `"stone_or_mineral"` to `OBJECT_MATERIALS`:

```typescript
export const OBJECT_MATERIALS = [
  "metal",
  "flammable",
  "stone_or_mineral",
] as const satisfies ReadonlyArray<string>;
```

---

## Gap 3 — Artisan's Tools proficiency gate on high-skill fabrications

### RAW text

> "You also can't use it to create items that require a high degree of skill—such as weapons and armor—unless you have proficiency with the type of Artisan's Tools used to craft such objects."

### Problem

`create_object` has no predicate gate on caster proficiency. The spell's restriction "can't create weapons/armor without relevant tool proficiency" is an activation-time check on the caster's character state, not expressible as any current `ObjectFilter` or `EffectAtom` field.

### Proposed widening

Add an optional `casterProficiencyGate` to `create_object`:

```typescript
casterProficiencyGate?: {
  readonly kind: "artisan_tools";
  readonly description: string;
};
```

This records that certain output categories require caster proficiency, without prescribing which specific tools (that mapping is item-type-dependent and partly DM-resolved).

---

## Encoded shape (for reference)

```
activation → direct → object (count=1, range 120 ft) → create_object (maxSize=large)
```

The mineral size restriction (gap 1), the stone/mineral material vocabulary (gap 2), and the proficiency gate (gap 3) are all omitted. The encoded `create_object` with `maxSize = "large"` captures the general case.
