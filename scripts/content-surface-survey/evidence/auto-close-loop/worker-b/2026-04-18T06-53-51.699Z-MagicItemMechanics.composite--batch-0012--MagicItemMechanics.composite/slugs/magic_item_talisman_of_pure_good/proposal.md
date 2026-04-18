# Talisman of Pure Good

Outcome: `structural_widening`

## Why it does not fit

The item combines:

- a passive held/worn modifier: `+2` to spell attack rolls;
- an always-on punitive trigger on touch / hold / carry for Fiends and Undead;
- an activated charge ability with a save, conditional save disadvantage, and destruction on failed save;
- deterministic destruction when the last charge is spent.

The current magic-item surface can represent the passive/activation composite shape in general, but it cannot honestly represent the touch / hold hazard. That mechanic is not:

- `passive`, because it is not a static always-on grant;
- `activation`, because it is not voluntarily activated and does not consume a resource;
- `triggered_reaction`, because it is not a reaction window or a user choice.

That missing family is the primary blocker, so I did not author a placeholder `content/magic_item_talisman_of_pure_good.dhall`.

## Specific gaps

1. Missing passive-triggered item hazard family/subgraph

Evidence:

> "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."

Why existing shapes fail:

- `PassiveMechanics.grants` cannot express event-triggered damage.
- `TriggeredReactionAbilityMechanics` incorrectly implies a reaction cost and optional commit flow.
- `ActivationMechanics` incorrectly implies deliberate use and resource spend.

Needed shape:

- An item component that can attach a standing trigger to the item or bearer, with event windows such as `on_touch_item` and `on_turn_end_while_holding_or_carrying`, plus target filters like creature type.

2. Missing `destroy_target` effect atom

Evidence:

> "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."

Why existing atoms fail:

- `damage` is not equivalent to deterministic destruction.
- `transport_exile` is not honest; the target is not relocated.
- `apply_condition` cannot stand in for removal from play.

Needed shape:

- A dedicated destruction/removal effect atom, potentially with residue semantics such as `leaves_no_remains`.

3. Missing save modifier hook on `save_gate`

Evidence:

> "If the target is a Fiend or an Undead, it has Disadvantage on the save."

Why existing shapes fail:

- `save_gate` can specify the save, DC, and fail/success branches, but not a conditional modifier to the save itself.
- `Attachment.selection.typeFilter` would be dishonest because Pure Rebuke can target creatures other than Fiends or Undead.

Needed shape:

- A `save_gate` rider or nested modifier that can apply advantage/disadvantage to the target's save when a predicate holds, here `target creature type in [fiend, undead]`.

4. Missing spell-attack-only roll filter

Evidence:

> "You gain a +2 bonus to spell attack rolls while you wear or hold it."

Why existing shapes fail:

- `modify_roll_numeric` can target `attack_roll`, but that includes weapon attacks too.
- `weaponFilter` narrows weapon attacks only; it cannot express spell attacks.

Needed shape:

- Either a new `RollKind` split for spell vs weapon attack rolls, or an attack filter on `modify_roll_numeric` that can express `spell_attack_only`.

5. Missing grounded-target predicate

Evidence:

> "target one creature you can see on the ground within 120 feet of yourself"

Why existing shapes fail:

- `TargetSelection` supports count and creature-type filters, but not spatial-state predicates like grounded/on-ground.

Needed shape:

- A target predicate variant such as `ground_only`.

## Classification rationale

This is `structural_widening`, not merely `surface_widening`, because the passive touch/hold hazard needs a new mechanics component family or subgraph. The other gaps are secondary widenings layered on top of that.
