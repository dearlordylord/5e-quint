# Proposal: Confusion — surface gaps

**Unit:** Confusion (spell, level 4 enchantment)
**Outcome:** `atom_widening`

## What fits

The spell is structurally an `ongoing_effect` with a concentration/1-minute duration, a 10-ft sphere area attachment, an initial Wisdom save gate, and a repeat-save-to-end pattern (`cadence: "end_of_target_turn"`, `onSuccess: "ends_on_target"`). All of those surface shapes exist and would encode cleanly.

## Blocking gap 1 — `random_table` as an `OngoingEffect` variant (surface_widening)

**RAW:** "must roll 1d10 at the start of each of its turns to determine its behavior for that turn"

The behavior table is a `random_table` resolution that fires once per affected creature's turn (`on_attached_turn_start` trigger). The `random_table` phase type already exists in `ActivationPhase` and has exactly the right shape (die, modifier, outcome rows with min/max/label/phases). However, `OngoingEffect` does not include a `random_table` variant — the union only allows `EffectAtom | save_gate | ability_check_gate | attack_roll | ModifyAcSetFloorEffect`.

**Proposed widening:** Add `random_table` to the `OngoingEffect` union, reusing the existing `RandomTableRoll` and `ReadonlyNonEmptyArray<RandomTableOutcome>` types from `ActivationPhase`. The tracer's `traceOngoingOpEffect` switch would need a matching case emitting a `random_table` resolution node with `branches_on_roll` edges for each outcome row.

The four Confusion outcomes each map to a `RandomTableOutcome` with nested behavior:
- 1: move all movement in random direction, no action → `force_move` + `apply_condition`-adjacent (no action taken — see gap 2 below for this part)
- 2–6: no move, no action → `set_speed { feet: 0 }` + no action (gap 2)
- 7–8: no move, Attack action vs random creature in reach → `attack_roll` on a randomized target (DM-agenda component)
- 9–10: normal behavior → `{ kind: "none" }`

Outcome rows 7–8 ("attacks a random creature within reach") also have a DM-agenda component (random target selection), but the attack-roll structure itself is expressible.

## Blocking gap 2 — no atom for "can't take Bonus Actions or Reactions" (atom_widening)

**RAW:** "that target can't take Bonus Actions or Reactions"

This is a flat suppression of specific action-economy types for the duration of the effect. No existing `EffectAtom` covers it:
- `apply_condition` — none of the 15 SRD conditions express "no Bonus Action + no Reaction" without also removing the Action. `Incapacitated` removes both the Action and Bonus Action; it does not remove Reactions but does remove the Action (wrong shape).
- `grant_extra_action` with `ActionRestriction` — that models a restriction on a *granted* extra action, not a suppression on the creature's existing action economy.

**Proposed widening:** A new `EffectAtom` variant:

```typescript
{
  readonly kind: "restrict_action_economy";
  readonly suppress: ReadonlyNonEmptyArray<"action" | "bonus_action" | "reaction">;
}
```

This would let Confusion express `suppress: ["bonus_action", "reaction"]` and future units express any subset. The tracer would emit a new `restrict_action_economy` effect node.

## Secondary gap — sphere radius slot-scaling (surface_widening, lower priority)

**RAW:** "The Sphere's radius increases by 5 feet for each spell slot level above 4."

`AreaShapeDescriptor.sphere.radiusFeet` is a bare `number`. There is no slot-scaling variant for area shape dimensions (unlike `TargetSelection.count`, which has a `SlotScaling<number>` form). A `SlotScaling<number>` on `radiusFeet` (or a top-level `areaScaling` field on the ongoing_effect mechanics header) would be needed to express the upcast. This is a secondary gap — the base-level spell still cannot be encoded due to gaps 1 and 2.

## Summary

| Gap | Kind | Blocking |
|-----|------|---------|
| `random_table` in `OngoingEffect` union | surface_widening | Yes |
| `restrict_action_economy` atom | atom_widening | Yes |
| `AreaShapeDescriptor` slot-scaling | surface_widening | Secondary |
