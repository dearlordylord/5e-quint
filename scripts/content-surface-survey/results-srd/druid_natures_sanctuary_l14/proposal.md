# Proposal: Nature's Sanctuary (Druid L14) — Structural Widening

## Outcome

`structural_widening` — the unit does not fit any existing `UnitRecord` kind or `ClassFeatureMechanics` family. No `.dhall` or `.json` was authored.

## Unit summary

Nature's Sanctuary is a Druid Circle of the Land L14 feature. It:

1. Costs a **Magic action** and expends a **Wild Shape use** to conjure a 15-foot Cube zone at a ground point within 120 ft.
2. The zone **persists 1 minute** or until the caster is Incapacitated or dies.
3. While in the zone: the **caster and allies have Half Cover**; **allies gain the resistance** currently granted by Nature's Ward (L10 feature).
4. As a **Bonus Action**, the caster can **reposition** the Cube up to 60 ft (within 120 ft of self) on any subsequent turn.

## Gaps — why it does not fit

### 1. `ClassFeatureActivationCost` missing `action` variant

```
ClassFeatureActivationCost = { kind: "free" } | { kind: "bonus_action" }
```

Nature's Sanctuary costs a Magic action — a standard action, not a free or bonus-action cost. Many class features cost an action (Channel Divinity, Wild Shape itself). A new variant `{ kind: "action" }` (or `{ kind: "magic_action" }`) is needed.

**Required widening:** `surface_widening` — new variant of `ClassFeatureActivationCost`.

---

### 2. `ClassFeatureMechanicsHeader` has no `duration` field

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

The feature creates a zone that lasts **1 minute or until Incapacitated/death** — a timed, condition-terminated duration. The class feature header has no duration concept; the family models only instantaneous activations. A duration shape (analogous to spell `Duration`) extended with condition-based expiry triggers is needed for class features.

**Required widening:** `surface_widening` — new field on `ClassFeatureMechanicsHeader` (or new subtype), plus a new `condition_expiry` variant for duration termination.

---

### 3. No multi-activation family for class features

The feature has **two activation clauses**:
- Primary: Magic action → create the zone
- Secondary: Bonus Action (repeatable on subsequent turns) → reposition the zone 60 ft

The `activation` family supports exactly one `activationCost` and one `effect`. There is no mechanism to express a secondary, repeatable activation that operates on an already-active zone. This would require a new subgraph — something like `persistent_zone_with_repositioning` or a general multi-activation family.

**Required widening:** `structural_widening` — new family or composition pattern for class features with primary + secondary activations on a shared persistent zone.

---

### 4. Cross-feature resource consumption (Wild Shape uses)

```typescript
export type UseCountResource = {
  readonly kind: "use_count";
  readonly cap: UseCountCap;
};
```

Nature's Sanctuary does not have its own use pool. It consumes a use from **Wild Shape** (a separate L2 class feature with its own `use_count`). The surface has no way to reference another feature's resource pool. A cross-feature resource reference is needed.

**Required widening:** `surface_widening` — new variant of `UseCountResource` like `{ kind: "feature_use"; featureId: string }`.

---

### 5. `grant_cover` atom missing from v4

The zone grants **Half Cover** to occupants — a persistent, area-conditional AC/save bonus defined by the SRD cover rules (+2 AC and DEX saves). v4 has `modify_ac` as a spell reaction effect atom, but no `grant_cover` atom. Half Cover is mechanically distinct: it is area-conditional (applies only while inside the zone), covers both AC and DEX saves, and is defined by the SRD cover system rather than a flat numeric delta.

**Required widening:** `atom_widening` — new `grant_cover` effect atom with a `cover_level` ("half" | "three_quarters") parameter; the atom's scope is area-occupant conditional.

---

### 6. Cross-feature state projection (Nature's Ward resistance)

> "your allies gain the current Resistance of your Nature's Ward while there"

The resistance type propagated to zone allies is **not fixed at authoring time** — it is whatever damage type Nature's Ward (L10 druid feature) is currently granting at runtime. This requires projecting live state from one feature into the effect of another. v4 has `grant_resistance` but no mechanism for a resistance whose type is resolved from another feature's runtime state. This is a runtime cross-feature dependency with no current surface representation.

**Required widening:** `atom_widening` or `structural_widening` — a new `grant_resistance_from_feature` effect variant that references another feature by ID and reads its current output resistance type, or a general "inherit resistance from feature" composition pattern.

---

## Classification

All six gaps must be resolved before this unit can be encoded honestly. The structural gaps (no duration, no multi-activation, no cross-feature resource/state) are the deepest — they would require new family shapes, not just new variants of existing types. The verdict is `structural_widening`.

## Prioritization

If the surface is widened incrementally for this unit, the recommended order is:

1. `ClassFeatureActivationCost { kind: "action" }` — unblocks many other class features that cost an action.
2. `duration` on `ClassFeatureMechanicsHeader` — needed for any class feature with a timed zone or effect.
3. Cross-feature resource reference — needed for any feature that "spends" another feature's charges.
4. Multi-activation family — needed for features with primary + secondary operations on a shared persistent object.
5. `grant_cover` atom — needed for any zone-based cover effect.
6. Cross-feature resistance projection — narrow; only this feature (and potentially similar aura chains) requires it.
