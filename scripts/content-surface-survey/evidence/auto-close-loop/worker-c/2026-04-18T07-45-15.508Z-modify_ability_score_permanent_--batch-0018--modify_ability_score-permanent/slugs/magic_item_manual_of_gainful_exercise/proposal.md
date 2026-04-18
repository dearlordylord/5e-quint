`Manual of Gainful Exercise` fits the existing `magic_item` + `activation` family honestly:

- `activationCost = { kind = "study", hours = 48, withinDays = 6 }`
- `resource = { kind = "use_count", cap = { kind = "fixed", uses = 1 } }`
- `resetCadence = { kind = "elapsed_days", days = 36500, startsWhen = "resource_spent" }`
- direct self effect: `modify_ability_score { ability = "str", delta = +2, maximum = 30 }`

The authored Dhall compiles and `pnpm typecheck` passes. The blocker is the tracer/runtime artifact boundary for `elapsed_days`.

## Gap

`RestResetCadence.elapsed_days` models `regain` as `null | DiceAmount`, where `null` means "regain all". But the required Dhall compilation step uses `dhall-to-json --omit-empty`, so `regain = None` is omitted from JSON entirely.

`src/interpreter/tracer.ts` does not handle that omission. In `traceResetCadence`, the `elapsed_days` branch treats any non-`null` `regain` as a concrete `DiceAmount` and calls `describeDiceAmount(c.regain)`. When `regain` is omitted, `c.regain` is `undefined`, and the tracer crashes.

## Evidence

Unit text:

> "The manual then loses its magic but regains it in a century."

Tracer failure:

```text
TypeError: Cannot read properties of undefined (reading 'kind')
    at describeDiceAmount (...)
    at traceResetCadence (...)
```

## Proposed widening

This is a `surface_widening`, not an `atom_widening`:

- the unit already fits an existing top-level kind and mechanics family;
- all needed mechanics already exist in the surface (`study`, `modify_ability_score`, `elapsed_days`);
- no new v4 atom is forced by the item text.

The honest fix is to make the surface/runtime encoding of "regain all after N days" explicit and stable across Dhall -> JSON -> tracer. Two viable directions:

1. Add an explicit `regain_all` variant under `RestResetCadence.elapsed_days`, instead of overloading `null`.
2. Keep the current type, but make the tracer treat missing `regain` the same as `null`.

Until that mismatch is fixed, this item cannot produce a valid trace despite fitting the current family honestly.
