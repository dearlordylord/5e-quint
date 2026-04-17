`Tome of Clear Thought` does not fit the current surface honestly.

Why it fails:

- The current `set_ability_score` atom only supports setting or flooring an ability score to a fixed value. The tome does neither; it increases Intelligence by `+2`, and the increase is capped at `30`.
- The current activation grammar assumes a discrete activation cost (`action`, `bonus_action`, `reaction`, `free`, `replace_attack`). The tome resolves through extended study: `48 hours over a period of 6 days or fewer`.
- The current reset / lifecycle grammar has `never` and `dawn`, but not the tome's `regains it in a century` recharge cadence.

Closest honest shape:

- Existing top-level kind: `magic_item`
- Closest family: `activation`

Required widenings:

1. New atom: `modify_ability_score`
   - Why: the item permanently raises Intelligence by a delta, rather than setting it to a floor or exact value.
   - Needed payload shape: ability, delta, optional maximum cap.
   - Evidence: "your Intelligence increases by 2, to a maximum of 30"

2. New activation-cost / study variant under the existing activation family
   - Why: the item is used by prolonged study, not by an action or reaction.
   - Likely shape: a long-form study / downtime activation with required total hours and completion window.
   - Evidence: "If you spend 48 hours over a period of 6 days or fewer studying the book's contents"

3. New reset cadence variant
   - Why: the item is not destroyed and does recharge, but on a century timescale.
   - Evidence: "The manual then loses its magic but regains it in a century."

Why this is not `structural_widening`:

- `magic_item` already exists.
- `activation` is still the right family; it just lacks the needed activation-time and effect variants.

Why this is not `dm_agenda`:

- The core effect is deterministic: after the study requirement is completed, Intelligence increases by 2, capped at 30, and the item expends its magic until its recharge window.
