## Tome of Understanding

The item's mechanics fit the existing surface honestly:

- `MagicItemRecord`
- `mechanics.family = "activation"`
- `activationCost.kind = "study"` with `hours = 48`, `withinDays = 6`
- `resource.kind = "use_count"` with one use
- `resetCadence.kind = "elapsed_days"` with a century lockout
- `modify_ability_score` for `wis +2`, `maximum = 30`

The blocker is not a missing atom or missing family. It is a protocol/tooling mismatch:

- The `elapsed_days` reset shape in `src/surface/types.ts` requires `regain: null | DiceAmount`.
- The tracer in `src/interpreter/tracer.ts` treats `c.regain === null` as the "refill all" branch.
- Dhall-to-JSON compilation omits `None` optionals instead of emitting an explicit JSON `null`, so the generated JSON lacks `mechanics.resetCadence.regain`.
- The tracer then crashes when it calls `describeDiceAmount(c.regain)` on `undefined`.

Observed tracer failure:

```text
TypeError: Cannot read properties of undefined (reading 'kind')
    at describeDiceAmount (...)
    at traceResetCadence (...)
```

This means the unit cannot be completed within the current worker protocol without doing one of the forbidden things:

- hand-editing `content/magic_item_tome_of_understanding.json` to insert `"regain": null`, or
- patching the surface/tracer/tooling.

Relevant rules text:

> If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines, your Wisdom increases by 2, to a maximum of 30. The manual then loses its magic, but regains it in a century.
