## Surface gap

`Manual of Quickness of Action` fits the existing `magic_item` + `activation` family honestly:

- `activationCost.kind = "study"` for 48 hours within 6 days
- `resource.kind = "use_count"` with one use
- `resetCadence.kind = "elapsed_days"` for the century recharge
- `modify_ability_score` for the permanent Dexterity increase

`pnpm typecheck` passes for the generated JSON.

## Failure

The tracer crashes before emitting a graph on the existing `elapsed_days` shape when the item regains all uses after the cooldown.

Observed generated JSON:

```json
"resetCadence": {
  "days": 36500,
  "kind": "elapsed_days",
  "startsWhen": "resource_spent"
}
```

Observed tracer failure:

```text
TypeError: Cannot read properties of undefined (reading 'kind')
  at describeDiceAmount ...
  at traceResetCadence ...
```

The Dhall source encodes `regain = None ...`, but `dhall-to-json --omit-empty` removes that field, and `traceResetCadence` assumes `elapsed_days.regain` is always present.

## Narrowest honest widening

- `new_variant`: `elapsed_days_full_regain`
  - Justification: the existing `elapsed_days` reset cadence cannot round-trip the common “regains all uses after N days” case through the required Dhall-to-JSON flow without crashing the tracer.
  - Evidence: `"The manual then loses its magic but regains it in a century."`

An equivalent fix would also work if the surface keeps the current variant and instead makes `regain` optional with “missing = refill all” semantics, but under this survey rubric the forced change is best described as a surface-level variant gap rather than a new atom.
