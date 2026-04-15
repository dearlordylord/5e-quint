# Round 2 Group C

Spells:

- `Haste`
- `Hold Person`
- `Hunter's Mark`
- `Invisibility`
- `Magic Weapon`

## `Haste`

- Round 1 failures fixed:
  - `modify_speed`, `modify_ac`, `grant_extra_action`, and `restrict_action_set` now give the spell a much better typed fit than `v0`.
- Still remaining:
  - the Dexterity-save advantage is still not named cleanly;
  - the lethargy end-state is still prose-heavy;
  - the "one attack only" rider is still more specific than the current action vocabulary.
- New problems:
  - `grant_extra_action` is still too broad to separate a granted action from a tightly restricted action submenu.

## `Hold Person`

- Round 1 failures fixed:
  - `repeat_save` and `self_break` now capture the spell's end-of-turn retry loop and its self-ending success shape.
- Still remaining:
  - the humanoid-only target filter is still implicit;
  - `apply_condition` covers the paralyzed state, but not the target-class gate that makes the spell legal in the first place.
- New problems:
  - the spell now shows that save cadence and target legality are distinct graph concerns, not one branch.

## `Hunter's Mark`

- Round 1 failures fixed:
  - `mark_target` and `transfer_mark` finally give the spell a real stateful mark path instead of forcing it through plain attachment.
- Still remaining:
  - the extra damage on hit is still only loosely represented by `damage`;
  - the Perception/Survival rider for finding the target is still prose-only.
- New problems:
  - the mark is not just an attachment; it is a transferable designation with a death-triggered relocation rule, so the graph still needs sharper lifecycle typing.

## `Invisibility`

- Round 1 failures fixed:
  - `self_break` now covers the attack/damage/spell-cast early-end behavior much better than `v0` did.
- Still remaining:
  - the object-target variant is still only half-expressed by `target` / `object`;
  - the spell's fragility is clearer, but the target-triggered break conditions are still not separate graph atoms.
- New problems:
  - `self_break` is useful, but it confirms that expiration-by-time and expiration-by-action are different concepts that should not be collapsed.

## `Magic Weapon`

- Round 1 failures fixed:
  - `alter_item_kind` now gives the spell a real item-transformation hook, so it no longer has to masquerade as a plain numeric buff.
- Still remaining:
  - the attack bonus itself still sits in `modify_roll` rather than a weapon-buff subtype;
  - the higher-slot scaling is still only implicit in the spell text.
- New problems:
  - the spell now makes the item-state rewrite more visible, which shows `modify_roll` and `alter_item_kind` are related but not interchangeable.

## Cross-Spell Findings

1. `v1` fixes the biggest `v0` failures for this group, but the fits are still mixed: `Haste` and `Hold Person` are much better, while `Hunter's Mark` and `Magic Weapon` still force stateful rewrite semantics.
2. `repeat_save` and `self_break` are real improvements. They separate retry cadence from time-based expiry, which `v0` could not do.
3. `mark_target` / `transfer_mark` are necessary, but they also show that a mark is a lifecycle object, not just an attachment or a damage rider.
4. `alter_item_kind` is the right direction for `Magic Weapon`, but it still needs to live beside a true weapon-bonus vocabulary, not replace it.
5. This group does not add a new major family, but it does confirm that the current taxonomy is still a typed pressure map, not a complete spell graph.

## File Edited

- `.references/xphb-srd-pairing/spell-validation/ROUND_2_group_C.md`
