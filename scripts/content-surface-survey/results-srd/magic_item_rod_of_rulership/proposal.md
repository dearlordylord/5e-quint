# Rod of Rulership

## Verdict

`surface_widening`

The unit belongs to the existing `magic_item` + `activation` family, but it cannot be encoded honestly with the current surface.

## Blocking surface gaps

1. `DcSource.fixed_dc`

The save is a literal item DC, not one derived from the wielder.

Evidence:

> Each target must succeed on a DC 15 Wisdom saving throw or have the Charmed condition for 8 hours.

Why this is surface-only:

- `save_gate` already exists.
- `apply_condition "charmed"` already exists.
- timed duration and `target_damaged_by_caster_or_ally` already exist.
- The missing piece is just a new `DcSource` variant for fixed item DCs.

Suggested shape:

```ts
type DcSource =
  | ...
  | { readonly kind: "fixed_dc"; readonly value: number };
```

2. Range on activated non-spell abilities

The activation targets creatures at 120 feet, but `ActivatedAbilityMechanics` has no `range` field. In the current tracer, activated non-spell phases inherit an implicit `{ kind: "self" }` range, which would produce a misleading trace.

Evidence:

> You can take a Magic action to present the rod and command obedience from each creature of your choice that you can see within 120 feet of yourself.

Why this is surface-only:

- `Attachment.target.selection.any_number` already exists for "each creature of your choice".
- The missing information is explicit non-spell range metadata.

Suggested direction:

- add `range: Range` to `ActivatedAbilityMechanics` / shared activated-ability header, parallel to spell mechanics.

## Non-blocking residue

These clauses should not block the primary encoding once the two surface widenings above exist:

- `If harmed by you or your allies ... a target ceases to be Charmed in this way.`
  - already covered by `DurationEndTrigger.target_damaged_by_caster_or_ally`
- `While Charmed in this way, the creature regards you as its trusted leader.`
  - narrative / social-state consequence, DM-adjudicated
- `... or commanded to do something contrary to its nature, a target ceases to be Charmed in this way.`
  - DM-adjudicated break condition; not a current deterministic trigger

## Honest post-widening shape

Once widened, the item should fit as:

- `MagicItemRecord`
- `mechanics.family = "activation"`
- `activationCost = { kind: "action" }`
- `resource = { kind: "use_count", cap = { kind: "fixed", uses: 1 } }`
- `resetCadence = { kind: "dawn", regain: null }`
- one `save_gate` phase
- `attachment = target(any_number)`
- `ability = "wis"`
- `dc = { kind: "fixed_dc", value: 15 }`
- `duration = timed 8 hours` with early end on `target_damaged_by_caster_or_ally`
- `onFail = apply_condition("charmed")`

