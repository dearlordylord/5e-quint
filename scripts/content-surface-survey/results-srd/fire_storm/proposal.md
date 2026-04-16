# Proposal: Fire Storm — surface_widening

## Unit

**Fire Storm** — Level 7 Evocation, Action, 150 ft, Instantaneous  
SRD 5.2.1 · `srd52: true`

## What fits

The core mechanic maps cleanly to existing surface types:

- Family: `activation`
- Phase: `save_gate` — DEX save, caster spell save DC, `7d10` Fire damage on fail, half on success
- Range: `{ kind: "point", feet: 150 }`
- Duration: `{ kind: "instantaneous" }`
- Casting time: `{ kind: "action" }`
- Components: `{ v: true, s: true, m: false }`
- Slot: level 7

All atoms in the tracer path exist in v4: `activate`, `spell_slot`, `action_quota`, `save_gate`, `damage`, `area`, `branches_on_save`.

## What doesn't fit

### Gap 1 — `Attachment.area.shape` has no cube variant (blocker)

`types.ts` defines `Attachment` area shapes as:

```typescript
{ readonly kind: "area"; readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number }; readonly origin: AreaOrigin }
```

Fire Storm's area is **not a sphere**. The SRD text reads:

> "The area of the storm consists of up to ten 10-foot Cubes, which you arrange as you like. Each Cube must be contiguous with at least one other Cube."

This is a caster-arranged region of up to 10 contiguous axis-aligned cubes. Using `sphere` would misrepresent the geometry and produce a false trace.

### Proposed widening

Add a `contiguous_cubes` shape variant to `Attachment.area.shape`:

```typescript
export type AreaShape =
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "contiguous_cubes"; readonly cubeSideFeet: number; readonly maxCubes: number };
```

This widens the existing union at the surface type level only — no new v4 atom is required. The `area` attachment atom already exists; only the shape discriminant is new.

With this widening, Fire Storm would encode as:

```typescript
{
  family: "activation",
  phases: [{
    kind: "save_gate",
    attachment: {
      kind: "area",
      shape: { kind: "contiguous_cubes", cubeSideFeet: 10, maxCubes: 10 },
      origin: { kind: "point_within_range" }
    },
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    onFail:    { kind: "damage", damageType: "fire", amount: { kind: "fixed", expr: { dice: 7, dieSize: 10 } } },
    onSuccess: { kind: "damage", damageType: "fire", amount: { kind: "fixed", expr: { dice: 7, dieSize: 10, flat: 0 } } }
    // onSuccess needs half-damage support — see Gap 2 below
  }]
}
```

### Gap 2 — half-damage on success (secondary, non-blocking for classification)

The `Effect` type only supports `damage` (full) or `none`. Fire Storm deals **half damage on a successful save**. Several other area spells (Fireball, Cone of Cold, etc.) share this pattern. The surface currently has no way to express "half of the fail damage" as a save-success outcome.

This is a separate surface widening (a `half_damage` effect variant or a `saveDamageMultiplier` field on `save_gate`), but it does not change the classification here — the area shape gap is the primary blocker.

### Gap 3 — burning objects (deferred, likely dm_agenda)

> "Flammable objects in the area that aren't being worn or carried start burning."

This is an environmental world-state effect on objects with no creature-targeting resolution. It falls outside the core mechanics boundary per `ARCHITECTURE.md`. Deferred.

## Classification

`surface_widening` — the `activation`/`save_gate` family and all needed v4 atoms exist; the missing piece is a cube/contiguous-cubes shape variant in `Attachment.area.shape`.
