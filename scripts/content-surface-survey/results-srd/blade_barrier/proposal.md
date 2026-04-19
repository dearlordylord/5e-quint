# Proposal: Blade Barrier gaps

## Unit

- **Slug**: `blade_barrier`
- **Kind**: spell / ongoing_effect (Level 6 Evocation, Concentration 10 min)
- **Outcome**: `atom_widening`

## What fits

The following mechanics map cleanly to existing surface shapes:

| Mechanic | Surface shape |
|---|---|
| Dex save, 6d10 Force damage, half on success | `save_gate` with `damage` + `half_damage` |
| Initial save for creatures in wall at cast time | `OngoingEffectMechanics.initialPhase` (save_gate) |
| Save when entering wall | `on_creature_enters_area` trigger + `save_gate` effect |
| Save when ending turn in wall | `on_creature_ends_turn_in_area` trigger + `save_gate` effect |
| Wall space is Difficult Terrain | `area_is_difficult_terrain` |
| Concentration, up to 10 minutes | existing concentration duration |
| Area attachment, point-within-range origin | `area` attachment |

## Blocking gaps (encoding withheld)

### 1. `grant_cover` — new EffectAtom (atom_widening)

**SRD text**: "The wall provides Three-Quarters Cover"

Three-Quarters Cover is a mechanical rule that grants +5 to AC and Dexterity saving throws for creatures in the wall or behind it (SRD 5.2.1 Playing-the-Game, Cover). This is not flavor — it directly affects attack roll outcomes. No atom exists in the v4 taxonomy or in `EffectAtom` to express a cover grant.

**Proposed atom**:
```typescript
| {
    readonly kind: "grant_cover";
    readonly degree: "half" | "three_quarters" | "total";
  }
```

This is the most common pressure point for wall-type spells (Wall of Fire, Wall of Stone, Wall of Ice, Forcecage all also provide cover or blocking). A single cover atom with a `degree` parameter covers all SRD cases.

### 2. `AreaShapeDescriptor.ring` — new area shape variant (surface_widening)

**SRD text**: "a ringed wall up to 60 feet in diameter, 20 feet high, and 5 feet thick"

The ring wall is a **hollow** cylindrical shell. Creatures inside the ring are explicitly NOT in the wall's space — they are enclosed by it. The existing `cylinder` shape is a solid volume; using it would mark interior creatures as occupying the wall, which contradicts the spell. A new descriptor variant is needed.

**Proposed variant**:
```typescript
| {
    readonly kind: "ring";
    readonly diameterFeet: number;
    readonly heightFeet: number;
    readonly thicknessFeet: number;
  }
```

The cast-time choice between straight wall and ring wall would use the existing `AreaShapeSpec.choice` mechanism once this variant exists.

### 3. Once-per-turn save deduplication — new field on `OngoingOperation` (surface_widening)

**SRD text**: "A creature makes that save only once per turn."

The spell has two ongoing save triggers: `on_creature_enters_area` and `on_creature_ends_turn_in_area`. If a creature enters and ends its turn in the wall on the same turn, only one save fires. The current surface has no mechanism to express this deduplication. Encoding both triggers without it would imply double saves — a false trace.

**Proposed field** on `OngoingOperation`:
```typescript
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly oncePerTurn?: true;  // NEW: deduplicate across triggers within one turn
};
```

When `oncePerTurn: true`, the operation fires at most once per creature per turn regardless of how many qualifying triggers fire. This covers Blade Barrier and would also apply to several other wall/area spells that share the same "once per turn" cap idiom (Wall of Fire, Spike Growth, Spirit Guardians).

## Encoding decision

Not encoded. All three gaps are real: (1) omitting `grant_cover` silently drops a mechanical rule that affects attack outcomes; (2) the ring shape cannot be approximated without misrepresenting which creatures are in the wall; (3) encoding both entry and end-of-turn triggers without once-per-turn deduplication produces a mechanically incorrect trace. A partial encoding with these gaps omitted would be misleading rather than merely incomplete.
