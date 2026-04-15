# Round 1 Synthesis

Purpose:

- aggregate the first 20-spell pass against `TAXONOMY_atoms_graph.md`;
- identify what `v0` got right, what it undernamed, and what it modeled dishonestly;
- drive the first taxonomy revision.

## Short Answer

`v0` is usable as a falsification target, but not as a real taxonomy.

The main problem is not that the atoms are completely wrong.
It is that they are too coarse and too eager to collapse materially different rule shapes into:

- `grant`
- `apply_condition`
- `modify_roll`
- `move`
- `expire`
- generic `reaction_window`

That is not honest enough for repeated spell work.

## What Round 1 Strengthened

These parts of `v0` held up reasonably well:

- source-root identity via `spell_root`;
- basic time-window atoms like `action_window`, `bonus_action_window`, and `reaction_window`;
- persistence / concentration / expiry as real lifecycle concerns;
- `suppress` as a real operation rather than just a wording flourish;
- `prepare` / `commit` as a promising lens for player-chosen reactive spells like `Shield`.

## What Round 1 Falsified

### 1. Anchored spells are not one thing

`Alarm` and `Glyph of Warding` do not collapse to the same lower-level story.

- `Alarm` is a trigger/alert ward with exclusions and alert-mode choice.
- `Glyph of Warding` really does involve storage and later release, including stored-spell behavior.

So the earlier guess

- ``anchored spells may be about store/release''

is false if treated as a universal rule.

### 2. `stored_spell_slot` is the wrong resource label

`Glyph of Warding` stores a spell, not a slot.

So:

- `stored_spell_slot` should be deleted;
- any future storage vocabulary should describe a stored spell or stored effect, not a slot shell.

### 3. Resolution is undernamed

Round 1 repeatedly exposed missing resolution atoms:

- attack-roll resolution;
- melee spell attack as a distinct attack mode;
- save-gated resolution;
- repeat-save loops;
- ability-check gates;
- spell-cast interruption windows.

Without those, too much of the spell still leaks into prose.

### 4. Movement and stat modification are undernamed

`Fly`, `Haste`, `Shield of Faith`, `Aid`, and `Bless` show that:

- `modify_roll` is too broad;
- `move` is too broad;
- `grant` is too broad.

The taxonomy needs more exact atoms for:

- speed modification;
- AC modification;
- max-HP modification;
- additive roll dice / roll bonuses;
- extra-action grants;
- restricted action subsets.

### 5. Persistent marks, companions, and proxies are undernamed

Round 1 exposed three persistent-state shapes that should not be hidden:

- target marks that can transfer (`Hunter's Mark`);
- companion lifecycle/control (`Find Familiar`);
- persistent attack proxies or force objects (`Spiritual Weapon`).

### 6. `legality` should stay demoted for now

Round 1 did not justify restoring ``legality'' as a top-level bucket.

The more honest current read is still:

- availability and legality mostly emerge from combinations of windows, requirements, attachment, resources, preparation, and commitment.

That hypothesis survives round 1 better than the old standalone legality language.

## Specific Taxonomy Changes Forced By Round 1

Round 1 forces at least these changes:

1. delete `stored_spell_slot`
2. add a resolution bucket
3. add `spell_cast_window` or equivalent interrupt window
4. add `ability_check`
5. add `modify_speed`
6. add `grant_hover`
7. add `grant_extra_action`
8. add `restrict_action_set`
9. add `mark_target`
10. add `transfer_mark`
11. add `self_break`
12. add `repeat_save`
13. add `transport_exile`
14. add `create_attack_proxy`
15. add `command_companion` and stronger companion-lifecycle structure

## Current Research Conclusion

The round 1 result is strong enough to justify a taxonomy revision.

It is not strong enough to justify schema work.

The honest next move is:

- write `TAXONOMY_atoms_graph.md`;
- rerun the same 20 spells against `v1`;
- see which round 1 failures disappear and which ones remain.
