# Round 3 Group D

Spells:

- `Shield`
- `Shield of Faith`
- `Shocking Grasp`
- `Sleep`
- `Spiritual Weapon`

Grounding: re-check against `TAXONOMY_atoms_graph_v2.md` using the same five-spell slice from the validation matrix.

## `Shield`

- Fixed from round 2:
  - `interrupt_resolution` now gives the spell a real resolve-time shape instead of forcing it through generic AC buff language;
  - `prepare` / `prompt` / `commit` remain the right structural read for the user-facing choice;
  - `negate_named_effect` is now a better fit for the `Magic Missile` clause than the older broad mitigation buckets.
- Still unresolved:
  - the exact cancellation wording is still prose-heavy;
  - `modify_ac` is still part of the effect but no longer the whole story.
- Probably not worth atomizing further:
  - the remaining residue is narrow enough that the current atom set can carry implementation without another spell-specific atom.

## `Shield of Faith`

- Fixed from round 2:
  - the target-attached concentration buff shape is still cleanly represented by `target`, `choose`, `concentrate`, and `modify_ac`;
  - the attachment split remains the right interpretation, not a self-only buff.
- Still unresolved:
  - nothing material.
- Probably not worth atomizing further:
  - this spell is stable under `v2`.

## `Shocking Grasp`

- Fixed from round 2:
  - `attack_roll`, `melee_spell_attack`, and `deliver_touch_spell` cover the delivery path;
  - `deny_opportunity_attack` now names the rider directly, which was the main missing atom in round 2.
- Still unresolved:
  - cantrip scaling remains only lightly typed here;
  - the spell still mixes touch delivery, hit resolution, and rider suppression in a way that is best kept as a small bundle, not exploded further.
- Probably not worth atomizing further:
  - the residue is now implementation detail, not a taxonomy gap.

## `Sleep`

- Fixed from round 2:
  - `save_gate` and `repeat_save` continue to cover the staged save structure;
  - `condition_progression` is now the right carrier for the worsening path;
  - `interrupt_resolution` gives the awake/damage interruption branch a named place.
- Still unresolved:
  - the exact ordering between interruption, repetition, and progression still reads better as prose than as separate spell-only atoms.
- Probably not worth atomizing further:
  - the spell now fits the graph well enough; the remaining nuance is in sequencing, not in missing concepts.

## `Spiritual Weapon`

- Fixed from round 2:
  - `create_attack_proxy` and `attack_proxy` now name the persistent attacker shape directly;
  - `bonus_action_window` keeps the attack loop grounded in the correct timing window.
- Still unresolved:
  - slot-based scaling is still not as explicit as it could be;
  - proxy lifecycle is still a little coarser than the spell text, especially around persistence and control.
- Probably not worth atomizing further:
  - the remaining residue is small enough that `attack_proxy` plus lifecycle atoms are adequate for now.

## Cross-Spell Findings

1. `Shield` is now mostly a resolve-time negation spell plus AC buffing, and `v2` is strong enough to carry that without another atom family.
2. `Shield of Faith` remains the cleanest confirmation that attachment and concentration should stay separate.
3. `Shocking Grasp` is now properly covered by attack delivery plus explicit opportunity-attack denial; the rest is just scaling polish.
4. `Sleep` validates that `save_gate`, `repeat_save`, `interrupt_resolution`, and `condition_progression` are distinct enough to keep, even if the exact sequencing still reads procedurally.
5. `Spiritual Weapon` confirms that proxy-attack creation is real and distinct, but the remaining lifecycle residue is not large enough to justify a new top-level atom family.
6. The residue across this group is now narrow enough to stop iterating on Group D specifically; future work should widen the spell sample or tighten existing prose, not add more spell-only atoms here.

## File Edited

- `.references/xphb-srd-pairing/spell-validation/ROUND_3_group_D.md`
