# Proposal: Carpet of Flying — surface widenings

## Unit

**Carpet of Flying** — Wondrous Item, Very Rare (SRD 5.2.1)

## Outcome: `atom_widening`

The MagicItemRecord kind and variant-collection structure are clean fits. The activation family (Magic action, no attunement) exists. Four gaps prevent honest encoding:

---

## Gap 1 — `UseCountCap` lacks an "unlimited" variant

**RAW**: "You can make this carpet hover and fly by taking a Magic action."

`ActivatedAbilityMechanics` requires `resource: ActivationResource`, which requires a `UseCountCap`. The carpet has no per-use resource cost — it can be activated indefinitely. No existing `UseCountCap` variant expresses this:

| Variant | Problem |
|---|---|
| `{ kind: "fixed", uses: N }` | Dishonest — there is no N |
| `{ kind: "proficiency_bonus" }` | Unrelated to carpet mechanics |
| `{ kind: "ability_modifier" }` | Unrelated |

**Proposed widening**: Add `{ kind: "unlimited" }` to `UseCountCap`. Paired with `resetCadence: { kind: "never" }` (nothing to reset). This pattern would also serve other always-activatable items (Flying Broom, similar vehicles) that have no per-activation resource.

---

## Gap 2 — `grant_speed` is creature-targeted; the carpet is a vehicle

**RAW**: "It moves according to your directions if you are within 30 feet of it. A carpet can carry up to twice the weight shown on the table."

`grant_speed` grants a new speed mode to the effect's *creature* target. The carpet's primary mechanic is different:
- The **item itself** has fly speed — it is the vehicle
- Multiple passengers ride simultaneously and all travel at the carpet's speed
- The carpet can be directed from 30 feet away without the commander riding it

Modeling this as `grant_speed` to `{ kind: "self" }` would capture a single-rider approximation but misrepresents:
- Multi-passenger simultaneous benefit
- Remote direction without occupancy
- The carpet-as-vehicle (vs. caster-gains-wings) semantic

**Proposed widening**: A new `grant_vehicle_fly` effect atom (or a `grant_speed` variant with `target: "item"` + `passengerCapacity` field):

```typescript
| {
    readonly kind: "grant_vehicle_fly";
    readonly speedFeet: number;
    readonly controlRangeFeet: number;
  }
```

Alternatively, a new `ItemVehicleMechanics` family (analogous to `SpawnedCreatureMechanics`) if other magic vehicles surface sufficient pressure for a dedicated shape.

---

## Gap 3 — No conditional (load-predicated) speed modifier

**RAW**: "its Fly Speed is halved if it carries more than its normal capacity"

`set_speed_ratio` exists (`{ numerator: 1, denominator: 2 }` would express halving) but has no predicate field. There is no mechanism in the current surface to express "apply this speed ratio only when the item's load exceeds its capacity."

**Proposed widening**: Add an optional `condition` field to `set_speed_ratio` (and potentially to `modify_speed`):

```typescript
| {
    readonly kind: "set_speed_ratio";
    readonly numerator: number;
    readonly denominator: number;
    readonly condition?: SpeedCondition;  // new
  }
```

Where `SpeedCondition` would initially include:
```typescript
type SpeedCondition = { readonly kind: "overloaded" };
```

This concept is narrow enough to introduce on demand. Alternative: model the halved-speed variant as a separate authored entry on the vehicle mechanics with an "if overloaded" flag.

---

## Gap 4 — No control range on activated items

**RAW**: "It moves according to your directions if you are within 30 feet of it."

The 30-foot direction range governs whether the carpet responds to the activator's commands. There is no field on `ActivatedAbilityMechanics` or any effect atom for "control range" — a distance within which ongoing direction of an item effect remains active.

This is lower priority (primarily narrative for adjudication) but does have a mechanical consequence: if you leave 30 feet, the carpet stops moving.

**Proposed widening**: Add an optional `controlRangeFeet?: number` to `ActivatedAbilityMechanics` (or carry it on the new `grant_vehicle_fly` atom from Gap 2).

---

## Encoding plan once widenings land

The 4 size variants map cleanly to `MagicItemRecord.variants`:

| Variant | Speed | Normal Capacity |
|---|---|---|
| `carpet_of_flying_3x5` | 80 ft | 200 lb |
| `carpet_of_flying_4x6` | 60 ft | 400 lb |
| `carpet_of_flying_5x7` | 40 ft | 600 lb |
| `carpet_of_flying_6x9` | 30 ft | 800 lb |

The d100 determination is GM/structural (which carpet the party finds) and lives as prose, not as a mechanic. Each variant would use `ActivatedAbilityMechanics` with:
- `activationCost: { kind: "standard_action", action: "magic" }`
- `resource: { kind: "use_count", cap: { kind: "unlimited" } }` (Gap 1)
- `resetCadence: { kind: "never" }`
- `phases: [{ kind: "direct", attachment: { kind: "self" }, effects: [{ kind: "grant_vehicle_fly", speedFeet: X, controlRangeFeet: 30 }] }]` (Gap 2 + 4)

The load-conditional halving (Gap 3) would add a second effect in each variant's effects list.

No attunement. `destruction: { kind: "none" }`.
