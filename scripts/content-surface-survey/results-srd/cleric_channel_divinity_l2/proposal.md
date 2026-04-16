# Proposal: Channel Divinity (cleric L2)

**Outcome:** `structural_widening`

Channel Divinity was not encoded. The unit requires multiple widenings, with the most fundamental being architectural: the container feature is a "menu-activation" — a shared use-count pool that dispatches to one of N named sub-effects chosen by the player. No existing `ClassFeatureMechanics` family can represent this honestly.

---

## What fits today

- **Use-count resource** with `cap: { kind: "threshold_tiers", axis: "class" }` for the tiered use cap (2 uses at L2, more at higher levels) — this fits `UseCountResource + ThresholdTiers<number>`.
- **Reset cadence** `partial_short_full_long` with `shortRestRefill: 1` — fits exactly.

---

## Gap 1 — Structural: menu_activation family (most critical)

**What it is:** Channel Divinity is not one effect — it is a shared activation pool that lets the cleric select one of several named effects at use time. `ClassFeatureActivationMechanics.effect` is a singular field; there is no "choose one of N effects" shape in any current `ClassFeatureMechanics` family.

**Evidence:** "Each time you use this class's Channel Divinity, choose which Channel Divinity effect from this class to create."

**Proposed widening:** A new `ClassFeatureMechanics` family, e.g. `menu_activation`, with an `effects: ReadonlyArray<NamedClassFeatureEffect>` field and a `choose: "one"` selector. Sub-effects are named (Divine Spark, Turn Undead) and each carries its own activation shape.

---

## Gap 2 — Surface: ClassFeatureActivationCost: magic_action

**What it is:** Both Divine Spark and Turn Undead are activated with a Magic action. `ClassFeatureActivationCost` only has `{ kind: "free" }` and `{ kind: "bonus_action" }`.

**Evidence:** "As a Magic action, you point your Holy Symbol at another creature..."

**Proposed widening:** Add `{ kind: "action" }` (or `{ kind: "magic_action" }`) to `ClassFeatureActivationCost`. This maps to the `magic` `StandardActionKind` from the existing enum.

---

## Gap 3 — Surface: DiceExpr ability-modifier addend

**What it is:** Divine Spark's heal and damage amount is `1d8 + Wisdom modifier`. `DiceExpr.flat` is a fixed integer — there is no field for "add an ability score modifier" as a runtime-derived addend.

**Evidence:** "Roll 1d8 and add your Wisdom modifier."

**Proposed widening:** Add an optional `abilityModifier?: Ability` field to `DiceExpr` (or a new `DiceExprAbilityMod` variant of `DiceAmount`), meaning "add the character's modifier for this ability to the result."

---

## Gap 4 — Surface: ClassFeatureEffect: player_choice_fork

**What it is:** Divine Spark gives the cleric a choice at activation time: either heal the target for the rolled total, or force a CON save where the target takes the rolled total as damage on failure (half on success). This is a deterministic player election that forks the effect — not a resolution branch (the player decides before dice are rolled against the target's defense).

**Evidence:** "You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw."

**Proposed widening:** A new `ClassFeatureEffect` variant such as `PlayerChoiceForkEffect` with two branches (heal branch and save-gate branch), or alternatively a `save_gate_damage` effect that the cleric opts into over the heal.

---

## Gap 5 — Surface: ClassFeatureEffect: apply_condition (multi-condition, timed, early-expiry)

**What it is:** Turn Undead applies Frightened and Incapacitated simultaneously for up to 1 minute, ending early on the target if: (a) it takes damage, (b) the caster gains Incapacitated, or (c) the caster dies. `ClassFeatureEffect` only has `GrantExtraActionEffect` and `HealHpEffect`.

**Evidence:** "it has the Frightened and Incapacitated conditions for 1 minute. For that duration, it tries to move as far away from you as it can on its turns. This effect ends early on the creature if it takes any damage, if you have the Incapacitated condition, or if you die."

**Proposed widening:**
- A new `ClassFeatureEffect` variant `apply_condition` carrying a list of conditions to apply, a duration, and a list of early-expiry triggers.
- Expiry triggers needed: `target_takes_damage`, `caster_gains_condition` (with condition spec), `caster_dies`.

---

## Gap 6 — Surface: Condition enum: frightened, incapacitated

**What it is:** `Condition` is a closed enum with only `"prone"`. Turn Undead requires `"frightened"` and `"incapacitated"`.

**Evidence:** "it has the Frightened and Incapacitated conditions for 1 minute"

**Proposed widening:** Extend `Condition` to include `"frightened"` and `"incapacitated"` (and likely others as more features land — charmed, stunned, paralyzed, etc. are all common SRD conditions used by class features).

---

## Turn Undead area-targeting note

Turn Undead targets each Undead of the cleric's choice within 30 feet — this is multi-target area selection against a creature-type filter ("Undead"). The current `ClassFeatureActivationMechanics` has no attachment/target fields at all (unlike spell families). Any class feature that targets creatures will require a target attachment pattern for class features, which is also absent today.

---

## Priority order

1. `menu_activation` family (structural — blocks all Channel Divinity encoding)
2. `magic_action` activation cost (surface — blocks both sub-effects)
3. `DiceExpr` ability modifier (surface — blocks Divine Spark amount)
4. `ClassFeatureEffect: apply_condition` + `Condition` widening (surface — blocks Turn Undead)
5. `ClassFeatureEffect: player_choice_fork` (surface — blocks Divine Spark dual-mode)
