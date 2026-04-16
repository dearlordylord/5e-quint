# Fly — Surface Widening Proposal

## Unit

**Fly** — Level 3 Transmutation spell (SRD 5.2.1). Concentration, up to 10 minutes. Casting time: Action. Range: Touch.

> "You touch a willing creature. For the duration, the target gains a Fly Speed of 60 feet and can hover. When the spell ends, the target falls if it is still aloft unless it can stop the fall."
>
> *Using a Higher-Level Spell Slot:* You can target one additional creature for each spell slot level above 3.

## Family fit

Fly maps honestly to the `ongoing_effect` spell family:

| Header field | Value | Fits? |
|---|---|---|
| `family` | `ongoing_effect` | yes |
| `level` | 3 | yes |
| `school` | `transmutation` | yes |
| `castingTime` | `{ kind: "action" }` | yes |
| `range` | `{ kind: "touch" }` | yes |
| `components` | V, S, M ("a feather") | yes |
| `duration` | concentration, up to 10 min | yes |
| `attachment` | `target` / `choose_up_to` with `SlotScaling` (+1 per slot above 3) | yes |
| `operation` | grant fly speed 60 ft + hover | **MISSING** |

The target-count scaling for higher-level casting is fully expressible via the existing `SlotScaling<number>` on `TargetSelection`.

## Blocking gap: `OngoingOperation` missing `modify_speed` variant

The core mechanic of Fly is granting a fly speed. `OngoingOperation` currently supports only:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can honestly represent "grant the target a 60 ft fly speed with hover capability." Forcing this into `roll_modifier` or `damage_on_hit` would produce a false trace.

The v4 atom taxonomy lists `modify_speed` as an Effect Atom, so the atom is already recognised. The widening needed is a new `OngoingOperation` variant:

```typescript
export type ModifySpeedOperation = {
  readonly kind: "modify_speed";
  readonly speedKind: "fly" | "walk" | "swim" | "climb";
  readonly valueFeet: number;
  readonly hover: boolean;
};
```

With this addition:
- `OngoingOperation` becomes `RollModifierOperation | DamageOnHitOperation | ModifySpeedOperation`
- Fly encodes as `{ kind: "modify_speed", speedKind: "fly", valueFeet: 60, hover: true }`
- The tracer would emit a `modify_speed` effect node attached to the target attachment

## Secondary gap: `fall_on_end` lifecycle consequence

The spell specifies: *"When the spell ends, the target falls if it is still aloft unless it can stop the fall."*

The v4 atom `fall_on_end` is listed in the Effect Atoms section of the taxonomy but is not surfaced in any current surface type. This is a secondary blocker — the primary blocker above must be addressed first. Options for encoding:

1. Add `fallOnEnd?: true` as an optional flag on `OngoingEffectMechanics`
2. Add `fall_on_end` as a value in a future `OnEndEffect` union on the mechanics header

This gap does not block encoding the core mechanic; it would produce an incomplete but non-misleading trace if omitted and noted.

## Proposed shape (once widened)

```dhall
{ kind = "spell"
, id = "fly"
, name = "Fly"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-E-G#Fly" }
, description = "You touch a willing creature. For the duration, the target gains a Fly Speed of 60 feet and can hover. When the spell ends, the target falls if it is still aloft unless it can stop the fall. Using a Higher-Level Spell Slot: You can target one additional creature for each spell slot level above 3."
, mechanics =
    { family = "ongoing_effect"
    , level = 3
    , school = "transmutation"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = True, m = Some "a feather" }
    , duration = { kind = "concentration", upTo = { unit = "minute", amount = 10 } }
    , attachment =
        { kind = "target"
        , selection =
            { mode = "choose_up_to"
            , count = { kind = "linear", base = 1, perSlotAboveBase = 1, baseLevel = 3 }
            }
        }
    , operation =
        { kind = "modify_speed"   -- NEW: requires OngoingOperation widening
        , speedKind = "fly"
        , valueFeet = 60
        , hover = True
        }
    }
}
```

## Atom inventory

Atoms that would appear in the trace once widened:

| Atom | Category | Source |
|---|---|---|
| `spell_root` | source | existing |
| `activate` | procedure | existing |
| `action_quota` | resource | existing |
| `spell_slot` | resource | existing |
| `concentration_lock` | resource | existing |
| `concentrate` | lifecycle | existing |
| `expire` | lifecycle | existing |
| `target` | attachment | existing |
| `scale_target_count` | scaling | existing |
| `modify_speed` | effect | **needs surface widening** |

Relations: `roots`, `consumes`, `grants`, `persists_until`, `attaches_to`, `modifies`.
