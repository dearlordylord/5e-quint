# Round 2 Group B

Grounding: local `spells-xphb.json` entries for the five spells, read against `TAXONOMY_atoms_graph_v1.md`.

## `Counterspell`

- Round 1 failures fixed: `reaction_window` is no longer the main bucket; `spell_cast_window` gives the spell a better interrupt target, and `ability_check` now exists for the check-like branches in this area.
- Remains: the trigger is still component-sensitive in a way the graph does not name directly, and the slot refund path is still more like prose than a typed refund relation.
- New problems: `respond` is still too broad on its own, and the taxonomy still does not say how to represent “the spell was in the process of being cast” without leaning on spell text.

## `Dispel Magic`

- Round 1 failures fixed: `ability_check` now exists, so the spell no longer needs to leak that branch into prose.
- Remains: the level-band behavior is still not cleanly typed; `branches_on_completion` is too coarse for “auto-end lower spells / check higher spells” as separate shapes.
- New problems: the spell shows that `suppress` and `restore` are not enough by themselves; the graph still needs an explicit interrupt-or-resolution branch for ongoing magic.

## `Find Familiar`

- Round 1 failures fixed: the companion side is much better covered now with `create_companion`, `companion`, `command_companion`, `dismiss`, `replace`, `deliver_touch_spell`, and `telepathic_link`.
- Remains: the “one familiar at a time” rule is still only partially captured by `replace`, and the familiar’s independent turns / attack prohibition still leak into prose.
- New problems: recasting is not just replacement; it is stateful ownership plus form-change, so the graph still needs a more explicit companion lifecycle.

## `Fly`

- Round 1 failures fixed: the movement gap is improved by `modify_speed` and `grant_hover`.
- Remains: the end-of-duration fall is still not modeled cleanly, and the spell’s “willing target touched” shape is still just a target prompt, not a typed movement grant contract.
- New problems: the graph still lacks a real falling/landing subtree, so expiry does not fully explain the spell’s end state.

## `Glyph of Warding`

- Round 1 failures fixed: `stored_spell_slot` was the wrong label; `stored_spell` is the right atom shape.
- Remains: the trigger/branch structure is still split across several generic atoms, and the anchor constraint is not yet a fully typed object/surface relation.
- New problems: the spell confirms that store/release is not one pattern. The stored spell can be delayed, armed, and later released, which means the graph still needs a sharper separation between storage, trigger, and completion.

## Cross-Spell Findings

- `Counterspell` and `Dispel Magic` now validate `spell_cast_window` and `ability_check`, but they also show that interrupt/resolution branches still need more structure than `branches_on_completion`.
- `Find Familiar` and `Glyph of Warding` both pressure ownership-plus-lifecycle shapes: stored or companion-like things are not just created, they are controlled, re-armed, dismissed, or replaced.
- `Fly` proves the graph now needs a movement/fall subtree, not just generic speed modification.
- `Counterspell` still exposes a missing typed way to represent cast-in-progress interruption and component-sensitive triggers.
- `v1` is better than `v0`, but this group still shows the taxonomy is not finished; it is a more honest graph, not a complete one.

Edited file:
- `.references/xphb-srd-pairing/spell-validation/ROUND_2_group_B.md`
