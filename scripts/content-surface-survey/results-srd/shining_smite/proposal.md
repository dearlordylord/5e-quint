# Proposal: Shining Smite — structural_widening

## Unit

- **Name**: Shining Smite
- **Slug**: shining_smite
- **Kind**: spell (level 2, Transmutation)
- **Provenance**: srd-5.2.1

## Why it cannot be honestly encoded

Shining Smite belongs to the **smite pattern**: a Bonus Action taken *after* a weapon hit has resolved, which adds immediate extra damage to that hit and then establishes a concentration effect on the target. No existing `SpellMechanics` family captures this two-part shape.

### 1. Structural gap: the smite pattern (primary blocker)

**The mechanics:**

> "The target hit by the strike takes an extra 2d6 Radiant damage **from the attack**."

The 2d6 Radiant is damage added to the *already-resolved* weapon attack. The spell does not make a new attack roll. Then:

> "Until the spell ends, the target sheds Bright Light in a 5-foot radius, attack rolls against it have Advantage, and it can't benefit from the Invisible condition."

**Why no existing family fits:**

| Family | Why it fails |
|---|---|
| `ongoing_effect` + `damage_on_hit` | `damage_on_hit` fires when the caster subsequently hits the attachment. Shining Smite's damage fires on the *triggering* hit—a one-time event at cast time, not on future caster-hits. Using `damage_on_hit` would be a false trace. |
| `activation` + `attack_roll` phase | The activation family's attack_roll phase requires the *spell* to make the attack roll. Shining Smite piggybacks on a weapon attack already resolved before the spell is cast. |
| `ongoing_effect` alone | Ongoing_effect has no way to express a one-time damage event at the moment of casting. |
| `activation` alone | Activation has no way to express concentration effects that persist and attach to the target. |

**Needed**: A new `smite_activation` family (or a hybrid) that models:
1. A post-hit trigger condition (cast is gated on the caster just having hit a creature)
2. A one-time damage application to the triggering hit
3. Concentration-scoped ongoing effects that attach to the struck target

This pattern is shared verbatim by Searing Smite, Thunderous Smite, Wrathful Smite, Blinding Smite, Staggering Smite, and Banishing Smite. A single family widening would cover all of them.

---

### 2. Surface gap: CastingTime bonus_action with a condition

```
"time": [{ "number": 1, "unit": "bonus", "condition": "which you take immediately after hitting a creature with a Melee weapon or an Unarmed Strike" }]
```

`CastingTime` in types.ts:

```typescript
| { readonly kind: "bonus_action" }
```

There is no `condition` or `trigger` field on the `bonus_action` variant. The timing constraint is mechanically significant: the bonus action is only available *after* a weapon hit resolves, not freely on the caster's turn. (Compare to a free Bonus Action like Misty Step.) Without this field the constraint is invisible in the surface record.

**Needed**: A new `CastingTime` variant — e.g. `{ kind: "bonus_action"; trigger: PostHitTrigger }` — or a `condition` field on the existing `bonus_action` variant that captures the "immediately after hitting" restriction.

---

### 3. Surface gap: OngoingOperation missing modify_roll_advantage

The ongoing effect includes:

> "attack rolls against it have Advantage"

`OngoingOperation` supports:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

`RollModifierOperation` applies a numeric dice delta (`DiceDelta`) to rolls — it cannot express advantage/disadvantage. `modify_roll_advantage` exists in v4 as a `MasteryEffect` atom, but is not lifted into `OngoingOperation`.

**Needed**: Add `modify_roll_advantage` as a third `OngoingOperation` variant, applied to the target attachment. Faerie Fire (granting advantage to all attackers against lit targets) has the same need.

---

### 4. Atom gap: deny_condition_benefit

> "it can't benefit from the Invisible condition"

This is not:
- `remove_condition` — the creature may still have the Invisible condition applied; only its benefits (attack advantage for the invisible creature, attack disadvantage for attackers) are nullified.
- `apply_condition` — no condition is being applied to the target.
- `suppress` — `suppress` is a procedure atom in v4, not an effect atom targeting a condition's benefits.

No v4 atom covers "nullify the mechanical benefits of condition X on the bearer while leaving the condition itself in place."

**Needed**: A new effect atom, e.g. `deny_condition_benefit`, with a `condition` field and a scope (e.g. `"all"` or `"offensive_benefit"`) — or an extension of `suppress` as an effect atom that targets a named condition.

---

### 5. Note on bright-light emission

The text "the target sheds Bright Light in a 5-foot radius" is the narrative *mechanism* that explains why Advantage and Invisible-benefit-denial apply. Per ARCHITECTURE.md, lighting/environment effects are caller-owned. The deterministic mechanical consequences of the light are already captured by the Advantage on attacks and the condition-benefit denial. No additional core-mechanics atom is needed for the light emission itself.

---

## Summary of required widenings

| Kind | Name | Scope |
|---|---|---|
| `new_subgraph` | `smite_activation` family | New `SpellMechanics` family for post-hit bonus-action spells |
| `new_variant` | `CastingTime: bonus_action_conditional` | New variant of `CastingTime` with after-hit trigger |
| `new_variant` | `OngoingOperation: modify_roll_advantage` | New variant of `OngoingOperation` for advantage grants |
| `new_atom` | `deny_condition_benefit` | New v4 effect atom for condition-benefit suppression |

The smite family widening (#1) is the primary blocker. The remaining three are co-pressures exposed by the same spell.
