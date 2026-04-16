# Proposal: Forcecage surface widenings

## Classification: `surface_widening`

Forcecage fits the `ongoing_effect` spell family structurally:

- Concentration, 1 hour
- Action cast, 100 ft point range
- Area attachment: cube (the cage or box)
- No activation phases, no reaction trigger, no planted anchor

All header fields typecheck. The gap is in `OngoingOperation`, which currently only supports `roll_modifier` and `damage_on_hit`. Forcecage needs two new operation variants.

---

## Widening 1 — `block_travel` operation variant

**v4 atom:** `block_travel` (exists)

**Missing surface shape:** `OngoingOperation` has no variant that exposes `block_travel`.

**Proposed addition to `OngoingOperation`:**

```typescript
export type BlockTravelOperation = {
  readonly kind: "block_travel";
  // What egress is blocked unconditionally within the area.
  readonly scope: "nonmagical" | "ethereal" | "all";
};
```

Forcecage would use two instances (or a combined scope) covering `nonmagical` and `ethereal`.

**SRD evidence:**
> "A creature inside the cage can't leave it by nonmagical means."
> "The cage also extends into the Ethereal Plane, blocking ethereal travel."

---

## Widening 2 — Triggered-save-on-escape-attempt operation variant

**v4 atoms involved:** `save_gate` (exists), `repeat_save` (exists)

**Missing surface shape:** No `OngoingOperation` variant models a save gate that fires when a creature within the ongoing area attempts a specific class of action (magical escape), blocking that action on failure and wasting the triggering effect.

This is distinct from:
- `save_gate` on an `ActivationPhase` (caster-initiated at cast time, not creature-initiated during ongoing effect)
- `repeat_save` as a condition-progression atom (used for "save again each turn to end the condition")

The pattern here is:
1. Creature inside the effect *attempts* teleportation or interplanar travel
2. Attempting that action triggers a save gate (CHA, caster spell save DC)
3. On fail: the attempt is blocked AND the triggering spell or effect is wasted (not just negated — wasted)
4. On success: the creature escapes normally

**Proposed addition to `OngoingOperation`:**

```typescript
export type EscapeAttemptSaveOperation = {
  readonly kind: "escape_attempt_save";
  // What kinds of escape trigger the save. Closed enum, widen as needed.
  readonly triggers: ReadonlyArray<"teleportation" | "interplanar_travel">;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: "block_and_waste_triggering_effect";
  readonly onSuccess: "allow_escape";
};
```

**SRD evidence:**
> "If the creature tries to use teleportation or interplanar travel to leave, it must first make a Charisma saving throw. On a successful save, the creature can use that magic to exit the cage. On a failed save, the creature doesn't exit the cage and wastes the spell or effect."

---

## Secondary omission — Dispel Magic immunity

The SRD states Forcecage cannot be dispelled by Dispel Magic. This is a meta-property with no current surface representation. It is not modeled by any existing atom and is left as a known gap. Single-spell pressure; not promoted to a widening proposal here.

---

## What a clean encoding would look like

Once both widenings land, Forcecage could encode as:

```dhall
{ family = "ongoing_effect"
, level = 7
, school = "evocation"
, castingTime = { kind = "action" }
, range = { kind = "point", feet = 100 }
, components = { v = True, s = True, m = Some "ruby dust worth 1,500+ GP, consumed" }
, duration = { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
, attachment =
    { kind = "area"
    , shape = { kind = "cube", maxSideFeet = 20 }  -- cage variant (larger); box is 10ft
    , origin = { kind = "point_within_range" }
    }
, operation =
    -- Two operations needed; OngoingOperation would need to become a union list,
    -- or a composite operation kind.
    -- OR: a new composite `prison_area` operation family.
    ...
}
```

Note: Forcecage's user-choice between cage (20 ft, barred) and box (10 ft, solid) is also a casting-choice variant not currently modeled on the area attachment shape — but this is secondary to the two operation gaps above.
