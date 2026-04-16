# Surface Widening Proposal: Invisibility

## Outcome

`surface_widening` — the spell nearly fits `ongoing_effect` but two surface shapes are missing. Both required v4 atoms (`apply_condition`, `self_break`) are already in the taxonomy; the gaps are surface-level only.

## Spell summary

> A creature you touch has the Invisible condition until the spell ends. The spell ends early immediately after the target makes an attack roll, deals damage, or casts a spell.
> *Using a Higher-Level Spell Slot:* You can target one additional creature for each spell slot level above 2.

- Level 2, Illusion, Action, Touch, Concentration ≤1 hour
- Provenance: SRD 5.2.1 `Spells/Descriptions-I-N#Invisibility`

## What fits

The spell's outer structure maps cleanly to `ongoing_effect`:

| Header field | Value | Surface fit |
|---|---|---|
| `level` | 2 | `SpellLevel` |
| `school` | `"illusion"` | `SpellSchool` |
| `castingTime` | `{ kind: "action" }` | `CastingTime` |
| `range` | `{ kind: "touch" }` | `Range` |
| `duration` | `concentration, upTo: 1 hour` | `Duration` |
| `attachment` | `target, choose_up_to 1 (+1/slot above 2)` | `Attachment` with `SlotScaling<number>` |

The `attachment` target count would use the same `SlotScaling<number>` pattern as Bless, with `base=1, baseLevel=2, perSlotAboveBase=1`.

## Gap 1: `apply_condition` as an `OngoingOperation` variant

**Missing:** The `OngoingOperation` union currently only has:
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can express "apply a condition to the attached target". The core effect of Invisibility — granting the Invisible condition — requires a new variant:

```typescript
export type ApplyConditionOperation = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ApplyConditionOperation;   // new
```

This also requires widening `Condition`:

```typescript
// Current:
export type Condition = "prone";

// Proposed:
export type Condition = "prone" | "invisible";
```

The `apply_condition` atom exists in v4 (Effect Atoms, §9). No new taxonomy atom is needed — only the surface shape is missing.

## Gap 2: Self-break trigger (concentration ends on subject action)

**Missing:** "The spell ends early immediately after the target makes an attack roll, deals damage, or casts a spell."

This is a `self_break` lifecycle atom (v4 §6), conditional on the spell's *subject* (not the caster) performing specific actions. There is currently no surface type that expresses an early-termination condition on a duration.

The `Duration` type has no field for this. A new closed type is needed:

```typescript
export type SelfBreakEvent =
  | { readonly kind: "subject_makes_attack_roll" }
  | { readonly kind: "subject_deals_damage" }
  | { readonly kind: "subject_casts_spell" }
  | { readonly kind: "any_of"; readonly events: ReadonlyArray<SelfBreakEvent> };

// Attach to Duration.concentration (or as a sibling field on OngoingEffectMechanics):
export type Duration =
  | { readonly kind: "instantaneous" }
  | {
      readonly kind: "concentration";
      readonly upTo: DurationValue;
      readonly selfBreakOn?: SelfBreakEvent;   // new, optional
    }
  | { readonly kind: "timed"; readonly value: DurationValue };
```

The self-break for Invisibility would be:
```typescript
selfBreakOn: {
  kind: "any_of",
  events: [
    { kind: "subject_makes_attack_roll" },
    { kind: "subject_deals_damage" },
    { kind: "subject_casts_spell" }
  ]
}
```

The `self_break` atom already exists in v4 (Lifecycle Atoms, §6). No new taxonomy atom is needed.

## Tracer impact

Adding `ApplyConditionOperation` would need:
- A new `case "apply_condition":` branch in `traceOngoingOperation()` in `tracer.ts`, emitting an `apply_condition` effect node.

Adding `selfBreakOn` to `Duration.concentration` would need:
- A new branch in `traceDuration()` emitting a `self_break` lifecycle node connected with a `persists_until` or `breaks` relation to the attached creature.

Both are localized, non-breaking additions.

## Proposed Dhall shape (for when the surface is widened)

```dhall
let invisibility =
  { kind = "spell"
  , id = "invisibility"
  , name = "Invisibility"
  , provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-I-N#Invisibility" }
  , description = "A creature you touch has the Invisible condition until the spell ends. The spell ends early immediately after the target makes an attack roll, deals damage, or casts a spell. Using a Higher-Level Spell Slot: You can target one additional creature for each spell slot level above 2."
  , mechanics =
    { family = "ongoing_effect"
    , level = 2
    , school = "illusion"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = Some "an eyelash in gum arabic" }
    , duration =
      { kind = "concentration"
      , upTo = { unit = "hour", amount = 1 }
      , selfBreakOn =
          { kind = "any_of"
          , events =
            [ { kind = "subject_makes_attack_roll" }
            , { kind = "subject_deals_damage" }
            , { kind = "subject_casts_spell" }
            ]
          }
      }
    , attachment =
      { kind = "target"
      , selection =
        { mode = "choose_up_to"
        , count = { kind = "linear", base = 1, perSlotAboveBase = 1, baseLevel = 2 }
        }
      }
    , operation = { kind = "apply_condition", condition = "invisible" }
    }
  }
in invisibility
```

## Classification rationale

- `surface_widening` not `atom_widening`: both `apply_condition` and `self_break` exist in v4 taxonomy §9 and §6 respectively.
- `surface_widening` not `structural_widening`: the spell fits the `ongoing_effect` family structure; only operation and duration variants are missing.
- No `dm_agenda`: applying a condition and tracking a self-break trigger are deterministic mechanical events, not DM adjudication.
