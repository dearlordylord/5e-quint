# Proposal: Dancing Lights surface widenings

## Unit

**Dancing Lights** — SRD 5.2.1 cantrip (Illusion), concentration up to 1 minute.

## Summary

The core atom vocabulary is ready for this spell: `create_illusion`, `emit_light`,
`on_caster_spends_action`, `CastTimeEffectModeChoice`, and `caster_recasts_spell` are all
present. Two surface gaps block honest encoding:

1. **No "floating spatial positions" attachment variant** — the ongoing-effect attachment
   vocabulary has no slot for discrete hovering points in space.
2. **No "reposition attachment" effect atom** — the bonus action's result (moving the lights
   up to 60 ft) has no atom.

---

## Gap 1 — `Attachment.floating_points` (new variant)

### SRD evidence

> You create up to four torch-size lights within range, making them appear as torches,
> lanterns, or glowing orbs that hover for the duration. … A light must be within 20 feet
> of another light created by this spell, and a light vanishes if it exceeds the spell's range.

### Problem

`OngoingEffectMechanics.attachment` must be one of: `self`, `target`, `area`, `mark`,
`object`. None fits:

- `self` — wrong; lights are placed anywhere within 120 ft, not at the caster's position.
- `target { selection: { mode: "choose_up_to", count: 4 } }` — `TargetSelection` is
  creature-only; the lights hover at spatial positions, not on creatures.
- `area { shape: ... }` — the lights are discrete points, not a geometric region. There is
  no shape descriptor for "N arbitrary floating points."
- `mark`, `object` — inapplicable.

`AnchorTarget.location` does model a fixed spatial position but is restricted to the
`anchored_trigger` mechanics family and is unavailable in ongoing-effect attachments.

### Proposed widening

Add a new variant to `Attachment`:

```typescript
| {
    readonly kind: "floating_points";
    // Maximum number of discrete hovering positions the caster places within range.
    readonly maxCount: number;
    // Lights must stay within this distance of at least one other sibling point.
    readonly siblingProximityFeet?: number;
  }
```

This is narrow — it covers Dancing Lights and similar future hovering-object spells
(e.g. Floating Disk, Continual Flame on a free-floating object) without opening a
general free-floating-creature slot.

---

## Gap 2 — `reposition_attachment` (new atom)

### SRD evidence

> As a Bonus Action, you can move the lights up to 60 feet to a space within range.

### Problem

`on_caster_spends_action { cost: { kind: "bonus_action" } }` is the right trigger and
already exists. However, `OngoingEffect` has no atom that repositions the spell's
attachment origin. The closest existing atoms are:

- `force_move` — moves a creature, not an illusion/object attachment.
- `teleport` — moves the spell's subject creature, not the attachment itself.
- `alter_item_kind` — changes an item's form, not its position.

Encoding the bonus action with `{ kind: "none" }` as the effect would be dishonest — there
is a real, bounded mechanical result (lights move ≤60 ft, must stay within range).

### Proposed widening

Add a new atom to `EffectAtom` (and therefore `OngoingEffect`):

```typescript
| {
    readonly kind: "reposition_attachment";
    // Maximum distance the attachment origin(s) may be moved, in feet.
    readonly maxFeet: number;
    // Optional: each origin must remain within this distance of at least
    // one sibling origin after repositioning.
    readonly siblingProximityFeet?: number;
  }
```

This atom is naturally paired with the `floating_points` attachment variant. It could
also serve future spells that let the caster reposition a free-floating conjured object.

---

## What would be encodable once both gaps are filled

```dhall
{ kind = "spell"
, id = "dancing_lights"
, name = "Dancing Lights"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-A-D#Dancing Lights" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 0
    , school = "illusion"
    , castingTime = { kind = "action" }
    , range = { kind = "point", feet = 120 }
    , components = { v = True, s = True, m = Some "a bit of phosphorus" }
    , duration =
        { kind = "concentration"
        , upTo = { unit = "minute", amount = 1 }
        , earlyEnd = [ { kind = "caster_recasts_spell" } ]
        }
    , attachment = { kind = "floating_points", maxCount = 4, siblingProximityFeet = 20 }
    , phases =
        [ { kind = "direct"
          , attachment = { kind = "floating_points", maxCount = 4, siblingProximityFeet = 20 }
          , mode =
              { label = "Choose light configuration"
              , options =
                  [ { id = "four_lights"
                    , displayName = "Four torch-size lights"
                    , effects =
                        [ { kind = "create_illusion", maxSize = "tiny", channels = [ "visual" ] }
                        , { kind = "emit_light", brightRadiusFeet = 0, dimAdditionalFeet = 10 }
                        ]
                    }
                  , { id = "humanlike_form"
                    , displayName = "One glowing Medium humanlike form"
                    , effects =
                        [ { kind = "create_illusion", maxSize = "medium", channels = [ "visual" ] }
                        , { kind = "emit_light", brightRadiusFeet = 0, dimAdditionalFeet = 10 }
                        ]
                    }
                  ]
              }
          }
        ]
    , operations =
        [ { trigger = { kind = "on_caster_spends_action", cost = { kind = "bonus_action" } }
          , effect = { kind = "reposition_attachment", maxFeet = 60 }  -- NEW ATOM
          }
        ]
    }
}
```

## Classification

`surface_widening` — both gaps extend existing surface shapes (new `Attachment` variant,
new `EffectAtom` variant). No wholly new v4 taxonomy family is needed; all required
v4 atoms (`create_illusion`, `emit_light`) already exist in the type vocabulary.
