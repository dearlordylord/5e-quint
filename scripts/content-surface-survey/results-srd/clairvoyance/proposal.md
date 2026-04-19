# Proposal: Clairvoyance — atom_widening

## Unit summary

**Clairvoyance** (SRD 5.2.1, L3 Divination) creates an invisible, intangible, invulnerable sensor at a remote location up to 1 mile away. While concentrating (up to 10 minutes), the caster perceives through the sensor using a chosen sense (seeing or hearing), switchable with a Bonus Action.

## Family fit

**`ongoing_effect`** is the correct structural container: concentration, up to 10 minutes, a persistent object at an attachment point with an ongoing operation. The `CastingTime { kind: "minutes", amount: 10, ritual: false }` variant already exists. No structural widening is needed.

## Missing atoms

### 1. `create_sensor` (new EffectAtom)

The spell creates an intangible, invulnerable remote sensing point. No existing atom covers this:

- `create_object` — models physical matter with optional AC/HP; a sensor is explicitly intangible and invulnerable.
- `create_illusion` — sensory projections that are insubstantial and disbelievable; a sensor is a functional vantage point, not an illusion.
- The surface already recognizes spell sensors via `AttachmentRangeOrigin = "spell_sensor"` (used by Crystal Ball of Mind Reading to anchor the range of its granted Detect Thoughts cast from the sensor). But no atom exists for the spell that *creates* the sensor. Clairvoyance is that spell.

**Proposed shape:**
```typescript
| {
    readonly kind: "create_sensor";
    readonly visible?: "invisible";           // default: invisible, visible to truesight
    readonly tangible: false;                 // intangible: passes through creatures/objects
    readonly invulnerable: true;
  }
```

This atom would be delivered via a `passive` ongoing trigger (the sensor is always present while the spell persists), attached to a `location` attachment at the spell's range.

### 2. `remote_perception` (new EffectAtom)

The caster perceives through the sensor as if in its space. No existing atom covers this:

- `grant_sense` — adds a new sense type (darkvision, blindsight, etc.) FROM the caster's own location. Does not relocate the caster's senses.
- `detect` — scans for a magical property (magic, evil, poison, thoughts) within a radius. Not general remote seeing/hearing.
- `grant_speed` / `teleport` — physical movement, not sensory projection.

**Proposed shape:**
```typescript
| {
    readonly kind: "remote_perception";
    // Sense(s) available through the sensor at cast time. Player chooses one at cast;
    // optional Bonus Action switch between available options.
    readonly senses: ReadonlyNonEmptyArray<"seeing" | "hearing">;
    readonly switchCost?: { readonly kind: "bonus_action" };
  }
```

This is the core divination atom — "use chosen sense from the sensor's vantage point as if present there." The `senses` list records available options; the `switchCost` encodes the Bonus Action toggle.

### Secondary gap: Range in miles

The SRD text specifies range "1 mile." The existing `Range` type only supports `self`, `touch`, and `point { feet }`. A `{ kind: "point"; miles: number }` variant (or a generalized unit field) would be needed to accurately author the range header. This is a minor `surface_widening` secondary to the main atom gaps.

## Honest encoding shape (if atoms existed)

```dhall
{ kind = "spell"
, id = "clairvoyance"
, name = "Clairvoyance"
, ...
, mechanics =
    { family = "ongoing_effect"
    , level = 3
    , school = "divination"
    , castingTime = { kind = "minutes", amount = 10, ritual = False }
    , range = { kind = "point", miles = 1 }          -- surface_widening: miles not in Range
    , components = { v = True, s = True, m = Some "a focus worth 100+ GP (jeweled horn or glass eye)" }
    , duration = { kind = "concentration", upTo = { unit = "minute", amount = 10 } }
    , attachment = { kind = "location", description = "familiar_or_obvious_location" }
                                                       -- surface_widening: location attachment needs broader descriptor vocab
    , operations =
        [ { trigger = { kind = "passive" }
          , effect = { kind = "create_sensor", visible = "invisible", tangible = False, invulnerable = True }
                     -- atom_widening: create_sensor does not exist
          }
        , { trigger = { kind = "passive" }
          , effect = { kind = "remote_perception", senses = [ "seeing", "hearing" ], switchCost = { kind = "bonus_action" } }
                     -- atom_widening: remote_perception does not exist
          }
        ]
    }
}
```

## Classification

| Gap | Kind | Severity |
|-----|------|----------|
| `create_sensor` atom | `atom_widening` | **blocker** |
| `remote_perception` atom | `atom_widening` | **blocker** |
| `Range` in miles | `surface_widening` | secondary |
| `location` attachment descriptor vocabulary | `surface_widening` | secondary |

Primary outcome: **`atom_widening`** — the `ongoing_effect` family fits; the missing atoms block honest encoding.
