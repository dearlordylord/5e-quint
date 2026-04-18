## Tome of Understanding

`Tome of Understanding` fits the existing `magic_item` + `activation`
family honestly:

- `activationCost = study` for 48 hours within 6 days
- `resource = use_count(1)`
- `resetCadence = elapsed_days`
- `modify_ability_score` for `wis +2`, max 30

The failure is in the authored-surface round trip for
`RestResetCadence.elapsed_days`.

### What broke

The TS surface requires:

- `elapsed_days.regain: null | DiceAmount`

For this item, RAW is full recharge after a century, so the honest value
is `null`:

- the book loses its magic after use
- then regains it in a century

But the Dhall worker path uses `dhall-to-json --omit-empty`. Encoding
`regain` as `None ...` omits the field entirely in JSON instead of
emitting `"regain": null`. The generated JSON therefore lacks the
required `regain` key, and the tracer crashes in `traceResetCadence`
when it calls `describeDiceAmount(c.regain)` on `undefined`.

### Why this is a surface widening

No new atom is needed. The v4 atoms already cover the rule:

- `use_count`
- `duration_window`
- `modify_ability_score`

The gap is that the existing authored surface cannot express the
"elapsed cooldown with full refill" branch in a way that survives the
Dhall-to-JSON pipeline honestly.

### Honest widening target

One of these needs to change:

1. Make `RestResetCadence.elapsed_days.regain` optional-with-default-full
   instead of required-nullable.
2. Add an explicit existing-family variant for full refill after elapsed
   days, so authors do not need JSON `null`.
3. Change the worker/tooling so Dhall can emit `"regain": null` without
   hand-editing JSON.

### Evidence

> "The manual then loses its magic, but regains it in a century."

