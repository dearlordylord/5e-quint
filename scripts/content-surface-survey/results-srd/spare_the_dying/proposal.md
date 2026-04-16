# Proposal: Surface Widenings for Spare the Dying

## Unit

- **Name:** Spare the Dying
- **Kind:** spell (cantrip, Necromancy)
- **Source:** srd-5.2.1

## Why it doesn't fit

Spare the Dying is an `activation`-family spell (instantaneous, one-shot effect). Its mechanics are:

1. Cast Action → target one creature within 15 ft that has 0 HP and is not dead
2. The creature becomes **Stable** — no attack roll, no saving throw, no resolution mechanic

The surface `ActivationMechanics` requires `phases: ReadonlyArray<ActivationPhase>`, and `ActivationPhase` is:

```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... };
```

Neither variant applies. The effect fires unconditionally on a valid target. There is no "direct apply" phase.

---

## Proposed widenings (all surface_widening — no new v4 atoms needed)

### 1. New `ActivationPhase` variant: `direct_apply`

A phase that fires with no roll and no gate. The effect is applied deterministically to the attachment.

```typescript
| {
    readonly kind: "direct_apply";
    readonly attachment: Attachment;
    readonly effect: Effect;           // see widening #2
  }
```

This covers Spare the Dying and would also serve future spells like Resistance (cantrip, ongoing-with-no-roll shape aside), Mending, Prestidigitation's mechanical sub-effects, etc.

### 2. `Effect` union needs `apply_condition`

The `Effect` type used by `ActivationPhase` is currently `DamageEffect | NoneEffect`. A condition-apply variant must be added:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

The `apply_condition` atom is already in the v4 taxonomy. Only the surface type is missing it.

### 3. `Condition` union needs `"stable"`

```typescript
export type Condition = "prone" | "stable";
```

"Stable" is defined in SRD 5.2.1 Rules Glossary as a condition-like state (creature stops making death saving throws). It is the sole mechanical output of this spell.

### 4. `Range` needs threshold-tier scaling

The cantrip upgrade reads: "The range doubles when you reach levels 5 (30 feet), 11 (60 feet), and 17 (120 feet)."

`Range` is currently a fixed shape with no scaling capacity. A scaled variant is needed:

```typescript
export type Range =
  | { readonly kind: "self" }
  | { readonly kind: "touch" }
  | { readonly kind: "point"; readonly feet: number }
  | {
      readonly kind: "point_scaled";
      readonly base: { readonly feet: number };
      readonly tiers: ReadonlyArray<{
        readonly atLevel: number;
        readonly feet: number;
      }>;
      readonly axis: LevelAxis;
    };
```

For Spare the Dying: axis=`"character"`, base=15 ft, tiers at L5→30, L11→60, L17→120.

---

## Secondary gap: targeting predicate (not a widening blocker)

The spell requires the target to "have 0 Hit Points and not be dead." This is a targeting-time guard not expressible in the current `Attachment` or `TargetSelection` shapes. It could be modeled as an `AttachmentFilter` predicate, but this is a lower-priority concern — the phase shape is the hard blocker.

---

## Encoding sketch (once widenings land)

```dhall
{ kind = "spell"
, id = "spare_the_dying"
, name = "Spare the Dying"
, mechanics =
    { family = "activation"
    , level = 0
    , school = "necromancy"
    , castingTime = { kind = "action" }
    , range =
        { kind = "point_scaled"
        , base = { feet = 15 }
        , axis = "character"
        , tiers =
            [ { atLevel = 5,  feet = 30 }
            , { atLevel = 11, feet = 60 }
            , { atLevel = 17, feet = 120 }
            ]
        }
    , components = { v = True, s = True, m = False }
    , duration = { kind = "instantaneous" }
    , phases =
        [ { kind = "direct_apply"
          , attachment = { kind = "target", selection = { mode = "one" } }
          , effect = { kind = "apply_condition", condition = "stable" }
          }
        ]
    }
}
```
