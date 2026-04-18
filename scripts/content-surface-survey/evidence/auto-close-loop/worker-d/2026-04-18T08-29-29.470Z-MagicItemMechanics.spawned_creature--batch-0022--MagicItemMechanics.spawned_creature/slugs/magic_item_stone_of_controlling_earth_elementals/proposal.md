## Stone of Controlling Earth Elementals

Verdict: `surface_widening`

### Why it does not fit cleanly

The closest existing shape is `magic_item` + `mechanics.family = "spawned_creature"`. Most of the item maps cleanly:

- activation cost: `standard_action` with `action = "magic"`
- reset cadence: `dawn`
- range: 30 feet
- control: obeys commands, shared initiative, `turnOrder = "immediately_after_caster"`
- dismissal timing: disappears after 1 hour, on death, or on manual dismissal

The current surface still misses three required details.

### Required widenings

1. `spawned_creature.catalog_ref_stat_block`

The item summons a named monster, not an inline bespoke stat block.

Evidence:
> you can take a Magic action to summon an Earth Elemental

Why this matters:

`MagicItemSpawnedCreatureMechanics` currently requires a full inline `statBlock`. Authoring a fake inline Earth Elemental block would be dishonest, and omitting the stat block would drop the core payload of the item.

2. Environmental activation predicate on activated abilities

Evidence:
> While touching this 5-pound stone to the ground, you can take a Magic action

Why this matters:

`ActivatedAbilityHeader.condition` only models equipment predicates (`holding_item`, `wearing_item`, `unarmored`, weapon/armor gates). This item's gate is not equipment state; it is a physical/environmental prerequisite.

3. `CreatureDismissal.manualDismiss = "bonus_action"`

Evidence:
> or when you dismiss it as a Bonus Action

Why this matters:

`CreatureDismissal.manualDismiss` only allows `"magic_action"` or `"never"`. The item needs a bonus-action dismissal channel.

### Classification rationale

This is not `structural_widening` because the top-level kind and family already exist, and it is not `atom_widening` because the missing pieces are surface-shape gaps rather than new v4 atoms. The narrowest honest classification is `surface_widening`.
