# Proposal: Widening for Banishment

**Unit:** Banishment (spell, level 4, abjuration, SRD 5.2.1)
**Outcome:** `surface_widening`

## What fits

The outer mechanics of Banishment slot cleanly into the existing `activation` (spell) family:

- Casting time: `action`
- Range: `point` (30 ft)
- Duration: `concentration` (up to 1 minute)
- Phase: `save_gate` with `cha` save against caster spell save DC
- Upcast scaling: +1 target per slot above 4 → maps to `choose_up_to` + `SlotScaling`

The `save_gate` phase shape exists. The `spell_slot`, `concentration_lock`, `spell_slot` scaling path all exist. Nothing at the procedure or resolution layer is new.

## What is missing

### 1. `Effect` union needs `transport_exile` variant

**Current:** `Effect = DamageEffect | NoneEffect`

**Needed:** A `TransportExileEffect` variant (or equivalent) for the primary on-fail outcome. The v4 atom `transport_exile` exists in the taxonomy but has no corresponding surface type.

Minimal proposed shape:

```typescript
export type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination: "demiplane_safe" | "plane_native";  // or open string
  readonly returnsOnEnd: boolean;
};
```

`returnsOnEnd: true` covers the mortal-creature case (target returns when concentration ends). `returnsOnEnd: false` covers the permanent-exile case (see §4 below).

---

### 2. `ApplyConditionEffect` missing from spell `Effect`

`apply_condition` exists as a `SaveGateRiderResult` in the mastery layer but is not reachable from a spell `ActivationPhase`'s `Effect`. The same atom needs a parallel variant on the spell effect union.

Minimal proposed shape:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
```

This already matches the mastery-layer shape; it just needs to be added to the spell `Effect` union.

---

### 3. `Condition` union needs `"incapacitated"`

**Current:** `export type Condition = "prone";`

**Needed:** `export type Condition = "prone" | "incapacitated" | ...`

This is a strict widening. No structural change; the atom `apply_condition` already handles it — the literal just needs to be present.

---

### 4. `return_on_end` lifecycle not expressible

When concentration ends, the banished target reappears. The v4 lifecycle atom `return_on_end` exists, but there is no surface-type mechanism to attach it to a `transport_exile` effect. Options:

- **Option A:** Add `returnsOnEnd: boolean` to `TransportExileEffect` (see §1 above) — the tracer emits `return_on_end` when this is true.
- **Option B:** Add a `ReturnOnEndLifecycleEffect` variant to `Effect` that the tracer links via `returns_to` edge.

Option A is narrower and sufficient for Banishment. Option B is more general and supports future spells where the return mechanic is a separately authored concern.

---

### 5. Creature-type conditional branch (structural gap)

The permanent-exile clause requires two simultaneous conditions:

1. Target creature type is in `{Aberration, Celestial, Elemental, Fey, Fiend}`.
2. The spell ran its full 1-minute duration without being broken (concentration held to completion).

This is a **structural widening** layered on top of the surface widening. Neither condition is representable in the current vocabulary:

- Creature-type filtering does not exist as a predicate in any surface type.
- "Spell lasted full duration" is a lifecycle boundary that requires a `duration_complete` event or `on_duration_end` window, neither of which exists in the current surface schema.

The DM-choice destination plane for outsider types (`"a plane associated with its creature type"`) also carries a dm_agenda flavor, but the creature-type gate itself is a deterministic mechanical filter and must be modeled as a real widening, not dismissed as dm_agenda.

**Recommendation:** Defer this branch in the near term. A clean encoding of the primary save → transport mechanic (widenings 1–4) already covers the 95% case. The creature-type conditional can be revisited when the taxonomy adds creature-type predicates and duration-completion events.

---

## Summary table

| Gap | Kind | v4 atom | Proposed change |
|---|---|---|---|
| `transport_exile` Effect variant | `new_variant` | `transport_exile` | Add `TransportExileEffect` to `Effect` union |
| `apply_condition` in spell Effect | `new_variant` | `apply_condition` | Add `ApplyConditionEffect` to `Effect` union |
| `"incapacitated"` Condition | `new_variant` | `apply_condition` (carrier) | Widen `Condition` literal union |
| `return_on_end` lifecycle | `new_variant` | `return_on_end` | Add `returnsOnEnd` to `TransportExileEffect` or new lifecycle variant |
| Creature-type conditional | `new_subgraph` | — | Deferred; requires creature-type predicates + duration-completion events |
