# Proposal: Mirror Image — Structural Widening

## Outcome: `structural_widening`

Mirror Image (Illusion L2) does not fit any existing `SpellMechanics` family. A new family is required.

---

## Why all existing families fail

| Family | Why it fails |
|---|---|
| `ongoing_effect` | `OngoingOperation` is `roll_modifier \| damage_on_hit`. Mirror Image's passive hit-intercept is neither. |
| `activation` | Single-shot phase model. Mirror Image is a persistent per-hit interceptor, not a one-time effect. |
| `triggered_reaction` | Requires reaction-slot casting time + Prepare/Prompt/Commit chain. Mirror Image fires automatically, no reaction cost, no player decision gate. |
| `anchored_trigger` | Plants a trigger at a location/area. Mirror Image attaches to the caster. |

---

## Proposed new family: `passive_hit_intercept`

Shape (strawman — not a schema proposal, just enough to record the gap):

```
PassiveHitInterceptMechanics = SpellMechanicsHeader & {
  family: "passive_hit_intercept";
  attachment: Attachment;          // self
  pool: DuplicatePool;             // 3 destroyable tokens
  interceptCheck: InterceptCheck;  // roll Nd6, succeed if any >= threshold
  onSuccess: "consume_token_redirect_hit";
  terminatesWhen: "pool_empty";
  bypassCondition?: ...;           // Blinded / Blindsight / Truesight
}
```

### New primitives required

**1. `duplicate_pool` resource**

A fixed-count pool of destroyable tokens created at cast time. Each token can absorb one "redirected hit" and is then destroyed. Not `use_count` (tracks activations, not absorbed hits), not `charge` (charge items recharge; this pool only depletes). Analogous to the ablative HP pool pattern.

**2. `on_incoming_hit_window` window atom**

A defender-side window that opens automatically when the caster is hit by an attack roll, before the hit's damage/effects resolve. Distinct from:
- `on_hit_window` — attacker-side, fires after confirmation of hit, grants a rider to the attacker
- `reaction_window` — requires a reaction resource and a player decision to open

The `on_incoming_hit_window` fires without resource cost, and can cancel (redirect) the triggering hit.

**3. `probabilistic_gate` resolution**

Roll N dice (where N = remaining token count) against a fixed threshold (≥ 3). Succeed if any die meets the threshold. This is not:
- `attack_roll` — contested roll against a target number
- `save_gate` — target rolls against a DC
- `ability_check` — single die + modifier vs DC

The N-dice-any-threshold pattern is unique to this spell family (and a small number of similar probabilistic defenses).

**4. `intercept_hit` effect**

When the probabilistic gate succeeds: the caster is treated as not hit (no damage, no effects); instead, one pool token is destroyed. Distinct from:
- `modify_ac` — changes AC, hit still happens on success
- `grant_resistance` — halves damage after hit
- `block_targeting` — prevents targeting before the roll

`intercept_hit` operates between the hit confirmation and damage application, retroactively redirecting the hit to a proxy that is then destroyed.

---

## Bypass condition

The rule "a creature with the Blinded condition, Blindsight, or Truesight is unaffected" is a filter on which attackers can trigger the intercept window. This is an eligibility predicate on the incoming attacker, not a new atom — it can be modeled as a filter on the `on_incoming_hit_window` (analogous to `AnchoredFilter` for Alarm). No new atom needed here specifically.

---

## Scope of widening

- **New family**: 1 (`passive_hit_intercept`)
- **New resource primitive**: 1 (`duplicate_pool`)
- **New window atom**: 1 (`on_incoming_hit_window`)
- **New resolution type**: 1 (`probabilistic_gate`)
- **New effect atom**: 1 (`intercept_hit`)

This is a moderately sized surface expansion. The `on_incoming_hit_window` is likely reusable (Blur, Displacement-style effects also use defender-side incoming-hit windows). The `probabilistic_gate` is narrower but may apply to a small set of probabilistic defenses.
