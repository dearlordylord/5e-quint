# Proposal: Widenings required for Stone Shape

## Unit

**Stone Shape** — SRD 5.2.1, Level 4 Transmutation spell, instantaneous, touch range.

> "You touch a stone object of Medium size or smaller or a section of stone no more than 5 feet in any dimension and form it into any shape you like."

## Why it doesn't fit

Stone Shape is a clean instantaneous transmutation with no attack roll and no saving throw. Its casting cost is 1 action, it consumes a level-4 spell slot, and it has V/S/M components. The structural shape is `activation` family. However, three things are missing from the current surface:

### 1. No `Effect` variant for object alteration

The `Effect` union in `types.ts` is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

Stone Shape's core mechanic — permanently reshaping a stone object into an arbitrary form — maps to the v4 atom `alter_item_kind` (object changes its kind/form) or `create_object` (a shaped passage or new object is created). Neither is an available `Effect` variant. A new variant is needed:

```typescript
export type AlterObjectShapeEffect = {
  readonly kind: "alter_object_shape";
  readonly materialConstraint: "stone";
  readonly sizeConstraint: "medium_or_smaller";  // or max-dimension formulation
};
```

This is the primary blocker.

### 2. No `Attachment` variant for objects

The current `Attachment` union covers `self`, `target` (creature), `area`, and `mark` (creature). Stone Shape targets a **stone object**, not a creature. The v4 atom inventory includes `object` as an attachment atom, but it is not in the surface `Attachment` type.

A new attachment variant for objects is needed:

```typescript
| {
    readonly kind: "object";
    readonly materialConstraint: "stone";
    readonly sizeConstraint: "medium_or_smaller";
  }
```

### 3. No `ActivationPhase` variant for unconditional effects

The `ActivationPhase` union only has `attack_roll` and `save_gate`. Both are gated — the effect depends on a die roll. Stone Shape has **no resolution gate**: if the caster successfully touches the stone (range: touch, no attack roll required for touch-targeted object spells in SRD 5.2.1), the reshaping occurs unconditionally.

A third phase variant is needed for spells that apply their effect immediately without a gate:

```typescript
| {
    readonly kind: "unconditional";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

## Classification

**`surface_widening`** — the `activation` family is structurally correct. All atoms referenced exist in v4 (`alter_item_kind`, `object` attachment, `activate` procedure, `spell_slot`, `action_quota`). What is missing is the surface encoding of those atoms as types.ts variants.

## Proposed widening scope

1. Add `AlterObjectShapeEffect` (or generalize as `AlterObjectEffect`) to the `Effect` union.
2. Add `object` kind to the `Attachment` union.
3. Add `unconditional` kind to the `ActivationPhase` union.

These three changes together would allow Stone Shape (and similar instantaneous transmutation spells like Fabricate, Move Earth) to be honestly encoded.
