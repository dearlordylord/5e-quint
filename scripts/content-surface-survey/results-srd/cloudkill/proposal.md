# Proposal: Cloudkill surface gaps

## Unit

**Cloudkill** — SRD 5.2.1, Level 5 Conjuration spell.

## Outcome

`atom_widening` — partial encoding produced. Typecheck passes, tracer runs. Four mechanics are unrepresentable in the current surface.

## What fits

The core damage mechanic encodes cleanly as an `ongoing_effect` spell:

- **Area attachment**: `sphere r=20 ft`, `origin: point_within_range`, range 120 ft.
- **initialPhase**: `save_gate` Con vs spell save DC → 5d8 Poison / half.
- **on_creature_enters_area** → `save_gate` (same).
- **on_creature_ends_turn_in_area** → `save_gate` (same).
- **Upcast scaling**: `linear_per_level` axis=slot, +1d8/slot above 5.

## Gap 1 — `area_is_heavily_obscured` (new atom)

> "Its area is Heavily Obscured."

SRD 5.2.1 Rules Glossary: creatures inside a Heavily Obscured area have the Blinded condition (disadvantage on attack rolls, attackers have advantage). This is a distinct visibility tier from Difficult Terrain.

`area_is_difficult_terrain` exists but covers movement cost only. There is no atom for area-level heavy obscurement. This is a new `effect` atom needed in the v4 taxonomy.

**Proposed atom:**
```typescript
| { readonly kind: "area_is_heavily_obscured" }
```

Emits alongside `area_is_difficult_terrain` in the same taxonomy bucket. Both are passive area-modifying effect atoms on an area attachment.

## Gap 2 — `drift_area_attachment` (new atom)

> "The Sphere moves 10 feet away from you at the start of each of your turns."

The sphere drifts automatically each caster turn — mandatory, directional ("away from you"), no action cost, no player choice. The existing `reposition_attachment` atom models a caster-initiated optional relocation (Silent Image, Dancing Lights):

```typescript
| {
    readonly kind: "reposition_attachment";
    readonly maxMoveFeet?: number;
  }
```

This does not encode:
- **Automaticity**: fires unconditionally at start of caster turn, not on caster-action spend.
- **Direction**: away from the caster is a specific directional constraint, not a free relocation.

Using `on_caster_turn_start` + `reposition_attachment` would misrepresent the mechanic as a caster-chosen relocation.

**Proposed atom (or field on OngoingOperation effect):**
```typescript
| {
    readonly kind: "drift_area";
    readonly feetPerTurn: number;
    readonly direction: "away_from_caster";  // widen when other directions surface
  }
```

Alternatively, a `direction` field on `reposition_attachment` combined with a mandatory trigger mode. Drift is a first-class mechanic in area-hazard spells (Cloudkill, Moonbeam shares the same "area moves into creature's space" wording).

## Gap 3 — `OngoingTrigger.on_area_moves_onto_creature` (new trigger variant)

> "A creature must also make this save when the Sphere moves into its space."

This fires when the **area moves** to overlap a **stationary creature** — the inverse of `on_creature_enters_area`. The two are mechanically distinct: a creature standing still in the sphere's drift path triggers this; a creature moving into a static sphere triggers `on_creature_enters_area`.

Without the drift atom (Gap 2), this trigger is unreachable. Both gaps must be resolved together to fully model Cloudkill's hazard.

**Proposed trigger variant:**
```typescript
| { readonly kind: "on_area_moves_onto_creature" }
```

Same gap identified in Moonbeam ("A creature makes this save again when the spell's area moves into its space") and Spirit Guardians ("whenever the Emanation enters a creature's space").

## Gap 4 — `OngoingOperation.once_per_turn_dedup` (new surface field)

> "A creature makes this save only once per turn."

The three save triggers (initial, enters, ends-turn) can all fire in the same turn for the same creature (e.g., sphere drifts into creature's space AND creature ends its turn there). RAW caps total saves at one per creature per turn. The `OngoingOperation` type has no deduplication mechanism — each operation fires independently.

**Proposed field on `OngoingOperation`:**
```typescript
type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly maxPerTurn?: 1;  // "once per turn" rate limit across all operations sharing this tag
};
```

Same gap noted for Blade Barrier (`OngoingOperation.once_per_turn_dedup`) and Spirit Guardians.

## Tracer note

The tracer does not emit `scale_die_count` nodes for save_gate effects inside ongoing operations (only the initialPhase scaling is traced). This is a tracer limitation, not a surface issue — the JSON encoding is correct.

Also: the ongoing operation `save_gate` branches do not emit a `half_damage` node in the current tracer path (`traceOngoingOpEffect` skips `half_damage` variant of `onSuccess`). Same tracer limitation.
