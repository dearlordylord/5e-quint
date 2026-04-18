# Proposal: magic_item_bead_of_force

**Outcome**: `atom_widening`  
**Confidence**: high

## Why this unit cannot be honestly encoded

The Bead of Force throws a bead up to 60 feet, which explodes into a 10-ft-radius sphere of transparent force lasting 1 minute. Three gaps block honest encoding:

### Gap 1 — No atom for spatial imprisonment (core mechanic)

> "Any creature that failed the save and is completely within the area is trapped inside this sphere."

Creatures that fail the DC 15 Dex save AND are fully enclosed are **imprisoned** — they cannot pass through the sphere wall. This is the item's primary effect. The existing surface has no atom for "bearer cannot exit the enclosing area boundary."

**Why existing atoms don't cover it:**

- `block_travel` (Wall of Force / Forcecage semantics) is an area-boundary property, not a per-creature constraint. It blocks things from passing *through* the wall from either direction and is applied to an area attachment — not to individual creatures on a failed save. There is no directional variant ("outward only") and no per-creature application path.
- `apply_condition` has no SRD condition for "imprisoned in a sphere." Applying `restrained` would be incorrect (restrained means speed 0 + disadvantage on attacks, not spatial confinement).
- `set_speed 0` would prevent movement but not capture the spatial semantics (a creature with 0 speed can teleport; a sphere of force actually blocks teleportation-equivalent effects).

**Proposed widening:**  
New `EffectAtom` variant `imprison_in_area` — marks the subject as unable to exit the host attachment's boundary for the duration. Applied in an `onFail` composite alongside damage. Distinct from `block_travel` (area property vs. creature property) and from `apply_condition` (not a named SRD condition).

---

### Gap 2 — No trigger type for enclosed-creature action → sphere moves (secondary mechanic)

> "An enclosed creature can take a Utilize action to push against the sphere's wall, moving the sphere up to half the creature's Speed."

The sphere is moveable by the creatures trapped inside it. This requires an `OngoingTrigger` variant for "a creature enclosed by the area attachment spends a specific action." The existing vocabulary:

| Existing trigger | Why it doesn't fit |
|---|---|
| `on_caster_spends_action` | The caster is not the actor; the enclosed creature is |
| `on_attached_turn_start` | Fires on turn start, not on action spend |
| `on_creature_studies` | Study action only; not generalizable to Utilize |

**Proposed widening:**  
New `OngoingTrigger` variant `on_enclosed_creature_spends_action` with a cost field (e.g. `{ kind: "standard_action", action: "utilize" }`). The trigger fires when any creature that satisfies the `imprison_in_area` constraint spends the specified action. This pairs with the new `imprison_in_area` atom as the "subject" of the trigger.

---

### Gap 3 — `ActivatedAbilityMechanics` lacks a `range` field (surface widening)

> "You can take a Magic action to throw the bead up to 60 feet."

The bead is thrown to a point 60 ft away; the explosion's area attachment origin is `point_within_range`. In the tracer, all activated abilities use `ctx.range = { kind: "self" }`, so any area attachment prints `"origin: point within Self"` regardless of the actual throw distance. The trace would misrepresent the item's range as melee/self when it is ranged (60 ft).

`MagicItemSpawnedCreatureMechanics` and `TriggeredReactionAbilityMechanics` already have `range: Range`. `ActivatedAbilityMechanics` should receive the same field.

**Proposed widening:**  
Add `readonly range?: Range` to `ActivatedAbilityHeader` (or `ActivatedAbilityMechanics` specifically). The tracer should prefer this over the hardcoded `self` when present.

---

## What WOULD encode cleanly (if gaps were filled)

With the three widenings above, the item would fit `activation` mechanics:

```
magic_item activation
  activationCost: { kind: "standard_action", action: "magic" }
  range: { kind: "point", feet: 60 }
  resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }
  resetCadence: { kind: "never" }
  duration: { kind: "timed", value: { unit: "minute", amount: 1 } }
  phases:
    Phase 1: save_gate
      attachment: area, sphere r=10ft, origin: point_within_range
      DC: { kind: "fixed", dc: 15 }
      ability: "dex"
      onFail: composite
        - damage 5d4 force
        - imprison_in_area  ← NEW
        - (creatures partially within: force_move push 10ft via success branch or separate direct)
      onSuccess: force_move push 10ft
    Phase 2: direct
      attachment: area, sphere r=10ft, origin: point_within_range
      effects:
        - block_travel { scope: "through_sphere_wall" }
        - block_targeting { scope: "through_sphere_wall" }
      operations:
        - trigger: on_enclosed_creature_spends_action  ← NEW
                   cost: { kind: "standard_action", action: "utilize" }
          effect: force_move (sphere repositions half creature's speed)
destruction: { kind: "permanent_on_empty" }
```

**Minor gap not blocking encoding:** The 1-pound weight of the sphere and the "can be picked up" mechanic have no weight atom. This is cosmetic for combat modeling purposes.

## Summary of proposed widenings

| # | Kind | Name | Pressure |
|---|---|---|---|
| 1 | `new_atom` | `imprison_in_area` | Core on-fail mechanic; no existing atom covers per-creature exit constraint |
| 2 | `new_variant` | `OngoingTrigger.on_enclosed_creature_spends_action` | Sphere movement via enclosed creature's Utilize action |
| 3 | `new_variant` | `ActivatedAbilityMechanics.range` | 60-ft throw range; trace would misprint as "Self" without this |
