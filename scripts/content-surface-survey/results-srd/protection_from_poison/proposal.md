# Proposal: Surface Widenings for Protection from Poison

## Unit

- **Slug**: `protection_from_poison`
- **Kind**: spell (Level 2 Abjuration)
- **Outcome**: `surface_widening`

## Spell Text

> "You touch a creature and end the Poisoned condition on it. For the duration, the target has Advantage on saving throws to avoid or end the Poisoned condition, and it has Resistance to Poison damage."

- Casting Time: Action
- Range: Touch
- Components: V, S
- Duration: 1 hour (timed, non-concentration)

## Why It Doesn't Fit

The spell is structurally closest to `ongoing_effect` (timed, single target, no concentration), but three gaps in `OngoingOperation` and one structural gap prevent honest encoding.

### Gap 1: Missing `grant_resistance` OngoingOperation variant

`OngoingOperation` is currently:
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can express "grant resistance to a damage type for the duration." The v4 atom `grant_resistance` exists but has no surface carrier in `OngoingOperation`.

**Proposed addition:**
```typescript
export type GrantResistanceOperation = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantResistanceOperation;
```

### Gap 2: Missing `modify_roll_advantage` OngoingOperation variant

`RollModifierOperation` adds a numeric `DiceDelta` to rolls. It cannot express advantage/disadvantage. The v4 atom `modify_roll_advantage` exists but has no surface carrier in `OngoingOperation`.

**Proposed addition:**
```typescript
export type ModifyRollAdvantageOperation = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantResistanceOperation
  | ModifyRollAdvantageOperation;
```

Note: The spell scopes advantage specifically to saves "to avoid or end the Poisoned condition." The `RollKind` vocabulary (`"saving_throw"`) doesn't distinguish by condition. For now, `on: ["saving_throw"]` would be a slight over-approximation (advantage on all saves, not just Poisoned-related). A condition-scoped filter could be added later if pressure builds.

### Gap 3: Single-operation constraint

`OngoingEffectMechanics` currently:
```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operation: OngoingOperation;   // ← singular
};
```

This spell needs two simultaneous ongoing operations (advantage on saves AND resistance). The minimal fix is:
```typescript
  readonly operations: ReadonlyArray<OngoingOperation>;
```

This is a breaking rename of the field. All existing `ongoing_effect` units encoded with `operation` would need migration. Alternatively a new optional `additionalOperations` field could preserve back-compat, but per the project's no-backwards-compat policy, a clean rename is preferred.

### Gap 4: Instantaneous cast-time effect (secondary omission)

The spell immediately ends the Poisoned condition at cast — before the timed effect begins. No existing family represents "instantaneous effect at cast + ongoing for duration." 

The narrowest fix is an optional field on `OngoingEffectMechanics`:
```typescript
export type CastTimeEffect =
  | { readonly kind: "remove_condition"; readonly condition: Condition }
  // widen as pressure builds
  ;

export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operations: ReadonlyArray<OngoingOperation>;
  readonly castEffect?: CastTimeEffect;   // fires once at cast, before ongoing begins
};
```

`Condition` would need `"poisoned"` added — currently only `"prone"` is modeled.

Alternatively, a hybrid family (`instant_plus_ongoing`) could be introduced, but the single optional field is cheaper.

## Proposed Target Shape (after widening)

```dhall
let protectionFromPoison =
      { kind = "spell"
      , id = "protection_from_poison"
      , name = "Protection from Poison"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-N-R#Protection from Poison"
          }
      , description =
          "You touch a creature and end the Poisoned condition on it. For the duration, the target has Advantage on saving throws to avoid or end the Poisoned condition, and it has Resistance to Poison damage."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "target"
              , selection = { mode = "one" }
              }
          , castEffect =
              { kind = "remove_condition"
              , condition = "poisoned"
              }
          , operations =
              [ { kind = "modify_roll_advantage"
                , mode = "advantage"
                , on = [ "saving_throw" ]
                }
              , { kind = "grant_resistance"
                , damageType = "poison"
                }
              ]
          }
      }

in  protectionFromPoison
```

## Summary of Required Changes to `src/surface/types.ts`

| Change | Kind | Scope |
|---|---|---|
| Add `GrantResistanceOperation` to `OngoingOperation` | new_variant | surface |
| Add `ModifyRollAdvantageOperation` to `OngoingOperation` | new_variant | surface |
| Rename `operation` → `operations: ReadonlyArray<OngoingOperation>` in `OngoingEffectMechanics` | new_variant | surface |
| Add `castEffect?: CastTimeEffect` to `OngoingEffectMechanics` | new_variant | surface |
| Add `"poisoned"` to `Condition` | new_variant | surface |

All changes are variants or field additions on existing surface shapes. No new top-level family or record kind is required.
