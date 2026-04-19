# Proposal: Arcane Eye — atom_widening

## Unit

- **Name:** Arcane Eye
- **Kind:** spell (level 4, Divination, concentration up to 1 hour)
- **Outcome:** `atom_widening`

## What fits

The `ongoing_effect` spell family encodes everything except the core perception mechanic:

| Mechanic | Fits? | How |
|---|---|---|
| Casting time (Action) | ✓ | `CastingTime.action` |
| Range 30 ft | ✓ | `Range.point { feet: 30 }` |
| Components V/S/M | ✓ | standard `Components` |
| Concentration, up to 1 hour | ✓ | `Duration.concentration` |
| Point-in-space attachment | ✓ | `Attachment.area` with `AreaOrigin.point_within_range` (or a minimal-area "point" shape) |
| Bonus Action movement (30 ft per use) | ✓ | `OngoingTrigger.on_caster_spends_action { bonus_action }` → `EffectAtom.reposition_attachment { maxMoveFeet: 30 }` |
| Solid-barrier movement blocking | — | DM-agenda terrain rule; out of core |
| Eye passes through ≥1-inch openings | — | DM-agenda constraint; out of core |
| **Remote visual information to caster** | ✗ | **No atom — see below** |
| Eye darkvision 30 ft | ✗ | Dependent on missing sensor atom |

## What is missing

### New atom: `remote_sensor`

**SRD text:** *"You mentally receive visual information from the eye, which can see in every direction. It also has Darkvision with a range of 30 feet."*

The spell's core mechanical payload is a **remote divination sensor**: an attachment-anchored point in space through which the caster perceives visual information (including darkvision). No existing atom covers this:

- **`grant_sense`** — grants a permanent or duration-scoped sense *to a creature*. Arcane Eye's darkvision belongs to the sensor, not to the caster directly. The caster gains remote vision by sharing the sensor's perspective, not by acquiring a new sense of their own.
- **`detect`** — scans for a named property (magic, evil/good, poison/disease, thoughts) within a fixed radius from the caster. Arcane Eye delivers raw visual perception from a mobile remote point, not a property scan.
- **`grant_speed` / `reposition_attachment`** — cover the movement mechanic but not the perception link.

The missing atom would need to express:

```
{
  kind: "remote_sensor",
  // Caster receives visual information from the attachment's location.
  // The sensor may have enhanced senses that propagate through the link.
  senses?: ReadonlyNonEmptyArray<{ sense: SenseKind; rangeFeet: number }>,
  // Direction coverage — omnidirectional is the Arcane Eye case;
  // widen if a future unit has a directed sensor.
  coverage: "omnidirectional"
}
```

This atom would pair naturally with `reposition_attachment` (the sensor moves) and with `on_caster_spends_action` (the movement costs a Bonus Action).

## v4 taxonomy fit

`remote_sensor` is not in the v4 atom inventory. The closest v4 atom is `detect`, which was designed for property-scanning divination (Detect Magic, Detect Thoughts). A floating perspective-sharing sensor is mechanically distinct: it is a persistent positional anchor that routes sensory qualia, not a scan. The atom belongs to the **effect** category alongside `detect` and `grant_sense`.

## Affected surface types

If `remote_sensor` is accepted, no new surface *types* are needed — the atom's payload (`senses` list, `coverage` enum) can be added inline. The `ongoing_effect` family and `reposition_attachment` atom already handle the movement half cleanly.

## Encoding skeleton (pending atom addition)

```dhall
{ kind = "spell"
, id = "arcane_eye"
, name = "Arcane Eye"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-A-D#Arcane Eye" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 4
    , school = "divination"
    , castingTime = { kind = "action" }
    , range = { kind = "point", feet = 30 }
    , components = { v = True, s = True, m = Some "a bit of bat fur" }
    , duration = { kind = "concentration", upTo = { unit = "hour", amount = 1 } }
    , attachment =
        { kind = "area"
        , shape = { kind = "sphere", radiusFeet = 0 }  -- point sensor; shape TBD
        , origin = { kind = "point_within_range" }
        }
    , operations =
        [ { trigger = { kind = "passive" }
          , effect =
              -- MISSING ATOM: remote_sensor
              { kind = "remote_sensor"
              , coverage = "omnidirectional"
              , senses = [ { sense = "darkvision", rangeFeet = 30 } ]
              }
          }
        , { trigger = { kind = "on_caster_spends_action"
                      , cost = { kind = "bonus_action" }
                      }
          , effect = { kind = "reposition_attachment", maxMoveFeet = 30 }
          }
        ]
    }
}
```
