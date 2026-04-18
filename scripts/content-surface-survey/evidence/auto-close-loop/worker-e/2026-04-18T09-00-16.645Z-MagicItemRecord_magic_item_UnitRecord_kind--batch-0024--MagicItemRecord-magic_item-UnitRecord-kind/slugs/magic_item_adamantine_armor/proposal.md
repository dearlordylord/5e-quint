`Adamantine Armor` fits the existing `magic_item` record kind and `passive` mechanics family, but it does not fit the current effect vocabulary honestly.

## Why it does not fit

The current surface has `modify_crit_range`, which lowers the natural-roll threshold for attacks you make to become critical hits. That is an outgoing attacker-side modifier.

`Adamantine Armor` is the opposite mechanic:

> "While you're wearing it, any Critical Hit against you becomes a normal hit."

This is a target-side critical-hit suppression effect on incoming attacks against the wearer. Encoding it as `modify_crit_range` would be false, because the armor does not change the attacker's crit threshold in general, and it does not affect attacks the wearer makes.

## Required widening

- Classification: `atom_widening`
- Needed atom: a new effect atom for incoming critical-hit negation or downgrade, such as `negate_critical_hit` / `downgrade_critical_hit_against_self`

## Minimal honest shape

The new atom should express:

- passive while worn
- scoped to attack rolls against the attached wearer
- when the attack would be a critical hit, treat it as a normal hit instead

No new top-level unit kind or mechanics family is required.
