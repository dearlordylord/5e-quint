# Proposal: Widening for Devious Strikes (rogue L14)

**Outcome:** `structural_widening`

## Unit summary

Devious Strikes adds three new options to the Rogue's Cunning Strike menu (acquired at L5). Each option fires as a rider on a Sneak Attack hit, costs a number of sneak attack dice from the per-attack pool, and applies a save-gate effect on the target:

| Option | Ability | Cost | On fail |
|---|---|---|---|
| Daze | CON | 2d6 | Target can only move OR take an action OR take a bonus action on its next turn |
| Knock Out | CON | 6d6 | Unconscious for 1 min or until damage; repeat save EOT |
| Obscure | DEX | 3d6 | Blinded until end of target's next turn |

## Why it does not fit

### 1. No `cunning_strike_option` family (structural)

`ClassFeatureMechanics` has exactly one family: `activation`. An `activation` feature is independently triggered by the rogue (possibly at a cost in uses or resources). Devious Strikes options are **not independently activated** — they are subordinate riders on a Sneak Attack hit, invoked within the scope of an attack action. The feature is a **menu extension** attached to an existing mechanic (`Cunning Strike`), not a standalone class feature.

The surface has no family for "add options to an existing menu" mechanics. Forcing these into `activation` would misrepresent their trigger and cost model.

### 2. No dice-pool cost resource (surface)

The cost is expressed in sneak attack dice (2d6, 3d6, 6d6). This is a per-attack fractional expenditure from the rogue's Sneak Attack pool — the rogue gives up that many dice of Sneak Attack damage in exchange for the rider effect. The surface types offer:

- `use_count` — a discrete charge pool reset on rest
- `spell_slot` — a leveled magic resource
- `charge` — a magic item charge

None of these model "spend X dice out of a per-attack pool." The cost is not a rest-reset resource at all; it is consumed on every invocation within an attack.

### 3. `Condition` closed to `"prone"` (surface)

`types.ts` defines `Condition = "prone"`. Obscure requires `"blinded"` and Knock Out requires `"unconscious"`. Both are standard SRD 5.2.1 conditions. The `apply_condition` atom exists in v4, but the surface type is too narrow.

**Minimum addition:** `Condition = "prone" | "blinded" | "unconscious"` (and likely `"incapacitated"`, `"stunned"`, `"frightened"`, `"charmed"`, `"paralyzed"`, `"poisoned"`, `"restrained"` to serve the full SRD condition atlas).

### 4. No `repeat_save` surface type (surface)

Knock Out applies the Unconscious condition and then grants a repeat save at the end of each of the target's turns. The v4 taxonomy lists `repeat_save` as a resolution atom, but `types.ts` has no surface representation for it in class-feature or mastery rider contexts. A new `RepeatSave` surface type is needed (ability, DC source, expiry event).

### 5. No `restrict_turn_economy` atom for the target (atom)

Daze constrains the target to exactly one of {move, take an action, take a bonus action} on its next turn. The existing `restrict_action_set` atom is wired into `GrantExtraActionEffect.restriction` — it filters which action *type* is valid within a supplemental extra action granted to the rogue. Applying it to the **target's entire turn economy** is semantically different: it's a hard cap on how many distinct action-economy slots the target may use. This is closer to a weakened Incapacitated or a limited Stun — a new atom is needed.

## Proposed widening surface

```
new family:    cunning_strike_option
               ├── trigger: on_sneak_attack_hit
               ├── cost: sneak_attack_dice_cost { dice: number }
               └── effect: CunningStrikeEffect
                   ├── save_gate → apply_condition (blinded | unconscious | ...)
                   ├── save_gate → restrict_turn_economy { slots: number }   ← new atom
                   └── save_gate → repeat_save → condition_expiry

new resource:  sneak_attack_dice_cost { dice: number }
               (fractional per-attack expenditure, no rest-reset cadence)

widen type:    Condition — add blinded, unconscious (and full SRD atlas)

new surface:   RepeatSave { ability, dc, endsOn: "success_at_eot" | ... }

new atom:      restrict_turn_economy (effect on target, slots: number, expiry)
```

## Narrower classification note

The dominant gap is `structural_widening` (no family for Cunning Strike options). The condition-enum gap and repeat-save gap are `surface_widening`. The turn-economy restriction is `atom_widening`. All three are required together to encode any of the three options honestly.
