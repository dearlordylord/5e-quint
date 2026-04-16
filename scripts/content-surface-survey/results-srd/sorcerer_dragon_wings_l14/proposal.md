# Proposal: Surface Widenings for Dragon Wings (Sorcerer L14)

## Unit

**Name:** Dragon Wings (Sorcerer L14)  
**Kind:** `class_feature` / `activation`  
**Slug:** `sorcerer_dragon_wings_l14`  
**Provenance:** SRD 5.2.1 — Classes/Sorcerer#Level 14: Dragon Wings

## Why the unit does not fit

The `activation` family for class features exists and the Bonus Action cost fits `ClassFeatureActivationCost`. However, two surface shapes are missing, making honest encoding impossible:

---

### Widening 1 — `ClassFeatureEffect.grant_speed`

**Missing shape:** A new variant in the `ClassFeatureEffect` union.

**Rule text:** "For the duration, you have a Fly Speed of 60 feet."

**Gap:** `ClassFeatureEffect` currently covers:
- `grant_extra_action` — grants an additional action
- `heal_hp` — restores hit points

Neither carries a locomotion speed grant. The v4 atom `modify_speed` already exists in the taxonomy, but it is not wired into `ClassFeatureEffect`. The tracer's `traceClassFeatureEffect` switch would throw `unhandled class-feature effect` on any speed-grant shape.

**Proposed surface type addition:**

```typescript
export type GrantSpeedEffect = {
  readonly kind: "grant_speed";
  readonly speedKind: "fly" | "swim" | "climb" | "burrow";
  readonly feet: number;
  readonly target: "self";
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | GrantSpeedEffect;   // NEW
```

The tracer would emit a `modify_speed` atom for this variant, connecting via `grants` from the `activate` procedure node.

---

### Widening 2 — `RestResetCadence.long_rest_or_spend_resource`

**Missing shape:** A new variant in the `RestResetCadence` union.

**Rule text:** "Once you use this feature, you can't use it again until you finish a Long Rest unless you spend 3 Sorcery Points (no action required) to restore your use of it."

**Gap:** The existing cadences are:
- `short_or_long_rest` — refills on either rest
- `long_rest` — refills on long rest only
- `short_rest` — refills on short rest only
- `partial_short_full_long` — partial refill on short, full on long

None represent "long rest **or** spend N units of a named resource." This is a two-path reset: a rest path and a pay-to-restore path. The Sorcery Points cost is not a rest and must be modeled separately.

**Proposed surface type addition:**

```typescript
export type SpendResourceRestore = {
  readonly kind: "spend_resource";
  readonly resource: "sorcery_points" | "ki_points" | "charges"; // widen as needed
  readonly cost: number;
};

// Updated union:
export type RestResetCadence =
  | { readonly kind: "short_or_long_rest" }
  | { readonly kind: "long_rest" }
  | { readonly kind: "short_rest" }
  | { readonly kind: "partial_short_full_long"; readonly shortRestRefill: number }
  | {                                                        // NEW
      readonly kind: "long_rest_or_spend_resource";
      readonly restore: SpendResourceRestore;
    };
```

The tracer would emit both a `rest_window` (long, refill all) and a secondary `charge`/`use_count` consumption path from the resource node when this cadence variant is present.

---

### Additional gap (non-blocking, noted for completeness)

**`ClassFeatureMechanics` has no duration field.**

Dragon Wings lasts 1 hour (dismissible). The current `ClassFeatureActivationMechanics` shape carries no `duration` — it models instant or permanent effects only. A `duration` field analogous to the spell `Duration` type would be needed to author the `persist → expire` lifecycle that the tracer would emit. This is lower-priority than the two blocking gaps above but represents a third surface extension when timed class features are encoded.

---

## Summary

| Gap | Kind | v4 atom affected | Blocking? |
|-----|------|-----------------|-----------|
| No speed-grant variant in `ClassFeatureEffect` | `surface_widening` | `modify_speed` (exists, unrouted) | Yes |
| No "long rest or spend resource" cadence in `RestResetCadence` | `surface_widening` | `use_count` / `charge` (exists, unrouted) | Yes |
| No `duration` field on `ClassFeatureActivationMechanics` | `surface_widening` | `persist`, `expire` (exist, unreachable) | Noted |

No new v4 atoms are required. All three gaps are missing surface variants of existing shapes.
