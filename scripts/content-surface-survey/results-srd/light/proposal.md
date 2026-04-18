# Proposal: Light (cantrip) — atom_widening

## Unit

**Light** — Evocation cantrip, SRD 5.2.1

## What fits today

- **Family**: `ongoing_effect` on a timed 1-hour duration (no concentration). Matches `{ kind: "timed", value: { unit: "hour", amount: 1 } }`.
- **Attachment**: `{ kind: "object", count: 1, filter: { heldOrWorn: "forbidden" } }` — the shape exists and correctly models "an object not being worn or carried".
- **Casting time**: `{ kind: "action" }`.
- **Components**: `{ v: true, s: false, m: "a firefly or phosphorescent moss" }`.
- **Range**: `{ kind: "touch" }`.

## What doesn't fit

### 1. Missing atom: `grant_light` (atom_widening — primary blocker)

**RAW text:** *"Until the spell ends, the object sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet."*

The entire mechanical payload of this spell is making an object emit illumination. This has deterministic mechanical consequences in SRD 5.2.1: Bright Light enables sight and prevents hiding (Rules Glossary, "Bright Light"); Dim Light creates the Lightly Obscured condition for creatures within it. The effect is not DM-agenda — it is a deterministic environmental state change with downstream rules consequences.

No atom in v4 taxonomy or `types.ts` models light emission. The closest existing atoms are:

- `grant_sense` — gives a *creature* a perceptual sense; does not apply to objects or areas.
- `detect` — a divination property scan; does not emit light.
- `modify_ac_set_base` / etc. — unrelated.

**Proposed atom:**

```typescript
| {
    readonly kind: "grant_light";
    readonly brightRadiusFeet: number;
    readonly dimRadiusFeet: number;   // additional beyond brightRadius
    // Optional: color is cosmetic (no mechanical consequence); omit from atom.
  }
```

Attach to an `object` attachment. The v4 taxonomy has no corresponding atom name either — this is a genuine gap, not a missing surface realization of an existing v4 atom.

### 2. Missing DurationEndTrigger variant: `caster_recasts_this_spell` (surface_widening)

**RAW text:** *"The spell ends if you cast it again."*

This is a one-at-a-time constraint: the previous instance of the spell ends when the caster casts Light a second time. The existing `DurationEndTrigger` variants all model *target-side* events (`target_makes_attack_roll`, `target_takes_damage`, etc.). None model a caster-side recast.

**Proposed variant:**

```typescript
| { readonly kind: "caster_recasts_this_spell" }
```

This pattern appears on multiple SRD cantrips (Mage Hand, Dancing Lights, etc.) and should be added to the closed `DurationEndTrigger` enum.

### 3. Missing ObjectFilter field: size constraint (surface_widening)

**RAW text:** *"You touch one Large or smaller object…"*

`ObjectFilter` currently has `material`, `heldOrWorn`, and `manufactured`. There is no size field. "Large or smaller" is a targeting restriction that cannot be expressed in the current surface.

**Proposed field:**

```typescript
export type ObjectFilter = {
  readonly material?: ObjectMaterial;
  readonly heldOrWorn?: "required" | "forbidden";
  readonly manufactured?: boolean;
  readonly maxSize?: "tiny" | "small" | "medium" | "large";   // new
};
```

## Encoding sketch (if widenings are accepted)

```dhall
{ kind = "spell"
, id = "light"
, name = "Light"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-L#Light" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 0
    , school = "evocation"
    , castingTime = { kind = "action" }
    , range = { kind = "touch" }
    , components = { v = True, s = False, m = Some "a firefly or phosphorescent moss" }
    , duration =
        { kind = "timed"
        , value = { unit = "hour", amount = 1 }
        , earlyEnd = [ { kind = "caster_recasts_this_spell" } ]  -- NEW variant
        }
    , attachment =
        { kind = "object"
        , count = 1
        , filter = { heldOrWorn = "forbidden", maxSize = Some "large" }  -- maxSize NEW
        }
    , operations =
        [ { trigger = { kind = "passive" }
          , effect =
              { kind = "grant_light"         -- NEW atom
              , brightRadiusFeet = 20
              , dimRadiusFeet = 20
              }
          }
        ]
    }
}
```

## Classification

| Gap | Classification |
|-----|---------------|
| `grant_light` atom | `atom_widening` (not in v4 taxonomy) |
| `caster_recasts_this_spell` DurationEndTrigger | `surface_widening` (variant missing from closed enum) |
| `ObjectFilter.maxSize` | `surface_widening` (field missing from existing type) |

Overall verdict: **`atom_widening`** (primary blocker is the missing atom).
