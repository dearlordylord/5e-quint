# Round 2 Synthesis

Purpose:

- aggregate the second 20-spell pass against `TAXONOMY_atoms_graph_v1.md`;
- determine whether `v1` removed enough false compression to stop iterating;
- identify the smaller set of remaining taxonomy gaps.

## Short Answer

`v1` is materially better than `v0`.

It fixed real problems:

- `spell_cast_window`
- `ability_check`
- `modify_speed`
- `grant_extra_action`
- `restrict_action_set`
- `mark_target`
- `transfer_mark`
- `self_break`
- `transport_exile`
- `create_attack_proxy`

But the taxonomy is still not finished.

The remaining residue is narrower and more honest than round 1, which is a good sign, but it is still large enough to justify one more revision.

## What Round 2 Resolved

### Clear improvements

- `Counterspell` no longer depends on a generic reaction bucket alone.
- `Dispel Magic` no longer needs prose to introduce ability checks from nowhere.
- `Haste` no longer collapses all of its buffs into generic `grant`.
- `Hunter's Mark` now has a real mark/transfer path.
- `Hold Person` and `Invisibility` now have better lifecycle structure through `repeat_save` and `self_break`.
- `Shield` now fits prepare / prompt / commit more honestly.
- `Spiritual Weapon` now has a real attack-proxy concept instead of being flattened into generic object creation.

## What Still Leaks

### 1. Trigger / alert structure

`Alarm` still needs a real trigger/alert concept.

It is not:

- storage;
- release;
- ordinary response.

### 2. Outcome and return typing

`Banishment` still wants more exact outcome typing:

- save-gated transport;
- return-on-end in one branch;
- no-return-on-complete in another branch.

### 3. Target-cap and slot-scaling structure

`Aid`, `Bless`, `Fly`, `Magic Weapon`, and `Spiritual Weapon` still expose the same gap:

- slot scaling is not one thing;
- sometimes it changes target count;
- sometimes it changes numeric bonus;
- sometimes it changes damage.

The taxonomy still needs a more explicit scaling subtree.

### 4. Movement / fall subtree

`Fly` still shows that:

- movement grant;
- hover;
- fall-on-end;
are related but distinct.

### 5. Condition progression and denial riders

`Sleep` and `Shocking Grasp` still expose missing atoms for:

- condition progression;
- interruption by damage / waking;
- opportunity-attack denial;
- narrow named negation like `Shield` vs `Magic Missile`.

### 6. Companion and proxy lifecycle

`Find Familiar` and `Spiritual Weapon` still show lifecycle gaps:

- one-instance-only constraints;
- recast-as-replacement;
- repeat attack loop;
- proxy cleanup and control boundaries.

## Round 2 Conclusion

`v1` passed the basic usefulness test.

It is no longer just a pressure map pretending to be a graph.

But it is still incomplete enough that a round-3 revision is justified.

The correct next move is:

1. write `TAXONOMY_atoms_graph_v2.md`;
2. focus the changes on the remaining narrow gaps;
3. rerun the same 20 spells one more time;
4. stop iterating after round 3 unless the result is still structurally dishonest.
