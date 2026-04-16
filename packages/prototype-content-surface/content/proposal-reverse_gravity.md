# Proposal: Reverse Gravity — Surface Widening

## Outcome: `surface_widening`

Reverse Gravity (level 7 transmutation, concentration 1 minute) fits the `spell` kind and the
`ongoing_effect` family at the broadest level. Four surface-level variants are missing before an
honest encoding is possible. All four are gaps in `src/surface/types.ts`; the v4 atom taxonomy
already contains the corresponding atoms (`force_move`, `fall_on_end`).

---

## Gap 1 — `cylinder` area shape in `Attachment`

**Current state:** `Attachment` area only supports:
```typescript
{ readonly kind: "sphere"; readonly radiusFeet: number }
```

**Required:**
```typescript
| { readonly kind: "cylinder"; readonly radiusFeet: number; readonly heightFeet: number }
```

**Evidence:** "This spell reverses gravity in a 50-foot-radius, 100-foot high Cylinder centered on
a point within range."

A cylinder is a distinct geometric primitive. Encoding this as a sphere would misrepresent the
area shape (a 50-ft-radius sphere covers ~523,000 cu ft; the actual cylinder covers ~785,000 cu
ft and has a fundamentally different vertical extent). Other cylinder spells in the corpus
(Insect Plague, Storm of Vengeance, Call Lightning) will exercise the same gap.

---

## Gap 2 — `force_movement` kind in `OngoingOperation`

**Current state:** `OngoingOperation = RollModifierOperation | DamageOnHitOperation`

**Required:**
```typescript
export type ForceMovementOperation = {
  readonly kind: "force_movement";
  readonly direction: "up" | "down" | "away" | "toward"; // "up" for Reverse Gravity
  readonly exemptIfAnchored: boolean; // true — creatures anchored to ground are exempt
};
```

**Evidence:** "All creatures and objects in that area that aren't anchored to the ground fall
upward and reach the top of the Cylinder."

The v4 atom `force_move` exists in the taxonomy. This widening surfaces it in the `ongoing_effect`
mechanics family. `roll_modifier` and `damage_on_hit` cannot represent gravitational field effects
in any honest reading.

---

## Gap 3 — Resistance save on area `ongoing_effect`

**Current state:** No surface type supports a creature-initiated optional save to resist inclusion
in an `ongoing_effect` area. The existing `save_gate` is an `ActivationPhase` concept that gates
damage output, not area inclusion.

**Required shape (sketch):**
```typescript
export type AreaResistanceSave = {
  readonly kind: "save_to_resist";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onSuccess: "exclude_from_effect";  // creature grabs fixed object, avoids upward fall
};
```

This could be attached as an optional field on `ForceMovementOperation` or as a separate
`resists` field on the attachment.

**Evidence:** "A creature can make a Dexterity saving throw to grab a fixed object it can reach,
thus avoiding the fall upward."

Note the asymmetry: the save is **creature-initiated** ("can make"), not forced. This is different
from a standard activation `save_gate` where all targets roll. The surface currently has no
pattern for this opt-in resistance mechanic.

---

## Gap 4 — On-end consequence in `ongoing_effect` mechanics

**Current state:** `OngoingEffectMechanics` has no field for consequences that fire when the
concentration ends. Duration lifecycle is modeled via `concentrate → expire` atoms in the tracer,
but there is no authored surface slot for "when this concentration ends, X happens to affected
creatures."

**Required shape (sketch):**
```typescript
// Optional field on OngoingEffectMechanics (or a shared SpellMechanicsHeader extension):
readonly onConcentrationEnd?: OnEndConsequence;

export type OnEndConsequence =
  | { readonly kind: "fall"; readonly targetScope: "affected_creatures_and_objects" };
```

The v4 atom `fall_on_end` already exists. This widening provides a surface hook for it.

**Evidence:** "When the spell ends, affected objects and creatures fall downward."

---

## Encoding Sketch (if all widenings land)

```dhall
let reverseGravity =
  { kind = "spell"
  , id = "reverse_gravity"
  , name = "Reverse Gravity"
  , provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-Q-Z#Reverse Gravity" }
  , description = "..."
  , mechanics =
      { family = "ongoing_effect"
      , level = 7
      , school = "transmutation"
      , castingTime = { kind = "action" }
      , range = { kind = "point", feet = 100 }
      , components = { v = True, s = True, m = Some "a lodestone and iron filings" }
      , duration = { kind = "concentration", upTo = { unit = "minute", amount = 1 } }
      , attachment =
          { kind = "area"
          , shape = { kind = "cylinder", radiusFeet = 50, heightFeet = 100 }
          , origin = { kind = "point_within_range" }
          }
      , operation =
          { kind = "force_movement"
          , direction = "up"
          , exemptIfAnchored = True
          , resistSave = Some
              { kind = "save_to_resist"
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onSuccess = "exclude_from_effect"
              }
          }
      , onConcentrationEnd = Some { kind = "fall", targetScope = "affected_creatures_and_objects" }
      }
  }
```

---

## Atoms that would appear in a clean trace

| Atom | Category | Source |
|------|----------|--------|
| `spell_root` | source | standard |
| `activate` | procedure | standard |
| `action_quota` | resource | casting time |
| `spell_slot` | resource | level 7 |
| `concentration_lock` | resource | concentration |
| `concentrate` | lifecycle | concentration |
| `expire` | lifecycle | duration |
| `area` | attachment | cylinder area |
| `force_move` | effect | **v4, needs surface hook** |
| `fall_on_end` | effect | **v4, needs surface hook** |

---

## Priority

All four gaps should land together; they compose a single coherent widening for
"gravity/movement field" spells. Gap 2 (force_movement operation) is the load-bearing change;
Gap 1 (cylinder), Gap 3 (resistance save), and Gap 4 (on-end consequence) each require one new
variant of an existing surface type.
