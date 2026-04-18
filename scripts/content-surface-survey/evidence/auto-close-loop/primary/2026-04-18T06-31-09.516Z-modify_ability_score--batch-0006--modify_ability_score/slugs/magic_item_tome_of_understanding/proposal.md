## Tome of Understanding

The unit fits the existing `magic_item` + `activation` family honestly:

- `activationCost.study` captures "48 hours over a period of 6 days or fewer"
- `resource.use_count` captures the one magical use
- `resetCadence.elapsed_days` captures "regains it in a century"
- `modify_ability_score` captures "your Wisdom increases by 2, to a maximum of 30"

The failure is in the authored-surface round trip, not in the unit model.

### Gap

`RestResetCadence.elapsed_days.regain` is typed as `null | DiceAmount`, but the worker flow uses `dhall-to-json --omit-empty`. Authoring `None` for `regain` compiles to a JSON object with the `regain` field omitted entirely, not `null`.

The tracer branch for `elapsed_days` assumes:

- `c.regain === null` means "refill all"
- otherwise `c.regain` is a `DiceAmount`

When the field is omitted, `c.regain` is `undefined`, so the tracer falls into the `describeDiceAmount(c.regain)` branch and crashes with:

> TypeError: Cannot read properties of undefined (reading 'kind')

### Why this is a surface widening

This does not force a new v4 atom or a new top-level mechanics family. The unit already fits the existing surface vocabulary.

What is missing is a stable surface/tracer representation for the existing `elapsed_days` variant when `regain` is absent / full refill.

### Evidence

> "The manual then loses its magic, but regains it in a century."

That is exactly the existing `elapsed_days` concept with a full refill after a fixed number of days.
