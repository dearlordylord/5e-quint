# Proposal: Rod of Rulership — surface_widening

## What fits

The item encodes as `ActivatedAbilityMechanics` with:
- `condition: { kind: "holding_item" }` — "present the rod"
- `activationCost: { kind: "standard_action", action: "magic" }`
- `resource: use_count cap=1, resetCadence: dawn`
- `duration: { kind: "timed", value: 8 hours, earlyEnd: [target_damaged_by_caster_or_ally] }`
- Single `save_gate` phase: WIS DC 15, `any_number` targets, `onFail: apply_condition charmed`

Typecheck passes. Tracer runs cleanly.

## Missing: range on ActivatedAbilityMechanics

**SRD text:** "each creature of your choice that you can see within 120 feet of yourself"

`ActivatedAbilityMechanics` has no `range` field. Only spell mechanics headers and `TriggeredReactionAbilityMechanics` / `MagicItemSpawnedCreatureMechanics` carry an explicit range. The tracer renders the target attachment as `range Self`, silently misrepresenting the item's actual range.

**Proposed widening:** Add an optional `range?: Range` field to `ActivatedAbilityMechanics`. This parallels the existing pattern on `TriggeredReactionAbilityMechanics` and `MagicItemSpawnedCreatureMechanics`. The tracer's `traceAttachment` already accepts a `Range` argument — the only change needed is threading it from the activation header.

## Omitted: "commanded contrary to its nature" early-end

**SRD text:** "commanded to do something contrary to its nature, a target ceases to be Charmed"

This is DM agenda — there is no deterministic mechanical trigger for "contrary to its nature." No atom or `DurationEndTrigger` variant can represent this faithfully. Legitimately omitted.

## Minor tracer gap (informational)

`ActivatedAbilityMechanics.duration` typechecks but the tracer does not emit `persist`/`expire` lifecycle nodes for it (unlike `TriggeredReactionAbilityMechanics` which does call `traceDuration`). The duration is present in the authored JSON but invisible in the trace graph. Not a blocking issue for this unit — noted for tracer completeness.
