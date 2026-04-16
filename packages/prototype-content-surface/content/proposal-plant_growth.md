# Proposal: Plant Growth — structural_widening

## Unit

**Plant Growth** (SRD 5.2.1, Transmutation 3, section Spells/Descriptions-N-R#Plant-Growth)

## Why it does not fit

### Gap 1 — Cast-time branching (structural)

Plant Growth exposes a "choose casting time → choose effect" pattern:

| Casting time | Effect |
|---|---|
| 1 Action | Overgrowth — terrain impediment (100-ft radius, 4:1 movement cost) |
| 8 hours | Enrichment — agricultural yield doubling (half-mile radius, 365 days) |

> "The casting time you use determines whether the spell has the Overgrowth or the Enrichment effect below."

`SpellMechanics` is a discriminated union of four families (`ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`). Each family encodes exactly one `castingTime`. There is no "mode-select" or "cast-time-branching" family. Forcing both effects into one record would require either picking one (dishonest) or inventing a composite that the tracer's exhaustive switch would not handle.

**Proposed new subgraph: `cast_time_branching`**

A new spell family or top-level composition that holds an array of `(castingTime, mechanicsPayload)` pairs. The caster chooses a pair at cast time; the selected casting time is consumed and its paired payload executes. This generalises to any spell with multiple casting-time modes (Plant Growth, Animal Messenger, etc.).

---

### Gap 2 — Terrain cost multiplier atom (atom widening)

The Overgrowth effect forces a 4:1 movement expenditure ratio on all creatures in the area. This is **not**:

- `modify_speed` — that changes the creature's speed stat (a numeric field on the creature). The area is still affected by the full speed; you just burn 4× as much per foot.
- `block_travel` — movement is not blocked, only made costly.
- `force_move` — the spell does not move creatures.

> "A creature moving through that area must spend 4 feet of movement for every 1 foot it moves."

**Proposed new atom: `modify_terrain_cost`**

Category: `effect`. Encodes a per-area movement-cost multiplier. Minimum shape:

```typescript
{
  readonly kind: "modify_terrain_cost";
  readonly costMultiplier: number; // 4 for Plant Growth; 2 for standard difficult terrain
}
```

This also generalises to Spike Growth (which adds damage-on-move and already uses difficult terrain), Web (restrained unless saved), and similar terrain-modifying spells.

---

### Gap 3 — Area with exclusion zones (surface widening)

The Overgrowth area attachment includes a caster-controlled exclusion:

> "You can exclude one or more areas of any size within the spell's area from being affected."

The current `Attachment` area shape has no exclusion field. A new `area` attachment variant or an `exclusionZones` field on the existing area shape would cover this. This is a surface widening (new variant of existing type) rather than a new atom.

---

### Gap 4 — Enrichment is out of core-mechanics scope

The 8-hour Enrichment mode:

> "All plants in a half-mile radius centered on a point within range become enriched for 365 days. The plants yield twice the normal amount of food when harvested."

This is a world-state modifier with no deterministic combat resolution. Per ARCHITECTURE.md, agricultural outcomes, DM-owned resource tracking, and narrative world-state are caller-owned. Even if the structural widening were resolved, Enrichment would be classified as `dm_agenda` / out-of-scope.

---

## Recommended widening priority

1. **`cast_time_branching`** — structural. Blocks any encoding of Plant Growth (and similar dual-mode spells). Needed before any content work on this unit resumes.
2. **`modify_terrain_cost`** — atom. Needed for Overgrowth and any future difficult-terrain spell (Spike Growth, Web, Entangle, etc.). High generality.
3. **`area_with_exclusion_zones`** — surface. Lower priority; only affects area targeting fidelity.
4. **Enrichment** — out of scope. No action needed; document the omission.
