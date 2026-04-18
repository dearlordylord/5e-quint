## Talisman of Pure Good

Outcome: `atom_widening`

The item fits the existing `magic_item` record and would naturally be a `composite` item:

- one passive part for `+2` to `spell_attack_roll` while worn or held;
- one activated part for `Pure Rebuke` with a `charge_pool`, `standard_action: magic`, `fixed DC 20`, and deterministic destruction on empty.

I stopped before authoring because two required mechanics are not representable honestly, and one of them is an atom gap.

### Blocking gap: failed-save destruction

`Pure Rebuke` does not merely deal damage, exile, or apply a condition. On a failed save the target is outright removed from play:

> On a failed save, the target falls into the fissure and is destroyed, leaving no remains.

The current effect surface has no atom for creature destruction / kill / remove-with-remains-policy. Existing nearby effects are not honest substitutes:

- `damage` is wrong because the target can be destroyed regardless of HP total.
- `transport_exile` is wrong because the creature is not relocated.
- `apply_condition` is wrong because this is not a condition.

This forces a new effect atom, e.g. `destroy_target`.

### Secondary surface gap: passive hostile-contact rider

The talisman's baseline anti-Fiend/Undead effect is passive but event-driven:

> A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman.

Current `PassiveOperation` only supports:

- `elapsed_time`

It cannot express:

- `on_creature_touches_item`
- `on_holder_turn_end`
- a holder/carrying predicate tied to the item

This is a surface widening, not a new v4 atom, because the actual effect is still `damage`.

### Secondary surface gap: target-type-conditional save disadvantage

`Pure Rebuke` modifies the one resolving save based on the chosen target's type:

> If the target is a Fiend or an Undead, it has Disadvantage on the save.

The current surface can:

- filter eligible targets by creature type; or
- grant broader roll advantage/disadvantage effects;

but it cannot express "any creature may be targeted, and only Fiends/Undead have disadvantage on this save."

That needs a new save-gate-side variant or predicate-bound modifier.

### Minor additional gap

The activation also narrows targeting to:

> one creature you can see on the ground within 120 feet of yourself

The current target attachment has no explicit grounded-position predicate.

### What already fits

These parts are already supported:

- magic-item kind
- composite passive + activation structure
- attunement restriction by class list: Cleric or Paladin
- passive `modify_roll_numeric` on `spell_attack_roll`
- `charge_pool` with `permanent_on_empty`
- `fixed` DC 20 save gate
- success-branch psychic damage
