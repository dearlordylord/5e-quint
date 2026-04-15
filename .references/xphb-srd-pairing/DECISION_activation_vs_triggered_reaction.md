# Decision: Keep `activation` And `triggered_reaction` Separate

Decision:

- keep `activation` and `triggered_reaction` as separate top-level payload families in the current closed-surface draft.

Status:

- current working decision
- evidence-backed by the current corpus stress tests
- revisit only if later enrichment shows a compelling simpler representation without semantic loss

Primary inputs:

- [`CANDIDATE_closed_extension_surface_v1.md`](./CANDIDATE_closed_extension_surface_v1.md)
- [`STRESS_TEST_closed_extension_surface_v1_spells.md`](./STRESS_TEST_closed_extension_surface_v1_spells.md)
- [`STRESS_TEST_closed_extension_surface_v1_items_classes.md`](./STRESS_TEST_closed_extension_surface_v1_items_classes.md)

## Why

The corpus keeps forcing a distinction between:

- self-initiated use chosen by the acting creature;
- externally-triggered availability windows that exist because a trigger occurred.

Representative `activation` examples:

- `Fighter > Action Surge`
- `Cleric > Channel Divinity > Divine Spark`
- ordinary action-cast and bonus-action-cast spells

Representative `triggered_reaction` examples:

- `Shield`
- `Counterspell`
- touch-delivery reaction from `Find Familiar`

These are not just different timing labels.

They differ in:

- who owns the decision point;
- when availability appears;
- what trigger data must be present;
- whether the effect can exist without a trigger context.

## Why Not Collapse Them

If they collapse too early:

- trigger-conditioned legality gets flattened into generic timing metadata;
- reaction windows start looking like ordinary user-selected activations;
- rules such as `Opportunity Attack`, `Shield`, and `Counterspell` lose their explicit interrupt shape;
- timing rewrites like `Nick` get harder to model cleanly because they rewrite one kind of window into another.

## What This Does Not Mean

Keeping them separate does **not** mean they are unrelated.

They can still share:

- timing envelope fields;
- resource and reset envelopes;
- operation vocabulary;
- consumer-side runtime machinery where that machinery is truly shared.

The decision is only that they should remain separate authored payload families at the closed-surface boundary.

## Consequence For Planning

Implementation planning should currently assume:

- `activation` remains the family for ordinary chosen uses, including action/bonus-action activations;
- `triggered_reaction` remains the family for interrupt- or trigger-window responses;
- rewrites such as `Nick` can translate or consume those windows without erasing the authored distinction between them.
