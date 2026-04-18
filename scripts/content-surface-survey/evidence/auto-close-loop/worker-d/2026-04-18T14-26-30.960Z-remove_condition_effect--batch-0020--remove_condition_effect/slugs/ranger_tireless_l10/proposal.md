`Tireless` does not fit the current authored surface honestly, so no `content/ranger_tireless_l10.dhall` was written.

The top-level shape is not the problem. This is still a `class_feature`, and the existing `composite` mechanics family is the right family because the feature has:

- an activated self-buff that grants Temporary Hit Points
- a separate always-on rider that changes what happens when a Short Rest finishes

The gaps are narrower than a new family:

1. The activation resource cap needs a minimum floor.
The current `UseCountCap` can say `ability_modifier`, but not `minimum of once`.

Evidence:
> You can use this action a number of times equal to your Wisdom modifier (minimum of once)

Suggested widening:
- add a floor field to the `ability_modifier` cap variant, for example `minimumUses`

2. The Temporary Hit Point amount needs a minimum floor.
The current dice-expression surface can represent `1d8 + Wisdom modifier`, but not the RAW floor of `minimum of 1`.

Evidence:
> you can give yourself a number of Temporary Hit Points equal to 1d8 plus your Wisdom modifier (minimum of 1)

Suggested widening:
- add a minimum-total field on rolled numeric amounts so the resolved total can be clamped to at least 1

3. The Short Rest rider needs a rest-triggered exhaustion decrement.
This is deterministic core mechanics, not DM agenda, but the current passive operation grammar only has elapsed-time triggers. It cannot trigger on finishing a Short Rest, and `remove_condition` would be wrong because Exhaustion is leveled here, not binary.

Evidence:
> Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1.

Suggested widening:
- add a passive/rest trigger keyed to Short Rest completion
- surface a `condition_progression`-style decrement for Exhaustion by exactly 1 level

Why this is `surface_widening`, not `structural_widening`:

- `class_feature` already exists
- `composite` already exists
- the missing pieces are specific shape variants and a missing rest/decrement subgraph, not a missing top-level family

Why this is not `atom_widening`:

- the hard part is surfacing existing mechanical structure honestly, especially the rest-trigger and leveled-condition decrement
- no new top-level content family is forced
