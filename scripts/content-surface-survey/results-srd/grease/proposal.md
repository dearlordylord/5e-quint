# Grease — Widening Proposal

## Outcome: `atom_widening`

Grease cannot be honestly encoded in the current surface. Two distinct gaps block encoding:

1. No `difficult_terrain` atom in v4 taxonomy
2. No `save_gate` variant in `OngoingOperation`

---

## Spell mechanics

| Field | Value |
|---|---|
| Level | 1 |
| School | Conjuration |
| Casting time | 1 Action |
| Range | 60 ft (point) |
| Components | V, S, M (bit of pork rind or butter) |
| Duration | 1 minute (timed, **not** concentration) |
| Area | 10-foot square |

**Effect 1 — Difficult Terrain (environmental):**
> "Nonflammable grease covers the ground in a 10-foot square centered on a point within range and turns it into Difficult Terrain for the duration."

**Effect 2 — On-cast area pulse:**
> "When the grease appears, each creature standing in its area must succeed on a Dexterity saving throw or have the Prone condition."

**Effect 3 — Ongoing per-creature trigger:**
> "A creature that enters the area or ends its turn there must also succeed on that save or fall Prone."

---

## Why no existing family fits honestly

### `ongoing_effect` — closest match, but `OngoingOperation` is insufficient

The spell is structurally an `ongoing_effect`:
- `area` attachment (10-ft square, origin `point_within_range`) ✓
- `timed` duration (1 minute) ✓
- Persistent operation tied to the area ✓

But `OngoingOperation` only supports `roll_modifier` and `damage_on_hit`. Grease's operation is a **save gate that fires on creature entry / turn-end**, which is neither.

### `activation` — one-shot only

The `activation` family's `save_gate` phase could express the on-cast pulse, but:
- Activation is instantaneous; the 1-minute timed persistence cannot be expressed
- The ongoing per-creature trigger (enters / ends-turn-in-area) has no place in activation phases

### `anchored_trigger` — store-and-single-release only

`anchored_trigger` has `enters_area` as a valid event, but the pattern is store-once / release-once. Grease fires its save gate every time any creature enters or ends its turn in the area — a persistent repeating trigger across the spell's 1-minute lifetime.

---

## Proposed widenings

### 1. New atom: `difficult_terrain` (category: effect)

Difficult terrain is a distinct mechanical concept: a creature spends double movement to move through it (SRD 5.2.1, Rules Glossary "Difficult Terrain"). This is categorically different from:
- `block_travel` — prevents movement entirely
- `modify_speed` — changes the creature's speed stat permanently

`difficult_terrain` is an area-scoped effect placed on a region that modifies movement cost for all creatures passing through it. It needs its own atom.

**Proposed shape:**
```typescript
export type DifficultTerrainEffect = {
  readonly kind: "difficult_terrain";
  // No additional parameters — difficult terrain always doubles movement cost.
};
```

### 2. New variant: `OngoingOperation.save_gate`

An ongoing save gate that fires when a creature enters the attachment area or ends its turn there.

**Proposed shape:**
```typescript
export type OngoingAreaSaveGateOperation = {
  readonly kind: "area_save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly triggers: ReadonlyArray<AreaSaveTrigger>;
  readonly onFail: Effect;
  readonly onSuccess: Effect;
};

export type AreaSaveTrigger =
  | { readonly kind: "on_cast_in_area" }     // creatures in area when spell appears
  | { readonly kind: "enters_area" }          // creature moves into area
  | { readonly kind: "ends_turn_in_area" };   // creature ends its turn inside
```

Grease uses all three triggers.

### 3. New event variant: `AnchoredEvent.ends_turn_in_area` (minor)

If `AnchoredEvent` is reused as the trigger vocabulary for `OngoingOperation.area_save_gate`, an `ends_turn_in_area` variant is needed. Currently `AnchoredEvent` has `physical_contact` and `enters_area`.

This is a secondary proposal — the trigger vocabulary could live on the new operation type instead.

---

## Proposed encoding (pending widening)

Once the above widenings land, Grease would encode as `ongoing_effect`:

```dhall
{ kind = "spell"
, id = "grease"
, name = "Grease"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-G#Grease" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 1
    , school = "conjuration"
    , castingTime = { kind = "action" }
    , range = { kind = "point", feet = 60 }
    , components = { v = True, s = True, m = Some "a bit of pork rind or butter" }
    , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
    , attachment =
        { kind = "area"
        , shape = { kind = "square", sideFeet = 10 }   -- note: square shape is also new; current area only has sphere
        , origin = { kind = "point_within_range" }
        }
    , operation =
        { kind = "area_save_gate"           -- new variant
        , ability = "dex"
        , dc = { kind = "caster_spell_save_dc" }
        , triggers =
            [ { kind = "on_cast_in_area" }
            , { kind = "enters_area" }
            , { kind = "ends_turn_in_area" }
            ]
        , onFail = { kind = "apply_condition", condition = "prone" }
        , onSuccess = { kind = "none" }
        }
    }
}
```

**Additional note**: The area attachment currently only supports `sphere` shape. Grease uses a 10-foot **square**. A `square` shape variant for `AreaShape` would also be needed (or the area attachment shape vocabulary generalized). This is an additional surface widening not listed above.

---

## Summary of widenings

| Kind | Name | Blocks encoding? |
|---|---|---|
| `new_atom` | `difficult_terrain` | Yes |
| `new_variant` | `OngoingOperation.area_save_gate` | Yes |
| `new_variant` | `AreaSaveTrigger` (new type: on_cast_in_area, enters_area, ends_turn_in_area) | Yes |
| `new_variant` | `AreaShape.square` (area attachment shape) | Yes |

All four are required for honest encoding.
