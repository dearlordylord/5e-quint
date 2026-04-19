# Proposal: Moonbeam surface gaps

## Outcome: `atom_widening`

The core of Moonbeam — ongoing_effect family, cylinder area attachment, Con save gate on entry/end-of-turn, 2d10 radiant damage with slot-level scaling, concentration 1 minute — encodes cleanly with existing atoms. The `initialPhase` field handles the cast-time save correctly.

Two mechanics cannot be expressed with any existing atom.

---

## Gap 1: `revert_transformation` atom (atom_widening)

**RAW:** "…if the creature is shape-shifted (as a result of the Polymorph spell, for example), it reverts to its true form…"

On a failed save, the target's active transformation (Polymorph, Alter Self Natural Weapons, Wild Shape, etc.) ends immediately. No existing atom covers this:

- `end_ongoing_spells` — ends spells by level bound, not by transformation kind; would incorrectly terminate any concentration spell on the target.
- `transform_target` — applies a transformation outward (caster → target); does not reverse an existing transformation on the target.
- `remove_condition` — no SRD condition tracks "currently transformed."

**Proposed atom:**
```
revert_transformation
  target: "current_form"   // return to true form
  // implied: terminates the active transformation effect
  //          regardless of its source (spell, class feature, etc.)
```

This belongs in `EffectAtom` and would be the `onFail` branch alongside the `damage` atom in a `composite`. It couples with the `suppress_shapeshifting` atom below.

---

## Gap 2: `suppress_shapeshifting` atom (atom_widening)

**RAW:** "…and can't shape-shift until it leaves the Cylinder."

After reverting, the creature is blocked from changing form while it remains inside the area. This is a persistent suppressor conditioned on area occupancy:

- Not representable as a Condition (none of the 15 SRD conditions block shape-shifting).
- Not `apply_condition` — no such condition exists.
- Not `block_targeting` — that blocks spells targeting the creature, not actions the creature takes.
- Not `grant_condition_immunity` — this is a forward suppressor ("can't do X") not a backward one.

**Proposed atom:**
```
suppress_shapeshifting
  // persists until creature exits the host area attachment
```

The area-scoped lifetime (exits-area expiry) is novel — unlike existing passive grants that persist for a duration, this suppressor expires when the affected creature leaves the cylinder. This may require a new lifecycle expiry variant (or use of the existing `block_targeting` scope grammar extended to self-originated transformation actions).

---

## Gap 3: `OngoingOperation.usageLimit` (surface_widening)

**RAW:** "A creature makes this save only once per turn."

Multiple triggers can fire on the same turn (creature enters area via its own movement AND the area moves onto a creature AND it ends its turn there). The once-per-turn cap de-duplicates them. No rate-limiting field exists on `OngoingOperation`.

**Proposed widening:** Add `usageLimit?: UsageLimit` to `OngoingOperation`, parallel to the existing `UsageLimit` on mastery mechanics and `ActivatedAbilityMechanics`. This would also fix Cloudkill and Spirit Guardians which have the same constraint.

---

## Gap 4: `on_area_repositioned_onto_creature` trigger (surface_widening)

**RAW:** "A creature also makes this save when the spell's area moves into its space…"

The `on_creature_enters_area` trigger fires when a creature moves into the area. It does not fire when the area moves to engulf a stationary creature. When the caster uses the Magic action to move the cylinder (via `reposition_attachment`), creatures newly inside the moved area should be triggered — but no `OngoingTrigger` variant covers this.

**Proposed widening:** A new `OngoingTrigger` variant, e.g.:
```
{ kind: "on_area_repositioned_onto_creature" }
```
Or alternatively, a semantic rule that `reposition_attachment` always re-triggers `on_creature_enters_area` for newly-covered creatures at the runtime level (no surface change needed, just a runtime convention).

---

## Omitted encodable mechanics (Dhall type homogeneity constraint)

Two mechanics are expressible with existing atoms but were excluded from the Dhall encoding because they would require a heterogeneous `operations` list (the spirit_guardians Optional-field trick):

**Dim light (`emit_light`):**
```json
{ "trigger": { "kind": "passive" },
  "effect": { "kind": "emit_light", "brightRadiusFeet": 0, "dimAdditionalFeet": 5 } }
```
`brightRadiusFeet = 0` models "no bright light"; dim light extends 5 ft from origin. Slightly awkward encoding for dim-light-only; the `emit_light` atom could benefit from an optional `dimOnlyRadiusFeet` variant. The cylinder shape scopes where the light falls, so the area attachment handles the 3D constraint.

**Area movement (`reposition_attachment`):**
```json
{ "trigger": { "kind": "on_caster_spends_action", "cost": { "kind": "standard_action", "action": "magic" } },
  "effect": { "kind": "reposition_attachment", "maxMoveFeet": 60 } }
```
Fully encodable. Only excluded for Dhall homogeneity.

---

## Tracer note

The `scale_die_count` scaling node is only emitted for the `initialPhase` damage (`dmg11`). The two ongoing `save_gate` branches (`dmg16`, `dmg19`) do not emit scaling nodes because `traceOngoingOpEffect`'s `save_gate` handler does not call `traceDiceAmountScaling`. This is a gap in the tracer, not in the authored JSON (the `linear_per_level` amount is correct in both ongoing save_gate effects).
