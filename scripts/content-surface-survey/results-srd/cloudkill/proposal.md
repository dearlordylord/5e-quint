# Proposal: Cloudkill surface gaps

Unit: Cloudkill (srd-5.2.1, Level 5 Conjuration)
Outcome: `surface_widening`

## What was encoded

The core mechanic encodes cleanly as `ongoing_effect`:

- **Attachment**: `area` — sphere, radius 20 ft, origin `point_within_range`
- **initialPhase**: `save_gate` — Con vs. spell save DC; onFail = 5d8 Poison (slot-scaled), onSuccess = half damage. Covers creatures already inside the sphere at cast.
- **Operation**: trigger `on_attached_turn_start` → `save_gate` (same parameters). Covers creatures spending turns inside the sphere.
- **Upcast**: `linear_per_level`, axis=slot, base 5d8, +1d8/slot above 5.

Typecheck passes. Tracer produces clean output.

## What was omitted (with justification)

### 1. Cloud drift — caller-owned geometry (ARCHITECTURE.md §1)

> "The Sphere moves 10 feet away from you at the start of each of your turns."

The sphere automatically moves without any caster action. The existing `reposition_attachment` atom is defined as a "mid-duration caster **action**" and cannot represent automatic forced drift. Per ARCHITECTURE.md §1, area movement is caller-owned. Treated the same way as Moonbeam's "Magic action to move the Cylinder" and Spirit Guardians' "whenever the Emanation enters a creature's space."

**Proposed widening (if needed):** A new variant on `reposition_attachment` — or a new triggered operation shape — that fires on `on_caster_turn_start` without consuming an action cost and moves the area a fixed distance in a direction relative to the caster.

### 2. "Heavily Obscured" — caller-owned visibility (ARCHITECTURE.md §1)

> "Its area is Heavily Obscured."

The existing `area_is_difficult_terrain` atom covers movement geometry only. Heavily Obscured is a distinct SRD Rules-Glossary condition (Disadvantage on Perception checks; creature in it is unseen). Per ARCHITECTURE.md §1, visibility is caller-owned. Treated the same as Moonbeam's "Dim Light fills the Cylinder" (also omitted there).

**Proposed widening (if needed):** A new `area_is_heavily_obscured` atom, parallel to `area_is_difficult_terrain`.

### 3. Once-per-turn save dedup — missing predicate (same gap as Spirit Guardians, Web)

> "A creature makes this save only once per turn."

RAW triggers the save on initial cast, on the sphere entering a creature's space, on a creature entering the sphere, and on a creature ending its turn there — but only once per turn total. The surface has no per-creature per-turn dedup predicate on `OngoingOperation`. Including both `on_creature_enters_area` and `on_creature_ends_turn_in_area` without the dedup would misrepresent RAW by allowing up to two saves per turn. Encoded as single `on_attached_turn_start` (covers "ends its turn there") with `on_creature_enters_area` deferred, matching the same conservative choice made for Spirit Guardians and Web.

**Proposed widening (if needed):** An `oncePerTurn: true` field on `OngoingOperation`, scoped per-creature per-turn, so that multiple operations sharing this flag are deduped at runtime.

### 4. Strong-wind early-end — missing DurationEndTrigger variant

> "The fog lasts for the duration or until strong wind (such as the one created by Gust of Wind) disperses it, ending the spell."

No existing `DurationEndTrigger` variant covers named-spell environmental dispersion. The current vocabulary (`target_makes_attack_roll`, `target_deals_damage`, `target_casts_spell`, `target_dons_armor`, `target_damaged_by_caster_or_ally`, `target_takes_damage`, `caster_recasts_spell`) does not include an environmental / named-spell interaction trigger.

**Proposed widening:** A new `DurationEndTrigger` variant, e.g.:
```typescript
| { readonly kind: "area_dispersed_by_strong_wind" }
```
Or more generally, a named-spell interaction trigger:
```typescript
| { readonly kind: "triggered_by_named_spell"; readonly spellId: string }
```
(Gust of Wind is the SRD example; other area spells may have similar dispersion rules.)

## Summary

The encoding faithfully covers the poison-damage core of Cloudkill. All four omissions follow established precedent in the corpus (Moonbeam, Spirit Guardians, Web, Conjure Woodland Beings) and are classified as caller-owned geometry, missing dedup predicate, or missing surface variant — not as unresolvable structural gaps. The `once_per_turn` dedup and the `DurationEndTrigger` for wind dispersal are the two gaps most worth surfacing for a surface-widening pass.
