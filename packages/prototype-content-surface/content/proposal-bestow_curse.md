# Proposal: Bestow Curse

**Outcome:** `structural_widening`
**Confidence:** high

---

## Why the unit does not fit

Bestow Curse has a three-part structure that no existing payload family can express honestly:

1. **Initial save gate** — caster touches a target; the target makes a Wisdom saving throw.
2. **On failure: apply persistent curse** — the target is cursed for the duration (concentration, ≤ 1 minute at base level).
3. **While cursed: one of four caster-chosen ongoing riders** — the caster picks at cast time which debuff the curse applies.

### Missing family

The existing families are:
- `ongoing_effect` — persistent state while concentration/timed, but **no initial save gate**; the operation begins immediately on all targets in the attachment.
- `activation` — instant/phased resolution, but the `Effect` type only supports `damage` and `none`; it cannot express "apply a persistent ongoing debuff state."
- `triggered_reaction`, `anchored_trigger` — clearly inapplicable.

There is no family for: *save gate → on fail apply a persistent curse container → curse container holds a caster-chosen ongoing rider*.

A new family (tentatively: `save_gated_curse` or a generalized `conditional_ongoing`) would be needed, or a composition mechanism allowing `activation` phases to feed into `ongoing_effect` riders.

### Missing: caster-choice mechanism

All four options are mutually exclusive choices made by the caster at cast time. The surface has no `ChoiceOf<T>` or `select_one_of` type anywhere. The v4 taxonomy has a `choose` procedure atom, but the surface type system has no corresponding structural type to represent "one of the following, chosen at cast."

---

## Individual rider gaps (secondary to the structural gap)

Even if the top-level family were extended, each option surfaces independent gaps:

### Option A — Ability-scoped roll disadvantage
> "Choose one ability. The target has Disadvantage on ability checks and saving throws made with that ability."

- `RollKind` is `"attack_roll" | "saving_throw"` — **no `ability_check` variant**.
- Even with `ability_check` added, the `roll_modifier` operation has no ability-filter axis. The modifier would apply to all saves/checks uniformly, not only those using the chosen ability.
- **Widening needed:** `surface_widening` — extend `RollKind` + add ability-scoped filter to `RollModifierOperation`.

### Option B — Relational attack-roll disadvantage
> "The target has Disadvantage on attack rolls against you."

- The target has disadvantage on attack rolls, but **only when targeting the caster**. Current `modify_roll_advantage` riders apply uniformly; there is no "when attacking creature X" predicate.
- **Widening needed:** `surface_widening` — add relational scoping to `ModifyRollAdvantageRider` (or a new rider variant).

### Option C — Per-turn repeated save with action compulsion
> "In combat, the target must succeed on a Wisdom saving throw at the start of each of its turns or be forced to take the Dodge action on that turn."

- **Repeated save:** v4 taxonomy has `repeat_save` but the surface has no corresponding atom in `SpellMechanics`. The existing `save_gate` in `ActivationPhase` is one-time.
- **Action compulsion:** Forcing the target to *take* a specific action (Dodge) is distinct from `restrict_action_set` (which removes options). No existing effect atom expresses affirmative compulsion. **Widening needed:** `atom_widening` — expose `repeat_save` in surface types + new `compel_action` effect atom.

### Option D — On-damage-from-caster rider (attack roll or spell)
> "If you deal damage to the target with an attack roll or a spell, the target takes an extra 1d8 Necrotic damage."

- The existing `DamageOnHitOperation` fires on `on_hit_window` (attack-roll hit only). This option fires on **any damage** from the caster — including spell damage (e.g., Fireball hitting the cursed target).
- **Widening needed:** `surface_widening` — new `OngoingOperation` variant `damage_on_any_damage_from_caster` or a broader trigger scope on `DamageOnHitOperation`.

---

## Additional gap (not proposed for this iteration)

The `entriesHigherLevel` scaling for Bestow Curse changes the *concentration requirement and duration* based on slot level in a non-linear, categorical way (1 min concentration → 10 min concentration → 8 hours no-concentration → 24 hours no-concentration → until-dispelled). This is not representable by any `Duration` variant or scaling type in the current surface. It would require a `SlotScaledDuration` shape or a `threshold_tiers<Duration>` — a further `surface_widening` not gated on the structural fix.

---

## Summary of required widenings

| # | Kind | Name | Blocks encoding? |
|---|------|------|-----------------|
| 1 | `new_subgraph` | save_gate → apply_curse + choose ongoing_rider family | **Yes — primary** |
| 2 | `new_subgraph` | `ChoiceOf<N>` caster-choice mechanism at cast time | **Yes — primary** |
| 3 | `new_variant` | `RollKind: ability_check` | Yes (option A) |
| 4 | `new_variant` | Ability-scoped roll modifier | Yes (option A) |
| 5 | `new_variant` | Relational attack-roll disadvantage scoping | Yes (option B) |
| 6 | `new_atom` | `repeat_save` (surface exposure) | Yes (option C) |
| 7 | `new_atom` | `compel_action` effect | Yes (option C) |
| 8 | `new_variant` | `damage_on_any_damage_from_caster` operation | Yes (option D) |
| 9 | `new_variant` | Save gate `Effect` variant for `apply_ongoing_effect` | Yes (all options) |
