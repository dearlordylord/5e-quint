# Proposal: Blade Barrier — structural_widening

## Unit

- **Name:** Blade Barrier
- **Kind:** spell (level 6, evocation, concentration 10 min)
- **Source:** srd-5.2.1

## Why no encoding was produced

Blade Barrier creates a persistent hazardous zone that fires a DEX save gate every time any creature *enters* the zone or *ends its turn* there, for the full concentration duration. No existing `SpellMechanics` family can represent this honestly:

| Family | Why it doesn't fit |
|---|---|
| `activation` | Phases fire once at cast. Cannot model "fire save gate on every entry / end-turn event for 10 minutes." |
| `ongoing_effect` | Models persistent modifiers on creatures already attached to the spell. Does not model event-triggered saves against new creatures that cross into the area. |
| `triggered_reaction` | Single reaction cast by the caster. Wrong shape entirely. |
| `anchored_trigger` | Models a one-time release when an event fires (Alarm). Blade Barrier fires **repeatedly**, once per interacting creature per turn. |

Forcing the spell into `activation` with a `save_gate` phase would model only the initial placement — silently dropping the ongoing entry/end-turn triggers. That is a misleading trace.

## Proposed widenings

### 1. New family: `hazard_zone` (structural_widening)

A new `SpellMechanics` family for spells that create a persistent, dangerous area which fires a resolution (save gate or damage) every time a creature satisfies a trigger condition (enters, ends turn, starts turn) for the spell's duration.

**Key shape elements needed:**
- `area` with shape (see below)
- `trigger_condition`: `enters_area | ends_turn_in_area | starts_turn_in_area`
- `per_creature_per_turn` fence (once-per-turn constraint)
- `resolution: save_gate` (same shape as existing `save_gate` phase)
- `onFail / onSuccess: EffectAtom`
- Duration handled by existing lifecycle atoms (`concentrate → expire`)

Candidate v4 graph: `activate → opens_window(duration_window) → [for each creature that satisfies trigger] → save_gate → damage/none`

### 2. New `AreaShapeDescriptor` variants: `wall_straight` and `wall_ring` (surface_widening)

```typescript
| {
    readonly kind: "wall_straight";
    readonly lengthFeet: number;
    readonly heightFeet: number;
    readonly thicknessFeet: number;
  }
| {
    readonly kind: "wall_ring";
    readonly diameterFeet: number;
    readonly heightFeet: number;
    readonly thicknessFeet: number;
  }
```

These are vertical planar structures. `line` (2D: length × width) does not model a wall — it has no height and implies a ground-level effect.

### 3. New effect atom: `difficult_terrain` (atom_widening)

```typescript
| { readonly kind: "difficult_terrain" }
```

Blade Barrier makes its entire space Difficult Terrain for the duration. TAXONOMY_atoms_graph.md §12 already records this as survey pressure (2 hits). It should be promoted to v4 alongside the `hazard_zone` family.

### 4. New effect atom: `grant_cover` (atom_widening)

```typescript
| {
    readonly kind: "grant_cover";
    readonly tier: "half" | "three_quarters" | "total";
  }
```

The wall grants Three-Quarters Cover to creatures behind it. Cover modifies attack roll and DEX saving throw targeting, making it a mechanically deterministic effect that belongs in the core atom inventory.

## Scope of the hazard_zone family

Other SRD spells that would also need this family (non-exhaustive):

- **Wall of Fire** — deals fire damage on enter/end-turn, concentration
- **Wall of Thorns** — difficult terrain + damage on move-through, concentration
- **Spike Growth** — difficult terrain + piercing damage per 5 ft moved through, concentration
- **Cloudkill** — CON save on start-of-turn in sphere, concentration
- **Insect Plague** — WIS save on start-of-turn in sphere, concentration

The pattern is consistent: a persistent area, an event condition (enter / start-turn / end-turn / move-through), and a resolution that fires repeatedly per creature per turn.

## Relationship to existing atoms

The `hazard_zone` family would reuse:
- `area` attachment with the widened `AreaShapeDescriptor`
- `save_gate` resolution node (same as in `activation` phases)
- `damage` effect atom
- `concentrate → expire` lifecycle chain
- `difficult_terrain` and `grant_cover` as persistent area effects attached to the zone rather than to individual creatures

No existing atoms need to change. The widening is additive.
