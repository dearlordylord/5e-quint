# Proposal: surface_widening — Beacon of Hope

## Unit

- **Slug:** `beacon_of_hope`
- **Kind:** spell / `ongoing_effect`
- **Source:** SRD 5.2.1, Spells/Descriptions-A-D#Beacon of Hope

## Summary

Beacon of Hope fits the `ongoing_effect` family cleanly: it is a concentration spell that attaches persistent modifiers to a set of targets for up to 1 minute. The family, header fields (level, school, casting time, range, components, duration), and attachment structure are all representable with existing atoms. Three surface shapes are missing.

## Missing Shape 1 — `TargetSelection` mode `"any_number"`

### Rule text

> "Choose any number of creatures within range."

### Current surface

```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: SlotScaling<number> };
```

### Gap

There is no mode for an uncapped, open-ended creature selection. `choose_up_to` requires a `SlotScaling<number>` count with a concrete `base` — no honest base value exists for "any number." Using `base: 999` or similar would be a false encoding.

### Proposed addition

```typescript
| { readonly mode: "any_number" }
```

No count field needed; the selection is unbounded by rule.

---

## Missing Shape 2 — `OngoingOperation` variant for roll-advantage

### Rule text

> "each target has Advantage on Wisdom saving throws and Death Saving Throws"

### Current surface

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

`RollModifierOperation` carries a `DiceDelta` (numeric addend like +1d4 from Bless). There is no variant for granting advantage on a roll kind.

### v4 atom

`modify_roll_advantage` already exists in the v4 atom inventory and is used by mastery `ModifyRollAdvantageRider`. It is not reachable from `OngoingOperation`.

### Proposed addition

```typescript
export type RollAdvantageOperation = {
  readonly kind: "roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | RollAdvantageOperation;
```

`RollKind` already includes `"saving_throw"`, which covers both Wisdom saves and Death Saving Throws (Death Saving Throws are a special Wisdom saving throw in SRD 5.2.1).

---

## Missing Shape 3 — `OngoingOperation` variant for maximize healing received

### Rule text

> "regains the maximum number of Hit Points possible from any healing"

### Current surface

No existing `OngoingOperation` variant represents this. `roll_modifier` adds a numeric bonus; `damage_on_hit` adds a damage rider. Neither models "substitute each healing die result with its maximum value."

### v4 atom

`modify_roll_substitute` exists in the v4 atom inventory (noted as a distinct modifier operation). The "maximize healing" mechanic is precisely a roll substitution: treat each healing die as its maximum face value.

### Proposed addition

```typescript
export type MaximizeHealingOperation = {
  readonly kind: "maximize_healing_received";
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | RollAdvantageOperation       // from shape 2
  | MaximizeHealingOperation;
```

Alternatively, if the surface wants a more general "roll_substitute" operation:

```typescript
export type RollSubstituteOperation = {
  readonly kind: "roll_substitute";
  readonly on: "healing_received";
  readonly substitute: "maximum";
};
```

Both map to the v4 `modify_roll_substitute` atom. The narrower `maximize_healing_received` form is simpler and sufficient for all current pressure cases.

---

## No dhall/json/trace produced

The unit cannot be encoded without lying about at least one of the three mechanics above. Per the encoding protocol, no `content/beacon_of_hope.dhall`, `.json`, or `.trace.md` files are produced.

## Encoding sketch (blocked on the three widenings)

```dhall
-- Would be valid after the three surface additions above:
{ kind = "spell"
, id = "beacon_of_hope"
, name = "Beacon of Hope"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-A-D#Beacon of Hope" }
, description = "Choose any number of creatures within range. For the duration, each target has Advantage on Wisdom saving throws and Death Saving Throws and regains the maximum number of Hit Points possible from any healing."
, mechanics =
    { family = "ongoing_effect"
    , level = 3
    , school = "abjuration"
    , castingTime = { kind = "action" }
    , range = { kind = "point", feet = 30 }
    , components = { v = True, s = True, m = False }
    , duration = { kind = "concentration", upTo = { unit = "minute", amount = 1 } }
    , attachment =
        { kind = "target"
        , selection = { mode = "any_number" }           -- MISSING
        }
    -- Two operations would be needed (multi-operation ongoing_effect not yet modeled either)
    -- or a single composite operation type:
    , operations =
        [ { kind = "roll_advantage", mode = "advantage", on = [ "saving_throw" ] }  -- MISSING
        , { kind = "maximize_healing_received" }                                     -- MISSING
        ]
    }
}
```

Note: the above also reveals that `ongoing_effect` currently supports a single `operation` field. Beacon of Hope has two distinct ongoing effects (advantage + healing maximization). A follow-on widening may be needed to support a `ReadonlyArray<OngoingOperation>` rather than a single operation — this is a secondary gap worth flagging for the next round.
