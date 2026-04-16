# Proposal: `ModifySpeedOperation` — surface widening for Longstrider

## Unit

**Longstrider** (SRD 5.2.1, Level 1 Transmutation)  
"You touch a creature. The target's Speed increases by 10 feet until the spell ends."

## Gap

`OngoingOperation` is a closed union:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant covers a numeric speed delta. The v4 atom `modify_speed` exists in TAXONOMY_atoms_graph.md (§9 Effect Atoms) but has no surface representation.

## Proposed widening

Add a new variant to `OngoingOperation`:

```typescript
export type ModifySpeedOperation = {
  readonly kind: "modify_speed";
  readonly deltaFeet: number;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifySpeedOperation;
```

`deltaFeet` is signed (positive = speed increase, negative = speed reduction). Longstrider uses `+10`.

## Tracer addition (sketch)

In `traceOngoingOperation`, add:

```typescript
case "modify_speed": {
  const id = ids("op");
  nodes.push({
    id,
    category: "effect",
    atomKind: "modify_speed",
    label: `modify_speed\n${op.deltaFeet >= 0 ? "+" : ""}${op.deltaFeet} ft`,
  });
  edges.push({ from: procId, to: id, relation: "grants" });
  edges.push({ from: id, to: attId, relation: "attaches_to" });
  return;
}
```

## Why surface_widening, not atom_widening

The v4 atom `modify_speed` already exists. The gap is solely in the authored surface layer — `OngoingOperation` needs a new variant to expose it. No new atom is required.

## Scope / generality

`ModifySpeedOperation` would also cover:
- Barbarian Fast Movement (+10 ft while not wearing heavy armor)  
- Slow spell speed component (−10 ft on failed save)  
- Haste speed component (+speed equal to base)  
- Any future spell or feature with a flat speed delta
