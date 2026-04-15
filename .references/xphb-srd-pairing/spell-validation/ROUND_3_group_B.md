# Round 3 Group B

Grounding:

- `TAXONOMY_atoms_graph.md`
- `SPELL_VALIDATION_matrix_v0.md`

Spells:

- `Counterspell`
- `Dispel Magic`
- `Find Familiar`
- `Fly`
- `Glyph of Warding`

## Verdict

The residue for this group is now narrow enough to stop iterating on atom inventory.
`v2` fixes the round 2 structural misses well enough that the remaining gaps are mostly about exact phrasing, branch detail, or implementation policy, not about missing new atom families.

## `Counterspell`

Fixed from round 2:

- `spell_cast_window` is now the right interrupt window.
- `interrupt_resolution` gives the spell a typed interruption path.
- `ability_check` covers the check-like branch when the counter attempt is contested.

Still unresolved:

- the component-sensitive trigger is still not named as a dedicated atom.
- the slot refund path is still more policy than surface structure.

Probably not worth atomizing further:

- the remaining residue can stay attached to `spell_cast_window` and `interrupt_resolution` as spell-specific policy.
- a dedicated component-sensitive interrupt atom would be too narrow for this sample.

## `Dispel Magic`

Fixed from round 2:

- `ability_check` is present now.
- `suppress` and `restore` give the spell a real ongoing-magic resolution path.

Still unresolved:

- the level-band behavior is still expressed through generic branching rather than a spell-specific subgraph.

Probably not worth atomizing further:

- the remaining residue is narrow enough to live in completion branching plus spell-level comparison.
- this spell no longer forces a new atom family.

## `Find Familiar`

Fixed from round 2:

- `create_companion`, `command_companion`, `dismiss`, `replace_on_recast`, `deliver_touch_spell`, and `telepathic_link` now cover the familiar lifecycle much better.
- `companion` is now a first-class attachment shape rather than prose.

Still unresolved:

- the one-familiar-only rule still reads more like lifecycle policy than an atom.
- the familiar's independent-turn / attack-prohibition details are still not fully surfaced as typed structure.

Probably not worth atomizing further:

- `replace_on_recast` is enough for the recast replacement rule.
- the action restrictions can stay as spell-specific policy on top of `restrict_action_set` rather than spawning a familiar-only atom.

## `Fly`

Fixed from round 2:

- `modify_speed` and `grant_hover` capture the core movement grant.
- `fall_on_end` now gives the expiry a typed end-state.

Still unresolved:

- the willing-target prompt is still only a prompt, not a richer target-contract atom.
- the precise fall/landing timing is still coarse.

Probably not worth atomizing further:

- the remaining residue is narrow and can stay inside the existing movement / expiry shapes.
- this spell does not justify a dedicated flight-fall subtree yet.

## `Glyph of Warding`

Fixed from round 2:

- `stored_spell` is the right atom, not `stored_spell_slot`.
- `store` / `release` now separate the ward's delayed payload from its later discharge.
- `object` and the root/attachment relations are enough to keep the anchor explicit.

Still unresolved:

- the arming trigger is still not a dedicated atom.
- the delayed-release branch still shares too much generic completion structure.

Probably not worth atomizing further:

- the remaining residue is mostly trigger policy around a stored spell on an object.
- the current store/release split is probably the right stopping point for this group.

## Cross-Spell Findings

- `Counterspell` and `Dispel Magic` now fit the interrupt / resolution side of the graph well enough that no new atom family is clearly forced.
- `Find Familiar` and `Glyph of Warding` are both lifecycle-heavy, but `replace_on_recast`, `store`, and `release` now cover the main residue without inventing new companion-only or ward-only atoms.
- `Fly` is now basically a movement-plus-expiry spell, not a missing subtree.
- `Counterspell` still needs policy-level handling for component sensitivity and refund semantics, but that residue is too small to justify new atoms.
- Across the group, v2 changes the story from "taxonomy is incomplete" to "taxonomy is mostly complete, with a few spell-specific policy seams left in prose."

Edited file:

- `.references/xphb-srd-pairing/spell-validation/ROUND_3_group_B.md`
