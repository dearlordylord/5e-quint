# Cloudkill — Surface Widening Proposal

## Unit

- **Slug**: `cloudkill`
- **Kind**: spell
- **Level**: 5 (Conjuration, Concentration up to 10 min)
- **Provenance**: SRD 5.2.1

## What Fits

- `ongoing_effect` family — correct shape for a persistent area spell.
- `area` attachment with `sphere radiusFeet=20` — exists.
- `initialPhase` → `save_gate` (Con, caster spell save DC, onFail: 5d8 poison, onSuccess: half_damage) — covers the cast-time save on all creatures already in the sphere.
- `on_creature_enters_area` operation → `save_gate` — covers creatures who walk into the sphere mid-duration.
- `damage` atom (poison, `linear_per_level` for +1d8/slot above 5) — fully expressible.
- `concentration` duration with 10-minute `upTo` — fits.

## Gaps

### 1. `on_creature_ends_turn_in_area` (primary gap)

**SRD text**: "A creature must also make this save when… it ends its turn there."

The `OngoingTrigger` union has `on_attached_turn_start` (fires at the *start* of the attached creature's turn) but nothing for end-of-turn. Cloudkill's core ongoing threat is creatures stuck in the cloud who take damage at the *end* of each of their turns, not the start. These are mechanically distinct — a creature who enters and immediately moves out before their turn ends would take the enter-save but not the end-of-turn save.

**Proposed addition** to `OngoingTrigger`:
```typescript
| { readonly kind: "on_creature_ends_turn_in_area" }
```

This parallels `on_attached_turn_start` but fires at the *end* of each affected creature's turn. Other spells that use "ends its turn in the area" semantics (e.g., Wall of Fire, Spirit Guardians variants) would benefit from the same variant.

### 2. Automatic directional sphere movement

**SRD text**: "The Sphere moves 10 feet away from you at the start of each of your turns."

The existing `reposition_attachment` atom is described as a caster-initiated action (e.g., Silent Image: "spend a Magic action to relocate"). Cloudkill's movement is:
- Automatic (no caster action required)
- Directional (always away from caster, not a free-choice repositioning)
- Fixed distance (exactly 10 ft)

A clean encoding would need either:
- A new `OngoingEffect` variant for automatic attachment movement (e.g., `auto_move_attachment` with `distanceFeet` and `direction: "away_from_caster"`), or
- Enrichment of `reposition_attachment` with `automatic: true` and a `direction` field.

This is lower priority than gap 1 — the movement changes the *footprint* of the sphere over time but doesn't affect the core save-gate resolution logic.

### 3. Once-per-turn save deduplication

**SRD text**: "A creature makes this save only once per turn."

Cloudkill fires saves on three triggers: initial cast, creature enters, creature ends turn. If multiple triggers fire in one turn (e.g., the sphere moves into a creature's space on the caster's turn, and the creature entered on its own turn), the spell caps the creature at one save per turn. The surface has no mechanism to express cross-operation deduplication within a turn boundary.

This is a narrower constraint than the others — it would require either:
- A `maxPerTurn: 1` field on `OngoingOperation`, or
- A shared `trigger_group` mechanism that deduplicates saves across operations.

## Encoding Decision

No `.dhall` authored. The "ends its turn there" save is Cloudkill's primary damage vector (most encounters involve creatures who enter, can't escape, and take damage each turn they remain). Encoding only the enter-save would produce a trace that looks correct but silently drops the dominant mechanic. Per the guardrails, a misleading trace is worse than no trace.

## Classification

`surface_widening` — the `ongoing_effect` family and all effect atoms are correct; the missing piece is a trigger variant (`on_creature_ends_turn_in_area`) on the existing `OngoingTrigger` union.
