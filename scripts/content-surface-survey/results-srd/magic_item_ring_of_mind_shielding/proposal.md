# Ring of Mind Shielding

## Verdict

`structural_widening`

Do not author a placeholder `content/magic_item_ring_of_mind_shielding.dhall`.

## Why It Does Not Fit

`MagicItemRecord.mechanics` is currently:

- `passive`
- `activation`

This item needs all of the following at once:

- passive always-on protection while worn;
- an activated Magic action that toggles the ring's perceptibility;
- a death-triggered persistent soul-storage state with later telepathic communication.

That is not a missing field on an existing family. It is a mixed-mode item shape the current top-level mechanics union cannot represent honestly.

## Secondary Gaps

Even with a mixed-mode magic-item family, the current effect vocabulary is still missing important mechanics:

1. `block_information_magic`
Evidence:
`"you are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type"`

Why existing atoms are insufficient:
- `grant_condition_immunity` is condition-only.
- `block_targeting` is about targetability, not information revelation.
- `negate_named_effect` is spell-name-specific and not a passive general shield.

2. `telepathy_gate`
Evidence:
`"Creatures can telepathically communicate with you only if you allow it."`
`"A wearer can't prevent this telepathic communication."`

Why existing atoms are insufficient:
- no current atom models selective permission for telepathic communication;
- the post-death clause reverses control and would need the same concept in a second mode.

3. `item_soul_vessel` subgraph
Evidence:
`"If you die while wearing the ring, your soul enters it, unless it already houses a soul."`
`"As long as your soul is in the ring, you can telepathically communicate with any creature wearing it."`

Why existing atoms are insufficient:
- this is item-held occupant state, not a condition, mark, companion, or stored spell;
- it is triggered by death and persists independently of the original wearer;
- later telepathic communication depends on that housed-soul state.

## Omitted Clause

`"You can take a Magic action to cause the ring to become imperceptible..."`

This clause also lacks an honest existing encoding. It looks like item-state concealment or imperceptibility, which is not covered by any current magic-item atom. I did not list it as the primary blocker because the top-level mixed-mode mismatch already stops authoring.

## Why No Placeholder Trace

Any authored JSON would be misleading:

- `passive` would drop the Magic action and death-triggered soul behavior;
- `activation` would drop the always-on protection;
- coercing the privacy clauses into `block_targeting` or similar would misstate the rule.
