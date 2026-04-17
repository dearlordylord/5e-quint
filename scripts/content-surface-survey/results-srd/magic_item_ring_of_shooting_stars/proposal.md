# Proposal: Ring of Shooting Stars — Structural Widening

**Unit slug**: `magic_item_ring_of_shooting_stars`
**Outcome**: `structural_widening`

---

## What the unit does (RAW summary)

The Ring of Shooting Stars has four distinct properties on a shared 6-charge pool (regain 1d6 at dawn, `last_charge_roll` destruction):

| Property | Cost | Mechanic |
|---|---|---|
| Dancing Lights | none (at-will) | Cast spell |
| Light | none (at-will) | Cast spell |
| Faerie Fire | 1 charge | Cast spell |
| Lightning Spheres | 2 charges | Create 1–4 concentration objects; Bonus Action movement; proximity auto-discharge Dex save |
| Shooting Stars | 1–3 charges | Launch N motes (one per charge); each is a 15-ft Cube Dex save for 5d4 Radiant |

---

## Parts that already fit the surface

- **At-will spells**: `grant_spell_access { spellId, mode: "at_will" }` fits Dancing Lights and Light individually.
- **Faerie Fire**: `grant_spell_access { spellId: "faerie_fire", mode: { kind: "charge_cast", baseCharges: 1, perLevelCharges: 0, minLevel: 1, maxLevel: 1 } }` fits.
- **Charge pool**: `ChargePoolResource { kind: "charge_pool", cap: { kind: "fixed", uses: 6 } }` + `RestResetCadence.dawn { regain: { kind: "threshold_tiers", ... } }` — the 1d6 regain fits `DiceAmount.fixed { expr: { dice: 1, dieSize: 6 } }`.
- **Destruction**: `last_charge_roll { die: 20, destroyOn: 1 }` (standard SRD wand pattern; ring RAW doesn't specify destruction, but the pattern is consistent).

---

## Gap 1: No multi-property mechanics family

`MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`. This is a single slot. The ring exposes:

- Two passive at-will spell grants (no charge cost, always available).
- Three charge-based activated abilities with different charge costs.

These can't be collapsed into a single `PassiveMechanics` or `ActivatedAbilityMechanics`. The `phases` array on `ActivatedAbilityMechanics` models sequential steps of one activation, not a "choose one of N independent abilities per activation."

**Proposed widening**: A `multi_property` mechanics family:

```typescript
type MultiPropertyMechanics = {
  readonly family: "multi_property";
  readonly resource: ActivationResource;      // shared charge pool
  readonly resetCadence: RestResetCadence;    // shared dawn reset
  readonly passiveGrants?: ReadonlyArray<EffectAtom>; // always-on (at-will spells)
  readonly activatedProperties: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly label: string;
    readonly cost: ActivationCost;            // charge cost per property
    readonly activationCost: ClassFeatureActivationCost; // action economy
    readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
    readonly duration?: Duration;
  }>;
};
```

This generalizes the existing `ActivatedAbilityMechanics` for the multi-property magic item pattern (very common in SRD: Necklace of Fireballs, Staff of Power, etc.).

---

## Gap 2: Spawned object companion (Lightning Spheres)

Lightning Spheres creates up to 4 **objects** (not creatures) with:
- Concentration duration (lasts up to 1 minute while caster maintains concentration)
- Dim Light emission (30-ft radius)
- **Bonus Action movement each turn**: move each sphere up to 30 ft, total max 120 ft from caster
- **Proximity auto-discharge trigger**: "the first time the sphere comes within 5 feet of a creature other than you that isn't behind Total Cover" → Dex save → Lightning damage → sphere disappears

The `spawned_creature` family (for spells) and `CreatureStatBlock` don't apply — these are objects without creature stats. Additionally, `spawned_creature` is only available as a `SpellMechanics` family, not for magic item activations.

**Proposed widening**: A `spawned_object` attachment atom or a `spawn_objects` effect atom:

```typescript
// New EffectAtom variant
{
  readonly kind: "spawn_objects";
  readonly count: number | CastTimeChoice<number>; // up to N
  readonly concentration: true;
  readonly upTo: DurationValue;                    // up to 1 minute
  readonly commandCost: { kind: "bonus_action" };  // move each up to 30 ft
  readonly maxRangeFeet: number;                   // 120 ft from caster
  readonly moveFeet: number;                       // 30 ft per Bonus Action
  readonly triggerWithin: {
    readonly feet: number;                         // 5 ft proximity
    readonly effect: EffectAtom;                   // discharge
    readonly expiresAfter: "first_trigger";        // sphere disappears after
  };
}
```

This is the core structural gap: persistent positional objects with per-turn movement commands and proximity-triggered one-shot effects don't exist in the surface.

---

## Gap 3: Lookup table damage (Lightning Spheres discharge)

Lightning Spheres discharge damage depends on player-chosen sphere count:

| Spheres created | Lightning damage |
|---|---|
| 1 | 4d12 |
| 2 | 5d4 |
| 3 | 2d6 |
| 4 | 2d4 |

This is a **non-monotonic lookup table** keyed by player choice at activation time. It cannot be expressed with any current `DiceAmount` variant:
- `threshold_tiers` requires a `LevelAxis` (character/class/slot/subclass/proficiency_bonus) — there is no "objects_created" axis
- The values are non-monotonic (4d12 → 5d4 → 2d6 → 2d4 — dice count decreases as sphere count increases; expected total damage decreases as you create more spheres, spreading the damage across independent discharge events)
- `linear_per_level` doesn't fit non-monotonic tables

**Proposed widening**: A new `DiceAmount` variant:

```typescript
| {
    readonly kind: "lookup_table";
    readonly axis: "object_count" | "charge_spent";   // new LevelAxis-like enum
    readonly entries: ReadonlyNonEmptyArray<{
      readonly atCount: number;
      readonly expr: DiceExpr;
    }>;
  }
```

Or, more generally, extend `LevelAxis` with `"object_count"` so `threshold_tiers` can serve this pattern.

---

## Gap 4: Repeat-phase-per-charge (Shooting Stars)

Shooting Stars fires one independent save_gate area attack per charge spent:

> "For every charge you expend, you launch a glowing mote of light from the ring at a point you can see within 60 feet of yourself."

With 1–3 charges spent, there are 1–3 separate 15-ft Cube Dex saves at 1–3 separately chosen points. This is **not**:
- A single save with scaled damage (resource_spent in DiceAmount only scales one instance's damage)
- Sequential phases (each mote targets an independently chosen point)
- A choose_up_to attachment (the cubes are separate activations from separate points)

**Proposed widening**: A phase repetition modifier:

```typescript
// On ActivationPhase
readonly repeatPerChargeSpent?: {
  readonly min: number;  // 1
  readonly max: number;  // 3
};
```

Or more generally, a `repeated_phase` container that runs an inner phase N times (N determined by charges spent):

```typescript
{
  readonly kind: "repeated_phase";
  readonly countSource: "charges_spent";  // or "target_count"
  readonly min: number;
  readonly max: number;
  readonly phase: ActivationPhase;
}
```

---

## Summary

| Gap | Classification | Blocking? |
|---|---|---|
| Multi-property mechanics family | structural_widening | Yes — no honest single-family encoding |
| Spawned object companion | structural_widening | Yes — Lightning Spheres core mechanic |
| Lookup table damage | surface_widening | Yes — Lightning Spheres damage can't round-trip |
| Repeat-phase-per-charge | structural_widening | Yes — Shooting Stars is fundamentally a loop |

All four gaps must be addressed before this unit can be encoded honestly. The dominant blocker is the multi-property family — even if the other three gaps were solved, there would be no way to combine at-will passive spell grants with charge-based activated properties in a single `MagicItemMechanics`.

The pattern pressure is high: many SRD items (Staff of Power, Necklace of Fireballs, Wand of Wonder, Helm of Brilliance) share the multi-property-on-shared-charge-pool shape. This widening would unlock a large class of items currently blocked.
