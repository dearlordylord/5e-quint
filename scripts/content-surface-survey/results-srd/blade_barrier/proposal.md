# Proposal: Blade Barrier surface gaps

## Unit

**Blade Barrier** — SRD 5.2.1, Level 6 Evocation spell.

## Outcome

`atom_widening` — Three-Quarters Cover requires a new v4 atom; ring wall shape requires a new `AreaShapeDescriptor` variant; once-per-turn deduplication is a missing surface constraint.

## Structural fit

Blade Barrier is an `ongoing_effect` spell. The mechanics family fits:

- Area attachment (wall footprint)
- Initial phase: creatures in the wall at cast time make a Dex save
- Two ongoing triggers: `on_creature_enters_area` and `on_creature_ends_turn_in_area` (both exist in types.ts)
- Save gate: Dex vs caster spell save DC, 6d10 Force on fail, half on success
- Passive: `area_is_difficult_terrain` (atom exists)

The blocking gaps prevent honest encoding.

## Gap 1: Ring wall shape (surface_widening)

The spell offers a cast-time choice between two wall forms:

- **Straight**: 100 ft long, 20 ft high, 5 ft thick
- **Ring**: 60 ft diameter, 20 ft high, 5 ft thick

The cast-time choice is encodable via `AreaShapeSpec.choice`. The straight wall could use `line` (precedent: `wall_of_stone.dhall`, which noted the missing height dimension but used it anyway as an approximation). The **ring wall** has no matching shape. `cylinder` is a filled disk — not a hollow ring/annulus. There is no `ring` or `annulus` variant in `AreaShapeDescriptor`.

### Proposed widening

```typescript
| {
    readonly kind: "ring";
    readonly diameterFeet: number;
    readonly heightFeet: number;
    readonly thicknessFeet: number;
  }
```

Alternatively, a generic `wall` shape with length/height/thickness covering the straight form, paired with `ring` for the hollow form:

```typescript
| {
    readonly kind: "wall";
    readonly lengthFeet: number;
    readonly heightFeet: number;
    readonly thicknessFeet: number;
  }
| {
    readonly kind: "ring";
    readonly diameterFeet: number;
    readonly heightFeet: number;
    readonly thicknessFeet: number;
  }
```

The `wall` variant with explicit height also resolves the gap noted in `wall_of_stone.dhall` where the 20 ft height was unrepresentable.

## Gap 2: Three-Quarters Cover (atom_widening)

The wall provides Three-Quarters Cover. No existing `EffectAtom` expresses granting a cover tier. This is distinct from:

- `block_targeting` — prevents targeting entirely
- `modify_roll_advantage` — imposes disadvantage
- `modify_roll_numeric` — adds a numeric modifier

Three-Quarters Cover is an environment property of the wall itself that imposes −5 to attack rolls and saving throws for attacks passing through it (SRD Rules Glossary). It applies to creatures using the wall as cover, not creatures in the wall.

### Proposed widening

```typescript
| {
    readonly kind: "grant_cover";
    readonly tier: "half" | "three_quarters" | "total";
  }
```

Applied as an ongoing passive effect on the area attachment, it marks the area as providing a specified cover tier to creatures sheltering behind it.

## Gap 3: Once-per-turn deduplication (surface_widening)

The spell has three triggers that fire the same save:

1. Creatures in the wall when it appears (initial phase)
2. Creature enters the wall's space (`on_creature_enters_area`)
3. Creature ends its turn in the wall's space (`on_creature_ends_turn_in_area`)

But: "A creature makes that save only once per turn."

The current `OngoingOperation` surface has no mechanism to group multiple operations and cap the total fires per creature per turn. Each operation fires independently. Spirit Guardians (`spirit_guardians.dhall`) documents the same gap — it omitted the `on_creature_enters_area` trigger rather than fire the save twice.

### Proposed widening

A `deduplication` field on `OngoingOperation` or a grouping mechanism:

```typescript
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly deduplication?: { readonly kind: "once_per_turn" };
};
```

When two or more operations in the same spell share `deduplication: { kind: "once_per_turn" }`, the runtime fires the effect at most once per creature per turn regardless of how many triggers activate.

## Encoding decision

No `content/blade_barrier.dhall` authored. The ring wall shape has no honest representation, the Three-Quarters Cover atom is missing, and the once-per-turn dedup constraint is absent. Forcing a `line` for both shapes or omitting cover would produce a misleading trace.

If the three widenings above are applied:

1. Add `ring` and `wall` variants to `AreaShapeDescriptor`
2. Add `grant_cover` to `EffectAtom`
3. Add `deduplication` to `OngoingOperation`

The spell would encode cleanly as an `ongoing_effect` with:

- `attachment.area.shape.choice` between `{ kind: "wall", ... }` and `{ kind: "ring", ... }`
- `initialPhase` save_gate for creatures in the wall at cast time
- Two operations with `on_creature_enters_area` and `on_creature_ends_turn_in_area`, both with `deduplication: { kind: "once_per_turn" }`
- Passive `area_is_difficult_terrain` operation
- Passive `grant_cover { tier: "three_quarters" }` operation
