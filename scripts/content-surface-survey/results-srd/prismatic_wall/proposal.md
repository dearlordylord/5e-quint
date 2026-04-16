# Proposal: Prismatic Wall — Structural Widening

## Outcome

`structural_widening` — No existing `SpellMechanics` family can encode this unit honestly.

## Why no existing family fits

The four current spell families and why each fails:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Attaches an operation (roll modifier, damage on hit) to a selected target. Prismatic Wall has no attachment target — it creates a physical barrier that occupies space and is traversed. |
| `activation` | One or more attack-roll or save-gate phases resolved at cast time against chosen targets. Prismatic Wall's effects fire when creatures move through the wall later, not at cast time. The `phases` array is not spatial traversal. |
| `triggered_reaction` | Reaction-shaped; consumes a reaction on a trigger event. Prismatic Wall is an action-cast, non-reaction spell. |
| `anchored_trigger` | Plants a single trigger at a location; a matching event releases a single signal (audible/mental, per Alarm). Prismatic Wall is not a signal emitter — it is a seven-layer traversal barrier with per-layer saves, damage, condition escalation, and independent destructibility conditions. Modeling it as `anchored_trigger` would require inventing a fundamentally different `release` payload. |

## Required structural additions

### 1. New family: `zone_object` (or `barrier_object`)

A spell-created persistent physical entity that:
- Exists in space at a specific anchor (wall shape or globe shape)
- Has its own AC and HP-proxy (destroyable per layer)
- Affects creatures that **enter**, **traverse**, or **approach** it over time (not at cast time)
- Has a configurable **proximity aura** (separate from traversal)

This is the minimum family shape Prismatic Wall requires. Other pressure cases likely waiting: *Wall of Force*, *Wall of Fire*, *Wall of Ice*, *Wall of Thorns*, *Blade Barrier*, *Forcecage*.

Suggested header:
```typescript
type ZoneObjectMechanics = SpellMechanicsHeader & {
  readonly family: "zone_object";
  readonly shape: ZoneObjectShape;        // wall | globe | cage
  readonly layers?: ReadonlyArray<ZoneLayer>; // ordered; empty = single-layer
  readonly proximityAura?: ProximityAura;
};
```

### 2. New surface type: `ZoneLayer`

Each layer in Prismatic Wall has:
- A DEX save resolving to damage (full or half)
- Zero or more condition riders on failure
- An optional condition-progression rider (Indigo: repeat CON saves)
- A destruction condition (damage threshold, named spell, environmental)

```typescript
type ZoneLayer = {
  readonly color?: string;              // authoring label only
  readonly passThrough: SaveGatedEffect; // DEX save → damage + condition
  readonly destructionCondition: LayerDestructionCondition;
};

type LayerDestructionCondition =
  | { readonly kind: "damage_threshold"; readonly damageType: DamageType; readonly amount: number }
  | { readonly kind: "named_spell"; readonly spellId: string }
  | { readonly kind: "environmental"; readonly description: string };
```

### 3. New `Condition` variants

Current `Condition` type: `"prone"` (single value).

Required additions (from Prismatic Wall alone):
- `"blinded"` — proximity aura + Violet layer
- `"restrained"` — Indigo layer initial effect
- `"petrified"` — Indigo layer on 3 failures

These are standard SRD 5.2.1 conditions. The closed enum needs widening; this is pressure from multiple spells (Hold Person = Paralyzed, Entangle = Restrained, etc.) and is expected.

### 4. New surface shape: `RepeatSaveEffect`

Indigo layer's mechanic:
- Target is Restrained
- At end of each turn: CON save
- Track successes and failures independently
- First to reach 3: condition ends (success) or Petrified (failure)

This maps to v4 atom `repeat_save` / `condition_progression` but is not surfaced in the spell `Effect` type. The repeat-save shape is also needed for *Hold Person*, *Hold Monster*, *Flesh to Stone*, *Contagion*.

```typescript
type RepeatSaveEffect = {
  readonly kind: "repeat_save";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly successesNeeded: number;
  readonly failuresNeeded: number;
  readonly onThreeFail: Effect;   // Petrified for Indigo
  readonly onThreeSuccess: Effect; // remove Restrained
};
```

### 5. New `Effect` variant: `transport_exile`

Violet layer on failed WIS save teleports target to another plane (DM's choice). The v4 atom `transport_exile` exists but is absent from the surface `Effect` discriminated union. This needs to be added.

```typescript
type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination: "dm_choice" | { readonly planeId: string };
};
```

### 6. New proximity aura type

The wall affects creatures that move within 20 ft or start their turn within 20 ft — distinct from `enters_area` (stepping into the zone) and `physical_contact` (touching the object). This is a radial proximity check around the object boundary.

```typescript
type ProximityAura = {
  readonly radiusFeet: number;
  readonly triggerOn: "move_within" | "start_turn_within" | "either";
  readonly save: { readonly ability: Ability; readonly dc: DcSource };
  readonly onFail: Effect;
};
```

## Ordering of work

The structural widening (`zone_object` family) must land before any of the surface variants are useful. The suggested sequence:

1. Add `zone_object` family to `SpellMechanics`
2. Widen `Condition` to include `blinded`, `restrained`, `petrified`, `paralyzed` (anticipate other spells)
3. Add `RepeatSaveEffect` and `TransportExileEffect` to the `Effect` union
4. Add `ProximityAura` type
5. Add `LayerDestructionCondition` type
6. Encode Prismatic Wall against the widened surface

## Other spells that likely need this family

- *Wall of Fire* — creates a fire wall; creatures that pass through or start/end in it take damage
- *Wall of Ice* — similar zone object, can be broken through
- *Wall of Force* — indestructible partition
- *Wall of Thorns* — zone object with traversal damage
- *Blade Barrier* — moving wall of blades with traversal damage
- *Forcecage* — 3D enclosure, no traversal (creatures are trapped inside)
- *Globe of Invulnerability* — half-sphere that blocks lower-level spells

All share the core structure: spell creates a persistent physical entity in space that interacts with creatures based on spatial relationship (traversal, proximity, containment), not a target attachment.
