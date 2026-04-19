# Proposal: Control Weather

**Outcome:** `dm_agenda`

## Why this is dm_agenda

Control Weather's entire mechanical payload is DM-adjudicated. The SRD text explicitly states the current weather conditions "are determined by the DM." The caster can shift stages on three environmental tables (precipitation, temperature, wind) by one step per change, but what each stage *means* mechanically — whether a Blizzard imposes difficult terrain, halves visibility, prevents ranged attacks, deals cold damage, or all of the above — is left entirely to the DM.

Unlike spells with DM-adjacent flavor but defined mechanics (e.g., Suggestion: target takes a "reasonable" action, but the spell itself deals no damage, applies defined conditions, etc.), Control Weather has no deterministic mechanical resolution in the SRD text. The spell's observable effects on the game state are 100% DM agenda.

The staged tables (5 precipitation stages, 6 temperature stages, 5 wind stages) describe world-state labels, not mechanical operations. No existing atom family covers environmental/world-state control.

## Structural gaps (independent of dm_agenda classification)

Even if we wanted to encode the deterministic skeleton (the spell IS concentration, the stages ARE defined), three additional surface gaps would block clean encoding:

### 1. Range in miles

The spell's range is a 5-mile sphere. The current `Range` type only supports:
- `{ kind: "self" }`
- `{ kind: "touch" }`
- `{ kind: "point", feet: number }`

A miles-based range variant is needed for large-area environmental spells. This would be a `surface_widening`:

```typescript
| { readonly kind: "point_miles"; readonly miles: number }
// or extend Range to support a unit field:
| { readonly kind: "sphere_miles"; readonly miles: number }
```

### 2. Early-end trigger: caster goes indoors

"The spell ends early if you go indoors" has no matching `DurationEndTrigger` variant. Existing variants cover target actions (attack roll, deals damage, casts spell, dons armor, takes damage, damaged by caster/ally, recasts spell) — none cover the caster's physical location relative to an indoor/outdoor boundary.

New variant needed:
```typescript
| { readonly kind: "caster_goes_indoors" }
```

### 3. Outdoor-only cast restriction

"You must be outdoors to cast this spell" is a cast-time location gate with no surface representation. This is a new class of casting restriction (location predicate) not currently in the schema.

## What an honest encoding would require

Beyond resolving dm_agenda classification, a full honest encoding would need:
1. A `control_weather_state` or `set_world_state` effect atom (or equivalent) to represent environmental manipulation
2. The miles range variant
3. The `caster_goes_indoors` early-end trigger
4. An outdoor-only cast-restriction predicate
5. A mechanism for the stage-shift state machine (the caster can repeatedly shift by 1, but the current surface has no "modify world state by delta" atom family)

The stage-shift mechanic is a player-controlled state machine over DM-owned world state, which has no v4 analogue. Even structurally, this would require a new atom family.

## Casting time note

The 10-minute casting time maps cleanly to the existing surface:
```dhall
{ kind = "minutes", amount = 10, ritual = False }
```
This is the only aspect of the spell that fits without widening.
