## Dagger of Venom

Outcome: `structural_widening`

`Dagger of Venom` does not fit the current magic-item surface honestly.

What fits now:

- passive magic-item grant for `+1` attack rolls made with this specific weapon
- passive magic-item grant for `+1` damage rolls made with this specific weapon
- activated magic-item resource/reset shell for the Bonus Action and next-dawn cooldown
- save/damage/condition payload on a later hit

What does not fit:

- the Bonus Action does not resolve its effect immediately
- instead, it arms the weapon for up to 1 minute
- that armed state listens for a later qualifying event: `an attack using this weapon hits a creature`
- when that event happens, the rider resolves once, then ends
- the armed state also ends early if the minute expires first

The current non-spell families cannot express that combination honestly:

- `activation` can resolve phases now, but it has no ongoing operation grammar
- `on_hit_trigger` exists, but only as an always-available weapon-hit rider, not as a state created by a prior activation
- `triggered_reaction` is the wrong timing and resource model
- `passive` is always-on and cannot carry a per-use armed window

So the missing piece is not a new effect atom. The atoms already exist:

- `modify_roll_numeric`
- `modify_damage_numeric`
- `damage`
- `apply_condition`
- `save_gate`

The gap is a new non-spell subgraph / family that can say:

1. Bonus Action activates an armed state on the item or wielder.
2. That state persists for 1 minute.
3. It opens on a later `weapon hit with this specific item`.
4. On that hit, it resolves a one-shot save gate against the hit creature.
5. The armed state is consumed on the first hit, or expires after 1 minute.

Evidence from unit text:

> "You can take a Bonus Action to magically coat the blade with poison."

> "The poison remains for 1 minute or until an attack using this weapon hits a creature."

> "That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute."

> "The weapon can't be used this way again until the next dawn."
