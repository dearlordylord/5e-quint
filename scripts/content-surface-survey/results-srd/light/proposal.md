# Proposal: Light (cantrip) — atom_widening

## Summary

Light fits the `ongoing_effect` spell family structurally (timed, non-concentration, attaches a persistent operation to a target). However, encoding it honestly requires two changes that the current surface cannot provide: an `object` attachment variant and a new illumination effect atom.

---

## Gap 1 — `Attachment` missing `object` variant (surface_widening)

**Classification:** surface_widening (v4 already has the atom; `types.ts` does not expose it)

Light touches **an object**, not a creature:

> "You touch one Large or smaller object that isn't being worn or carried by someone else."

The `Attachment` union in `types.ts` contains `self | target | area | mark`. All of these assume creature-centric or point-in-space targeting. The v4 taxonomy §3 lists `object` as an attachment atom, but it is absent from the schema.

**Proposed widening:**

```typescript
// Add to Attachment union in types.ts:
| { readonly kind: "object"; readonly sizeConstraint?: "large_or_smaller" | "any" }
```

This variant would express that the spell plants its effect on a physical object chosen at cast time, distinct from creature targeting or area geometry.

---

## Gap 2 — No illumination effect atom in v4 (atom_widening)

**Classification:** atom_widening (concept absent from v4 taxonomy)

Light's operation is purely illumination:

> "Until the spell ends, the object sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. The light can be colored as you like."

The existing `OngoingOperation` variants are:
- `roll_modifier` — adds/subtracts a die to rolls
- `damage_on_hit` — deals extra damage when the caster hits

Neither captures "cause an object to emit a calibrated light field." No v4 effect atom covers this either. The closest candidates all fall short:

| v4 atom | Why it fails |
|---|---|
| `modify_ac` | AC is not illumination |
| `create_object` | The object already exists; Light modifies its property |
| `alter_item_kind` | Would imply type change, not light emission |
| `grant_sense` | This is the beneficiary's perception, not the source's emission |

**Proposed new atom:**

```
grant_illumination
  category: effect
  fields:
    brightRadiusFeet: number
    dimRadiusFeet: number   // additional beyond bright
    colorable: boolean      // caster may choose color at cast time
```

**Proposed `OngoingOperation` extension:**

```typescript
export type GrantIlluminationOperation = {
  readonly kind: "grant_illumination";
  readonly brightRadiusFeet: number;
  readonly dimRadiusFeet: number;
  readonly colorable: boolean;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantIlluminationOperation;  // new
```

---

## Gap 3 — Self-break rule not surfaced (surface_widening, deferrable)

**Classification:** surface_widening (v4 has `self_break` lifecycle atom; `Duration` lacks a field)

> "The spell ends if you cast it again."

The `Duration` type in `types.ts` has no `selfBreak` field or trigger. v4 §6 lists `self_break` as a lifecycle atom. This could be expressed as an optional flag on `Duration`:

```typescript
// Possible addition to timed duration:
| { readonly kind: "timed"; readonly value: DurationValue; readonly selfBreak?: true }
```

This gap is secondary — it only affects completeness of the trace, not the fundamental ability to encode the spell's primary operation. It can be deferred until another pressure case also needs it.

---

## What an honest encoding would look like (once gaps are resolved)

```dhall
let light =
  { kind = "spell"
  , id = "light"
  , name = "Light"
  , provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-I-N#Light" }
  , description = "You touch one Large or smaller object..."
  , mechanics =
      { family = "ongoing_effect"
      , level = 0
      , school = "evocation"
      , castingTime = { kind = "action" }
      , range = { kind = "touch" }
      , components = { v = True, s = False, m = Some "a firefly or phosphorescent moss" }
      , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
      , attachment = { kind = "object", sizeConstraint = "large_or_smaller" }
      , operation =
          { kind = "grant_illumination"
          , brightRadiusFeet = 20
          , dimRadiusFeet = 20
          , colorable = True
          }
      }
  }
in light
```

---

## Pressure context

Light is a very common cantrip (on Bard, Cleric, Sorcerer, Wizard lists). Any future object-targeting utility spell (Continual Flame, Darkness if targeting an object, Dancing Lights on objects) will hit the same `Attachment.object` gap. The illumination atom is narrower but Continual Flame and Daylight share the same shape. Both gaps are worth resolving together.
