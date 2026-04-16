# Proposal: Widening for Teleport

**Unit:** Teleport (spell, level 7, conjuration, SRD 5.2.1)  
**Outcome:** `structural_widening`

---

## Why encoding fails

Teleport is instantaneous, so `ongoing_effect` is ruled out immediately. The only candidate family for an instantaneous spell is `activation`, which requires at least one `ActivationPhase`. The two available phase kinds are:

| Phase kind | What it models |
|---|---|
| `attack_roll` | Caster makes an attack roll; resolves on hit / miss |
| `save_gate` | Target makes a saving throw; resolves on fail / success |

Neither can encode Teleport's resolution, which is:

> "The DM rolls 1d100 and consults the Teleportation Outcome table."

The table is indexed by a six-tier DM-assessed **familiarity** with the destination. Each familiarity tier assigns different probability bands to four outcome buckets: **On Target**, **Off Target**, **Similar Area**, **Mishap**. This is a flat-percentage probability table, not a d20 attack or a creature's saving throw. There is no existing phase kind for it.

---

## Proposed widening 1 — `probability_table` phase kind (structural)

Add a new `ActivationPhase` variant:

```typescript
{
  readonly kind: "probability_table";
  readonly attachment: Attachment;
  readonly roll: { readonly dice: number; readonly dieSize: number };
  // Ordered branches; last branch acts as the implicit catch-all.
  readonly branches: ReadonlyArray<{
    readonly label: string;
    readonly threshold: number;   // upper bound (inclusive) for this familiarity tier
    readonly onResult: Effect;
  }>;
}
```

This covers the 1d100 familiarity-table structure. Each familiarity row would be a branch with its own probability bands and effects.

The familiarity assessment itself (which tier applies) is a DM decision made at cast time and falls outside the core resolution. It is an input parameter — similar to how a spell's save DC is an input to `save_gate`.

---

## Proposed widening 2 — `transport` Effect variant (surface)

The primary effect of Teleport is transporting creatures (or an object) to a destination. The v4 atom inventory includes `transport_exile` but the surface `Effect` union type only contains:

```typescript
type Effect = DamageEffect | NoneEffect;
```

A transport variant is needed:

```typescript
export type TransportEffect = {
  readonly kind: "transport";
  readonly maxCreatures: number | "unlimited";
  readonly includesObjects: boolean;
  readonly maxObjectSize?: "large_or_smaller";
  readonly destination: "caster_chosen";   // vs. plane-shift style
};
```

This covers the On Target branch. The Off Target and Similar Area branches would be variants of `TransportEffect` with an accuracy parameter (`imprecise_random_direction` with a dice-distance expression, and `nearest_similar` respectively), or could be modeled as a separate `ImpreciseTransportEffect` type.

---

## Proposed widening 3 — misplaced-transport outcomes (surface)

Two of the four branches require expressing transport to an imprecisely-determined location:

- **Off Target** — `2d12 miles` in a random direction (1d8 for direction). This is a positional displacement with a random magnitude and random bearing.
- **Similar Area** — "nearest visually or thematically similar location." This is a narrative/DM-routed destination, closer to `dm_agenda` territory, but the trigger is mechanical (the 1d100 roll).

Both require a richer transport effect shape than a simple `destination: "caster_chosen"`.

---

## Mishap path

The Mishap branch applies `3d10 Force` damage to each teleporting creature and re-rolls on the table (potentially cascading). The damage component is encodable as a `DamageEffect`. The re-roll cascade is a new recursion pattern not present in any existing lifecycle atom — the `release` → `post_action_window` → `release` chain from `anchored_trigger` is structurally similar but would need adaptation.

---

## Summary of missing pieces

| Gap | Classification | Narrowest honest label |
|---|---|---|
| 1d100 familiarity-table phase kind | No existing phase variant | `structural_widening` |
| `transport` Effect variant | v4 atom exists; not in surface types | `surface_widening` |
| Imprecise transport (Off Target / Similar Area) | No existing effect variant | `surface_widening` |
| Re-roll cascade on Mishap | No existing recursion pattern | `surface_widening` or `atom_widening` |

The blocking gap is #1 (the phase kind). Without a `probability_table` phase, the unit cannot be placed in any existing `SpellMechanics` family.
