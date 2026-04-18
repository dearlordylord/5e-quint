# Proposal: Confusion widening gaps

## Unit

**Confusion** — Level 4 Enchantment spell (SRD 5.2.1)

## Family fit

The spell fits `ongoing_effect` structurally:
- Area attachment (sphere, 10-ft radius, origin point within 90 ft)
- `save_gate` initial phase (Wis save), per creature in area
- `repeatSave` with `cadence: "end_of_target_turn"`, `onSuccess: "ends_on_target"`
- Concentration, up to 1 minute

All scaffolding exists. The blockers are in the `onFail` effect and the ongoing per-turn operation.

---

## Gap 1 — `random_table` missing from `OngoingEffect` (primary blocker)

**SRD text**: "must roll 1d10 at the start of each of its turns to determine its behavior for that turn"

The 1d10 behavior roll is the central mechanic. It fires on `on_attached_turn_start` and dispatches to one of four outcome branches. This requires `random_table` as a valid `OngoingEffect` variant.

Currently `OngoingEffect` is:
```typescript
export type OngoingEffect =
  | EffectAtom
  | { kind: "save_gate"; ... }
  | { kind: "ability_check_gate"; ... }
  | { kind: "attack_roll"; ... }
  | ModifyAcSetFloorEffect;
```

`random_table` exists in `ActivationPhase` but not here. The proposed addition:

```typescript
| {
    readonly kind: "random_table";
    readonly roll: RandomTableRoll;
    readonly outcomes: ReadonlyNonEmptyArray<RandomTableOutcome>;
  }
```

`RandomTableRoll` and `RandomTableOutcome` already exist in the spell types. `RandomTableOutcome.phases` would need to allow `EffectAtom[]` as well as nested `ActivationPhase[]` — or `OngoingEffect[]` — for the sub-effects within each outcome branch.

---

## Gap 2 — No atom to deny Bonus Actions and Reactions from target

**SRD text**: "that target can't take Bonus Actions or Reactions"

The initial save failure denies two action-economy slots from the affected creature for the duration. The existing `ActionRestriction` type only appears as a field on `grant_extra_action` (scoping what kind of extra action is granted), not as a standalone effect on the target's own economy.

Proposed new `EffectAtom` variant:

```typescript
| {
    readonly kind: "deny_action_types";
    readonly deny: ReadonlyNonEmptyArray<"bonus_action" | "reaction">;
  }
```

This is distinct from `apply_condition` (no SRD condition maps to this exactly) and from `grant_extra_action.restriction` (different direction — this removes existing slots, not restricts a new grant).

---

## Gap 3 — No atom for random-direction movement (behavior outcome 1)

**SRD text**: "it uses all its movement to move. Roll 1d4 for the direction: 1, north; 2, east; 3, south; or 4, west."

`force_move` has a closed `direction` enum (`"push" | "pull" | "slide"`) — all caster-relative directions, not compass directions or nondeterministic directions. Behavior 1 requires moving the full movement allowance in a randomly-chosen cardinal direction.

This could be expressed as a nested `random_table` (1d4, four compass-direction branches), but only once Gap 1 is resolved and random_table is available in OngoingEffect. The direction vocabulary (cardinal compass points) is not currently representable in any movement atom.

---

## Gap 4 — No atom for forced attack against random creature in reach

**SRD text**: "it takes the Attack action to make one melee attack against a random creature within reach. If none are within reach, the target takes no action."

Behavior outcome 7-8 forces the affected creature to make a melee attack, with the target selected randomly from all creatures within reach. No existing atom supports this:
- `attack_roll` in `ActivationPhase`/`OngoingEffect` always has a determined `attachment` — there is no "random creature within reach" target selection mode.
- `TargetSelection` has `one`, `choose_up_to`, and `any_number` modes, none of which express random selection.

Proposed: a new `TargetSelection` mode or a new `EffectAtom` variant that expresses "make an attack against a randomly-selected creature matching a filter (within reach)."

---

## Gap 5 — No slot-scaled area radius

**SRD text**: "The Sphere's radius increases by 5 feet for each spell slot level above 4."

`AreaShapeDescriptor` carries `radiusFeet: number` — a fixed value. The slot-scaling surface (`DiceAmount`, `SlotScaling<T>`) handles dice counts and target counts, but not area dimensions.

Proposed: widen `AreaShapeDescriptor.radiusFeet` (and equivalent dimension fields on other shapes) to accept a slot-scaling variant:

```typescript
radiusFeet: number | { kind: "slot_scaled"; base: number; perSlotAbove: number; baseSlot: number }
```

This is a lower-priority gap (the spell can't be encoded anyway due to Gap 1), but it will recur for any area spell with radius upcast.

---

## Summary

| Gap | Kind | Priority |
|-----|------|----------|
| `random_table` in `OngoingEffect` | `new_variant` | Blocking |
| Deny bonus action / reaction from target | `new_atom` | Blocking |
| Random-direction forced movement | `new_atom` | Needed for full fidelity |
| Forced attack on random target in reach | `new_atom` | Needed for full fidelity |
| Slot-scaled area radius | `new_variant` | Recurring pattern |

The `random_table`-in-`OngoingEffect` widening is the most impactful: Confusion, Wand of Wonder, and any future per-turn nondeterministic dispatch spells all hit this gap.
