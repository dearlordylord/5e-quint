# Proposal: Freedom of Movement

## Outcome: `surface_widening`

Freedom of Movement is a 4th-level Abjuration spell (Touch, 1 hour, non-concentration, Action). It is the right fit for the `ongoing_effect` spell family in principle — it applies a bundle of persistent protections to one touched creature. The blockers are entirely within the `OngoingOperation` surface type.

## Why it does not fit today

### 1. `operation` is singular; the spell has multiple simultaneous effects

`OngoingEffectMechanics` has:

```typescript
readonly operation: OngoingOperation;
```

Freedom of Movement grants at minimum five distinct concurrent effects. The field must become:

```typescript
readonly operations: ReadonlyArray<OngoingOperation>;
```

This is a shape change to an existing family, not a new family.

### 2. Missing `OngoingOperation` variants

Current union: `RollModifierOperation | DamageOnHitOperation`

None of FoM's five effects map to either variant:

| FoM effect | Required new variant | Backing v4 atom |
|---|---|---|
| Swim Speed = Speed | `grant_movement_type` | `modify_speed` (exists) |
| Ignore Difficult Terrain | `terrain_immunity` | `block_travel` (wrong semantics) or new atom |
| Block magic from reducing Speed | `suppress_magical_effect` (speed reduction) | `suppress` (exists as procedure) |
| Block magic from applying Paralyzed/Restrained | `suppress_magical_effect` (condition application) | `suppress` (exists as procedure) |
| Spend 5 ft to auto-escape nonmagical restraints | `auto_escape_restraints` | no existing v4 atom |

## Atom-level notes

**`modify_speed`** — v4 has this effect atom. A `grant_movement_type` OngoingOperation variant could reference it with a `mode` field (e.g., `"swim"`) and a `derivedFrom` field (e.g., `"speed"`).

**`suppress`** — v4 has this as a procedure atom. The surface needs a way to express it as an ongoing operation that scopes by source type (`"magical"`) and blocked effect type (`"speed_reduction"` or `"apply_condition"`). A single `suppress_magical_effect` operation variant with a list of `blocks` entries would cover both the speed and condition protections.

**`block_travel`** — v4's existing atom is about blocking creatures from moving through a zone (e.g., a barrier). Difficult Terrain immunity is the inverse: a creature's own movement is unaffected by the terrain cost. This is a distinct mechanic. A `terrain_immunity` flag or a `modify_terrain_cost` effect atom may be needed.

**`auto_escape_restraints`** — no v4 atom covers this. It is a proactive movement-cost ability: spend 5 ft → automatically succeed at escaping nonmagical physical restraint (manacles) or the Grappled condition imposed by a creature. This is distinct from `remove_condition` (which requires the condition already be present) and distinct from `deny_opportunity_attack`. A new effect atom `auto_escape` (with a `cost` in movement feet and a `scope` of `"nonmagical_only"`) would be the narrowest addition.

## Higher-level upcasting

"You can target one additional creature for each spell slot level above 4" maps cleanly to a `choose_up_to` selection with `SlotScaling<number>` (base 1, +1 per slot above 4). This is already expressible in the surface type once multi-operation is supported.

## Proposed minimal widening

1. Change `OngoingEffectMechanics.operation: OngoingOperation` → `operations: ReadonlyArray<OngoingOperation>`
2. Add to `OngoingOperation`:
   - `grant_movement_type` — grants a named movement mode at a derived rate
   - `terrain_immunity` — movement ignores difficult terrain cost
   - `suppress_magical_effect` — blocks magic from applying a list of conditions and/or reducing speed
   - `auto_escape_restraints` — spend N ft movement to auto-escape nonmagical restraints (possibly requires new v4 atom)
