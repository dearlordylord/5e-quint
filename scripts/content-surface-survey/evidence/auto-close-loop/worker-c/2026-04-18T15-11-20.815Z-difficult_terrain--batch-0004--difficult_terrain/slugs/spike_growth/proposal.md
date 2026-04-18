# Proposal: Spike Growth — atom_widening

## Unit

**Name:** Spike Growth  
**Kind:** spell  
**Level:** 2  
**School:** transmutation  
**Duration:** Concentration, up to 10 minutes  
**Casting time:** 1 Action  
**Range:** 150 ft (point)  
**Area:** 20-foot-radius Sphere  
**Provenance:** SRD 5.2.1

## What blocks encoding

Spike Growth would be encoded as `ongoing_effect` attached to an `area` (sphere, radius 20 ft, origin point_within_range). The family and attachment both exist. The operation slot does not have a variant that can express either of the spell's two primary effects.

### Blocker 1 — No traversal window atom (atom_widening)

**Effect text:** "When a creature moves into or within the area, it takes 2d4 Piercing damage for every 5 feet it travels."

The trigger is "creature enters or traverses the area." Existing window atoms:

| Atom | What it models | Why not Spike Growth |
|---|---|---|
| `on_hit_window` | after an attack-roll hit | requires attack resolution |
| `post_action_window` | after a creature takes an action on an anchor | fires once per action, not per foot |
| `turn_start_window` / `turn_end_window` | turn boundaries | wrong timing |
| `reaction_window` | when trigger event fires | requires a declared trigger, not continuous |

None cover "fires per unit of movement through the area." A new atom is needed:

**Proposed atom:** `traversal_window`  
**Category:** window  
**Semantics:** opens once per N-foot unit of movement a creature spends within the attachment area. Parameterized by the unit increment (5 ft for Spike Growth). Maps to the ongoing-area-damage subgraph alongside `difficult_terrain` application.

### Blocker 2 — No difficult_terrain effect atom (atom_widening)

**Effect text:** "The area becomes Difficult Terrain for the duration."

Difficult Terrain is a well-defined 5e mechanic: every foot of movement into a Difficult Terrain square costs 2 feet of movement. The v4 effect atoms that could be confused with this:

| Atom | What it models | Why not Spike Growth |
|---|---|---|
| `modify_speed` | changes the creature's speed stat | speed is unchanged; only movement cost doubles |
| `block_travel` | prevents movement through the area entirely | not total blockage; movement is merely expensive |
| `apply_condition` | applies a named condition (Prone, etc.) | Difficult Terrain is not a creature condition; it is a property of the terrain |

Difficult Terrain is a terrain state, not a creature state, and not a speed stat. A new effect atom is needed:

**Proposed atom:** `difficult_terrain`  
**Category:** effect  
**Semantics:** attaches to an area; while attached, movement into or within that area costs 2 feet per foot traveled. Interacts with existing movement cost rules (stacks additively per SRD; creatures with Climb/Swim speed are not exempt without explicit statement). Distinct from `modify_speed` because the speed value is unchanged — only the movement cost per foot within the area is multiplied.

### Blocker 3 — No OngoingOperation variant for per-distance area damage (surface_widening)

The existing `OngoingOperation` union:
- `roll_modifier` — adds a die bonus to the target's own attack rolls or saving throws
- `damage_on_hit` — deals damage when the **caster** lands an attack-roll hit on a creature in the attachment scope

Spike Growth's damage is neither: it fires **when the creature (not the caster) moves** through the area, scaled by **distance traveled** (2d4 per 5 feet). No action by the caster triggers it.

**Proposed new OngoingOperation variant:** `area_traversal_damage`

```
area_traversal_damage = {
  kind: "area_traversal_damage",
  damageType: DamageType,         // "piercing" for Spike Growth
  amountPerIncrement: DiceExpr,   // 2d4
  incrementFeet: number,          // 5
}
```

The `traversal_window` atom is what this operation would emit a `grants` edge to in the tracer.

### Secondary mechanic — camouflage (out of core, DM agenda)

**Effect text:** "The transformation of the ground is camouflaged to look natural. Any creature that can't see the area when the spell is cast must take a Search action and succeed on a Wisdom (Perception or Survival) check against your spell save DC to recognize the terrain as hazardous before entering it."

This mechanic governs whether a creature **knows** to avoid the area. Per `ARCHITECTURE.md`, the core models deterministic mechanical outcomes; notification surfaces and agenda decisions are caller-owned. Whether a creature has line of sight at cast time, whether the DM offers the Search action, and how the DM narrates discovery are all outside the core. The `ability_check` resolution atom exists in v4 and could model the check itself, but the "must spend Search action to get the check" gating and the decision about which creatures are aware are DM-agenda. This mechanic is intentionally omitted from the widenings.

## Honest subgraph once atoms exist

Once `traversal_window`, `difficult_terrain`, and `area_traversal_damage` are added, the trace would look like:

```
spell_root → activate → spell_slot (L2)
           → concentration_lock → concentrate → expire (≤ 10 min)
           → area (sphere r=20 ft, origin: point within 150 ft)
           → [grants] difficult_terrain → attaches_to area
           → [opens_window] traversal_window (per 5 ft)
             → [grants] damage (2d4 piercing) → attaches_to area
```

The `area_traversal_damage` operation in the authored surface would emit both the `difficult_terrain` effect and the `traversal_window → damage` chain.

## Summary

| Proposed addition | Kind | Tier |
|---|---|---|
| `traversal_window` | new v4 atom (window) | atom_widening |
| `difficult_terrain` | new v4 atom (effect) | atom_widening |
| `area_traversal_damage` | new OngoingOperation variant | surface_widening |
| `distance_proportional` damage increment | new DiceAmount variant (optional) | surface_widening |

The distance_proportional DiceAmount is optional — `area_traversal_damage` can encode `amountPerIncrement: DiceExpr` directly without needing a full DiceAmount variant, since the scaling here is distance-based (not level-based). The simpler encoding is to fold the per-increment expression directly into the new operation variant.
