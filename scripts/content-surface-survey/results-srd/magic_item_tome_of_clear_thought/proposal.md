`Tome of Clear Thought` does not fit the current surface honestly.

Why it fails:

- The core effect is not `set_ability_score`. The item says: "your Intelligence increases by 2, to a maximum of 30." Existing `EffectAtom.set_ability_score` only models absolute assignment / floor semantics (`set` or `floor` to a fixed value).
- The item has a study-completion gate: "If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines..." Current `MagicItemMechanics.activation` has only immediate activation costs (`free`, `action`, `bonus_action`, `reaction`, `replace_attack`), not a bounded multi-day study/use process.
- The item has a very long recharge lifecycle: "The manual then loses its magic but regains it in a century." Current `RestResetCadence` can express rests, dawn, or never, but not a fixed long-duration recharge.

Narrowest honest classification:

- `atom_widening`

Required widenings:

1. `new_atom`: `modify_ability_score`
   - Justification: the item changes an existing score by a delta rather than setting it to a fixed floor/value.
   - Minimal honest shape would look like additive score change plus cap, e.g. `ability`, `delta`, `maximum`.
   - Evidence: "your Intelligence increases by 2, to a maximum of 30"

2. `new_variant`: study/downtime activation gating
   - Justification: the item is not consumed with an action/reaction or passive wear-state; it completes after accumulating study time within a deadline window.
   - Evidence: "If you spend 48 hours over a period of 6 days or fewer studying the book's contents..."

3. `new_variant`: long-duration item recharge cadence
   - Justification: the item becomes inert after use, then naturally recharges after a fixed century-long interval.
   - Evidence: "The manual then loses its magic but regains it in a century."

Why no placeholder content file was authored:

- Encoding this as `set_ability_score int = 30 (floor)` would be false.
- Encoding it as an immediate `activation` with `resetCadence = never` would erase both the study gate and the century recharge.
- A misleading trace would be worse than no trace for this survey.
