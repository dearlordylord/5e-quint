# Proposal: Surface Widenings for Fabricate

## Unit

**Fabricate** — Level 4 Transmutation spell, SRD 5.2.1 (`Spells/Descriptions-E-L#Fabricate`).  
Casting time: 10 minutes. Range: 120 ft. Components: V, S. Duration: Instantaneous.

## Why the unit does not fit

Fabricate converts visible raw materials into finished objects of the same material. It has:

- **No attack roll** and **no saving throw** — the effect fires unconditionally.
- A **create-object effect** — the output is a physical object, not damage or a status.
- A **material/object target** — it selects visible raw materials, not creatures.

The current `ActivationPhase` union only provides `attack_roll` and `save_gate`. There is no unconditional (direct) phase. The `Effect` union only has `DamageEffect | NoneEffect`. The `Attachment` union has no `object` variant. All three concepts exist in the v4 taxonomy but are absent from `src/surface/types.ts`.

## Proposed surface widenings

### 1. `ActivationPhase` — add `direct` variant

```typescript
// A phase that fires unconditionally — no attack roll and no save.
// Used by Fabricate, and will be needed for other instant-effect
// transmutation spells (e.g. Stone Shape, Purify Food and Drink).
| {
    readonly kind: "direct";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

**v4 basis:** The `activate` procedure atom + the absence of any resolution atom.  
No new v4 atom is required; this is a surface encoding gap.

### 2. `Effect` — add `create_object` variant

```typescript
export type CreateObjectEffect = {
  readonly kind: "create_object";
  // Maximum bounding volume for the created object.
  readonly maxSize: "medium" | "large";
  // Whether the output is constrained by caster proficiency.
  readonly requiresCrafterProficiency: boolean;
  // Broad material category restrictions, if any. Optional.
  readonly materialConstraint?: string;
};

export type Effect = DamageEffect | NoneEffect | CreateObjectEffect;
```

**v4 basis:** `create_object` effect atom (§9 of TAXONOMY_atoms_graph.md v4).

### 3. `Attachment` — add `object` variant

```typescript
// Targets one or more inanimate objects (raw materials) within range,
// rather than creatures or areas.
| {
    readonly kind: "object";
    readonly selection: { readonly mode: "one" };
  }
```

**v4 basis:** `object` attachment atom (§3 of TAXONOMY_atoms_graph.md v4).

## Tracer impact

The `traceAttachment` function in `tracer.ts` would need a new `case "object"` branch.  
The `traceEffect` function would need a new `case "create_object"` branch.  
`tracePhase` would need a new `case "direct"` branch that skips the resolution node and directly emits the attachment + effect.

## Pressure assessment

`create_object` + unconditional direct phase will recur for:
- Stone Shape (touch, direct reshape of stone)
- Creation (conjuration analog — creates matter from shadow)
- Fabricate (this spell)
- Potentially: Purify Food and Drink, Plant Growth (terrain reshape mode)

`object` attachment will recur for any spell that targets items or terrain features rather than creatures.

Both are moderate-pressure, well-motivated surface gaps backed by existing v4 atoms.
