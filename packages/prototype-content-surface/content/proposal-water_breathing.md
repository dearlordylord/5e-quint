# Proposal: Water Breathing — atom_widening

## Unit

**Water Breathing** — Level 3 Transmutation (SRD 5.2.1)  
Casting time: 1 Action (also Ritual) · Range: 30 ft · Duration: 24 hours (timed, no concentration)  
> "This spell grants up to ten willing creatures of your choice within range the ability to breathe underwater until the spell ends. Affected creatures also retain their normal mode of respiration."

## Why it doesn't fit

### Blocker 1 — Missing v4 atom: `grant_environmental_adaptation`

The spell's entire mechanical payload is granting an environmental capability: the ability to breathe in a medium (water). The v4 effect atom inventory includes closely related passive-grant atoms:

| Atom | Coverage |
|---|---|
| `grant_sense` | Perceptual senses (darkvision, truesight) |
| `grant_hover` | Movement mode (hovering) |
| `grant_resistance` | Damage type mitigation |
| `grant_proficiency` | Skill/tool/weapon competence |

None covers physiological adaptation to an environment (breathing underwater, surviving in vacuum, ignoring extreme temperature). Water Breathing is the first pressure case for this category. Related spells that would also require it: *Water Walk* (surface traversal), *Endure Elements* (temperature immunity), *Gaseous Form* (medium traversal).

**Proposed atom:** `grant_environmental_adaptation`

Minimal shape:
```typescript
type GrantEnvironmentalAdaptation = {
  readonly kind: "grant_environmental_adaptation";
  readonly adaptation: EnvironmentalAdaptation;
  readonly target: "self" | "target_creature";
};

type EnvironmentalAdaptation =
  | { readonly kind: "water_breathing" }
  // future: vacuum_survival, extreme_temperature, etc.
```

### Blocker 2 — Missing `OngoingOperation` variant

`ongoing_effect` mechanics carry an `operation: OngoingOperation` field. The current union:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

A passive capability grant is neither a roll modifier nor an on-hit damage rider. A new operation variant is needed to carry `grant_environmental_adaptation` (and future passive-grant ongoing effects):

```typescript
type GrantCapabilityOperation = {
  readonly kind: "grant_capability";
  readonly effect: GrantEnvironmentalAdaptation; // or a wider GrantCapabilityEffect union
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantCapabilityOperation;
```

This is co-dependent with Blocker 1: the new operation variant is the carrier; the new atom is the payload.

### Secondary issue — `CastingTime` action variant lacks a `ritual` flag

Water Breathing has a 1-action casting time AND is ritual-castable. The current `CastingTime`:

```typescript
| { readonly kind: "action" }       // no ritual flag
| { readonly kind: "minutes"; readonly amount: number; readonly ritual: boolean; }  // has it
```

Alarm (1-minute cast, ritual) maps cleanly to the `minutes` variant. Water Breathing (1-action cast, ritual) does not — the `action` variant carries no ritual metadata.

**Proposed fix (surface_widening, independent of blockers 1+2):**

```typescript
| { readonly kind: "action"; readonly ritual?: boolean }
```

Or a separate variant:
```typescript
| { readonly kind: "action_or_ritual" }
```

The `action_or_ritual` form is more explicit about the two possible invocation modes (normal cast vs. +10 minute ritual cast per SRD ritual rules).

## What a clean encoding would look like after widening

```dhall
{ kind = "spell"
, id = "water_breathing"
, name = "Water Breathing"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-W-Z#Water Breathing" }
, mechanics =
    { family = "ongoing_effect"
    , level = 3
    , school = "transmutation"
    , castingTime = { kind = "action", ritual = True }  -- after surface widening
    , range = { kind = "point", feet = 30 }
    , components = { v = True, s = True, m = Some "a short reed" }
    , duration = { kind = "timed", value = { unit = "hour", amount = 24 } }
    , attachment =
        { kind = "target"
        , selection =
            { mode = "choose_up_to"
            , count = { kind = "fixed", value = 10 }  -- or SlotScaling with perSlotAboveBase=0
            }
        }
    , operation =
        { kind = "grant_capability"               -- after operation widening
        , effect =
            { kind = "grant_environmental_adaptation"   -- after atom widening
            , adaptation = { kind = "water_breathing" }
            , target = "target_creature"
            }
        }
    }
}
```

## Widening classification

| Gap | Classification | Priority |
|---|---|---|
| Missing `grant_environmental_adaptation` atom | `atom_widening` | Blocker (primary) |
| Missing `OngoingOperation.grant_capability` variant | `surface_widening` | Blocker (co-dependent with above) |
| Missing `ritual` flag on `action` CastingTime | `surface_widening` | Secondary, independent |

Overall outcome: **`atom_widening`** (narrowest honest classification that covers the primary blocker).

## Pressure from related spells

Several other SRD spells would benefit from the same widening once it lands:

- *Water Walk* — grants surface-of-liquid traversal → `grant_environmental_adaptation { kind: "water_walk" }`
- *Spider Climb* — grants climbing on vertical/inverted surfaces → `grant_environmental_adaptation { kind: "spider_climb" }`  
- *Fly* — grants a fly speed → could use this or a dedicated `grant_fly_speed` atom
- *Pass without Trace* — grants +10 stealth and non-trackability → different atom pressure but related pattern

The Water Breathing case is the cleanest first instance: single adaptation, no conditional logic, pure passive grant.
