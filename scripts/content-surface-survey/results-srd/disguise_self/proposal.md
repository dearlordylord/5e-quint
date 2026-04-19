# Proposal: `alter_appearance` atom — Disguise Self

## Unit

**Disguise Self** — SRD 5.2.1, Illusion L1, Spells/Descriptions-A-D#Disguise Self

## Gap

The spell's core effect — modify the caster's own appearance as a timed illusion — has no atom in the current surface. `create_illusion` is the only candidate but is the wrong shape:

| Property | `create_illusion` | Disguise Self |
|---|---|---|
| Subject | Free-standing projected object | Caster's own body and worn/carried items |
| `maxSize` field | Size of the illusion object | N/A — the illusion wraps the caster's form |
| Channels | Visual, sound, smell, temperature | Visual only |
| SRD examples | Silent Image, Minor Illusion, Major Image | — |

Using `create_illusion` with `attachment: { kind: "self" }` would emit a misleading trace implying a size-bounded free-standing object rather than a personal appearance overlay.

The TAXONOMY (§12) already lists `alter_appearance (2)` as genuinely new atom pressure not in v4.

## Proposed atom

```typescript
| {
    readonly kind: "alter_appearance";
    // Whether the illusion is visually insubstantial (fails physical inspection).
    // Disguise Self: true (objects pass through additions, no tactile feel).
    readonly insubstantial: boolean;
    // Optional constraint on how much the form may deviate from the caster's base form.
    // Disguise Self: "same_basic_limb_arrangement" — can shift height ±1 ft, weight
    // appearance, clothing/equipment look, but can't add or remove limb arrangements.
    readonly formConstraint?: "same_basic_limb_arrangement";
  }
```

## Secondary mechanic (already encodable)

The disbelief check IS expressible with the current surface:

```
ongoing_effect
  attachment: { kind: "self" }
  operations:
    - trigger: { kind: "on_creature_studies" }
      effect:
        kind: "ability_check_gate"
        ability: "int"
        dc: { kind: "caster_spell_save_dc" }
        onPass: { kind: "none" }   // creature sees through the disguise (DM agenda)
        onFail: { kind: "none" }   // disguise holds
```

The pass/fail outcomes are DM-agenda (the creature perceiving the disguise vs not), but the gate itself is mechanical.

## Encoding once widened

```dhall
{ kind = "spell"
, id = "disguise_self"
, name = "Disguise Self"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-A-D#Disguise Self" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 1
    , school = "illusion"
    , castingTime = { kind = "action" }
    , range = { kind = "self" }
    , components = { v = True, s = True, m = False }
    , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
    , attachment = { kind = "self" }
    , operations =
        [ { trigger = { kind = "passive" }
          , effect =
              { kind = "alter_appearance"
              , insubstantial = True
              , formConstraint = Some "same_basic_limb_arrangement"
              }
          }
        , { trigger = { kind = "on_creature_studies" }
          , effect =
              { kind = "ability_check_gate"
              , ability = "int"
              , dc = { kind = "caster_spell_save_dc" }
              , onPass = { kind = "none" }
              , onFail = { kind = "none" }
              }
          }
        ]
    }
}
```

## Classification

`atom_widening` — `alter_appearance` is not in the v4 atom inventory. The disbelief gate is encodable; the appearance-change effect is not.
