**Why It Doesn't Fit**

`Tome of Leadership and Influence` does not fit the current `MagicItemRecord` surface honestly.

The available mechanics families are:

- `passive` — always-on while the item is in effect
- `activation` — a discrete use that spends a resource and immediately runs phases

This item is neither.

- It is not `passive`: the Charisma increase is not an ongoing while-worn / while-attuned state.
- It is not current `activation`: the rule requires a tracked study process, `48 hours over a period of 6 days or fewer`, before the benefit lands.

**Missing Pieces**

1. A study / completion subgraph for magic items

The current activation family has no honest way to represent:

- prolonged study as the cost
- accumulation toward a required total
- an outer completion deadline
- payoff only after the study completes

Relevant text:

> "If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines"

2. An additive ability-score increase atom

The existing surface has `set_ability_score`, which covers:

- `set`
- `floor`

That is not the same as:

- permanent `+2`
- capped at `30`

Relevant text:

> "your Charisma increases by 2, to a maximum of 30"

This pressures a distinct runtime effect such as `modify_ability_score` or equivalent.

3. A century-scale recharge / dormancy variant

The item does not get destroyed and does not reset on a rest or at dawn. It becomes inert, then regains magic after a century.

Relevant text:

> "The manual then loses its magic but regains it in a century."

Current `RestResetCadence` cannot represent that lifecycle.

**Classification**

`structural_widening`

Reason: the unit's core behavior requires a different authored shape than the current `passive | activation` split for magic items. A new atom is also needed for the permanent additive ability-score increase, but the first blocker is structural: there is no honest family/subgraph for multi-day study-completion items.
