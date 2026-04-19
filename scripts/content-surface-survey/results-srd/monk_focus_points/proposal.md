# Proposal: Widenings required for Monk's Focus Points

## Classification: `structural_widening`

No content file produced. The unit cannot be honestly encoded in the current surface.

---

## Unit summary

Monk's Focus (Level 2) introduces:

1. **Focus Points pool** — scales with Monk level (Monk Features table), refills on short or long rest.
2. **Flurry of Blows** — optional: spend 1 FP → two Unarmed Strikes as Bonus Action.
3. **Patient Defense (free)** — take Disengage as Bonus Action.
4. **Patient Defense (FP)** — spend 1 FP → take Disengage + Dodge as Bonus Action.
5. **Step of the Wind (free)** — take Dash as Bonus Action.
6. **Step of the Wind (FP)** — spend 1 FP → take Disengage + Dash as Bonus Action + doubled jump distance for the turn.

---

## Gap 1 — Structural: No shared resource pool (primary blocker)

**Current surface:** Each `ActivatedAbilityMechanics` owns an isolated `resource` (use_count or charge_pool) plus a `resetCadence`. `CompositeClassFeatureMechanics` groups multiple parts but each part still carries its own independent resource.

**Problem:** Focus Points is a class-level shared pool (analogous to spell slots). Three distinct activations — Flurry of Blows, Patient Defense FP, and Step of the Wind FP — all draw from the same pool. There is no way in the current surface to declare a named shared pool that multiple activations reference by name.

**Evidence:** "Your Monk level determines the number of points you have... When you expend a Focus Point, it is unavailable until you finish a Short or Long Rest, at the end of which you regain all your expended points."

**Proposed widening:** A `shared_resource_pool` declaration mechanism — either a new mechanics family (e.g., `resource_pool`) that declares the pool as a class-level resource, or a reference grammar on `ActivatedAbilityMechanics` that allows `resource: { kind: "shared_pool", poolId: "monk_focus_points" }` instead of a self-contained pool. This would let multiple feature units reference the same pool by id.

---

## Gap 2 — Atom: No "N Unarmed Strikes as Bonus Action" atom (Flurry of Blows)

**Current surface:** 
- `scale_attack_count` increases attacks made as part of the Attack action — not a Bonus Action.
- `grant_extra_action` grants an additional standard action (with optional restrictions) — not a Bonus Action and not attack-specific.

**Problem:** Flurry of Blows grants two Unarmed Strikes in the Bonus Action economy. This is structurally different from the Attack action's attack count. It cannot be encoded as a restriction-filtered `grant_extra_action` because the Bonus Action is the activation cost, not the effect.

**Evidence:** "You can expend 1 Focus Point to make two Unarmed Strikes as a Bonus Action."

**Proposed widening:** A new effect atom `bonus_action_unarmed_strikes` with `count: number`, or a more general `grant_unarmed_strikes` atom that takes a count and action economy slot. Alternatively, if the surface gains a `bonus_action_attack` phase kind, Flurry could be modeled as an activation whose Bonus Action cost opens two sequential unarmed-strike attack_rolls.

---

## Gap 3 — Atom: No "use standard action as Bonus Action" reclassification (Patient Defense free, Step of the Wind free)

**Current surface:** No atom reclassifies a standard action kind into Bonus Action economy.

**Problem:** Patient Defense (free) lets the monk take Disengage as a Bonus Action — not as an additional standard action, but specifically in the Bonus Action slot. Step of the Wind (free) does the same for Dash. There is no atom for "action X may be taken as a Bonus Action."

**Evidence:** "You can take the Disengage action as a Bonus Action." / "You can take the Dash action as a Bonus Action."

**Proposed widening:** A new effect atom `allow_action_as_bonus_action` with `action: StandardActionKind`. Could also be expressed as a variant of `grant_extra_action` that specifies "bonus_action economy" as the delivery slot, but that risks conflating action granting with action reclassification.

**Compound form:** The FP-spending variants combine two standard actions into one Bonus Action expenditure (Disengage+Dodge, Disengage+Dash). This may require a list variant: `allow_actions_as_bonus_action: ReadonlyNonEmptyArray<StandardActionKind>`.

---

## Gap 4 — Atom: No jump distance scaling (Step of the Wind FP)

**Current surface:** `modify_speed` (additive delta to walk speed), `set_speed_ratio` (multiplicative walk speed), `grant_speed` (new speed mode), `set_speed` (walk speed to 0). None of these model jump distance.

**Problem:** Step of the Wind FP doubles jump distance for the turn. Jump distance is derived from movement speed in SRD (SRD Rules Glossary: Long Jump = Strength score in feet, High Jump = 3 + Strength modifier) but can be independently scaled by features. No atom captures jump distance as a separately modifiable stat.

**Evidence:** "and your jump distance is doubled for the turn."

**Proposed widening:** A new effect atom `scale_jump_distance` with `multiplier: { numerator: number; denominator: number }` (paralleling `set_speed_ratio`), or a widening of `set_speed_ratio` to accept an optional `speedKind: "walk" | "jump"` discriminant.

---

## Summary table

| Gap | Kind | Severity |
|-----|------|----------|
| Shared resource pool | `new_subgraph` | Blocks encoding entirely |
| Bonus Action unarmed strikes | `new_atom` | Blocks Flurry of Blows |
| Action-as-Bonus-Action reclassification | `new_atom` | Blocks all free variants |
| Compound action-as-Bonus-Action | `new_variant` | Blocks FP-spending variants |
| Jump distance scaling | `new_atom` | Blocks Step of the Wind FP |

---

## Note on CompositeClassFeatureMechanics

`CompositeClassFeatureMechanics` does not solve the shared-pool problem. Each `ClassFeatureComponentMechanics` part (`passive` or `activation`) carries its own isolated resource. There is no cross-part resource reference grammar. The composite is appropriate for features that happen to have both a passive grant and an activated ability (e.g., Second Wind's passive HP formula + activated usage), not for features whose activations share a pool.
