# Adamantine Armor

Outcome: `atom_widening`

## Why it does not fit cleanly

Adamantine Armor is structurally a `magic_item` with `passive` mechanics, so no new top-level record kind or payload family is needed.

The gap is the effect itself:

> While you're wearing it, any Critical Hit against you becomes a normal hit.

The current surface only has `modify_crit_range`, which models outgoing changes to when attacks **you make** score critical hits. That is not the same mechanic.

Encoding Adamantine Armor as `modify_crit_range` would be dishonest because the item does not change the attacker's crit threshold in general; it passively suppresses the critical-hit upgrade on attacks that hit the wearer.

## Required widening

- New atom: `negate_incoming_critical_hit`
  - Meaning: while attached to a defender, a critical hit against that defender is downgraded to a normal hit.
  - Why this is distinct: this is a defensive crit-suppression rule, not an offensive crit-range modifier.

## Notes

- No `content/magic_item_adamantine_armor.dhall` was authored.
- No compiled JSON or trace was generated, because any current encoding would misstate the rule.
