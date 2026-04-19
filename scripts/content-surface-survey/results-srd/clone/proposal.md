# Proposal: Clone (structural_widening)

## Unit

**Clone** — Level 8 Necromancy spell (SRD 5.2.1, `srd52: true`)

## Why No Honest Encoding Exists

Clone's mechanic is: create an inert biological duplicate inside a sealed vessel; after 120 days, if the original creature dies and its soul is free and willing, the soul transfers to the clone, which then becomes the living creature.

### Family analysis

| Family | Honest fit? | Reason |
|---|---|---|
| `ongoing_effect` | No | Duration is `instantaneous` per the printed card; the clone's persistence is a property of the created object, not the spell's concentration/timed window |
| `activation` | No | The soul transfer fires on the original's future death — not a one-shot effect at cast time |
| `triggered_reaction` | No | Clone is a long-cast spell (1 hour), not a reaction |
| `anchored_trigger` | No | Anchored triggers plant at a `location` or `area`; the anchor here is the *original creature*, which is not a supported anchor target. Events `physical_contact` / `enters_area` do not cover "creature dies" |
| `spawned_creature` | No | The clone is not a controlled companion. The caster has no command relationship with it — it is a vessel for the original creature's own soul |
| `reanimated_creature` | No | Reanimation targets a corpse with caster control; Clone produces a vessel the original creature inhabits autonomously |

No existing family fits.

## Required Widenings

### 1. `CastingTime.hours` variant (surface_widening)

The surface has `CastingTime.minutes` (for Alarm: 1 minute) but no `hours` variant. Clone casts in 1 hour. Adding `{ kind: "hours"; amount: number; ritual: boolean }` would resolve this gap and is also required by other long-cast spells (Glyph of Warding, etc.).

### 2. `soul_vessel` subgraph (structural_widening)

A new spell family is needed for spells that create an inert biological vessel that activates on a triggering event (the original's death). Distinguishing features:
- The created vessel is not under caster control (different from `spawned_creature`)
- The vessel's activation is triggered by a future event external to the spell's normal duration
- The vessel carries personality/memories/abilities — not just stats — distinguishing it from `polymorph` / `transform_target`

### 3. `on_creature_dies` trigger event (surface_widening)

The soul transfer fires "if the original creature dies." No trigger in `OngoingTrigger` or `AnchoredEvent` covers creature death. Needed:
```
| { readonly kind: "on_creature_dies" }
```
This is distinct from `on_attached_turn_start`, `on_attached_damaged`, etc.

### 4. `soul_transfer` effect atom (atom_widening)

Moving a creature's soul to a prepared vessel — carrying personality, memories, and abilities, with the creature resuming life at the clone's location — is not any existing EffectAtom:
- Not `heal_hp` (the original is dead)
- Not `transform_target` (that replaces stats; doesn't model soul continuity)
- Not `create_companion` (no control relationship)
- Not `grant_condition_immunity` or `apply_condition`

Proposed shape (sketch):
```typescript
| {
    readonly kind: "soul_transfer";
    readonly toVessel: "linked_clone_vessel";
    readonly condition: "soul_free_and_willing";  // partially DM agenda
  }
```

Note: "soul is free and willing to return" is partially DM agenda and cannot be resolved deterministically. The condition would need to be flagged as DM-resolved at the table.

### 5. `block_reanimation_of_original` / `render_inert` atom (atom_widening)

"The creature's original remains, if any, become inert and can't be revived." The existing `block_reanimation` atom prevents undead reanimation of a corpse; this is stronger — it prevents ALL revival (Raise Dead, Resurrection, True Resurrection, etc.) because the soul is elsewhere. Either a new `render_permanently_inert` atom or an extension to `block_reanimation` with a `scope: "all_revival"` field is needed.

### 6. `delayed_growth_timer` (surface_widening)

"Finishes growing after 120 days" — a readiness gate on the created vessel before it can receive a soul. No existing timer primitive models a one-shot readiness delay on a created object. `PassiveOperation.elapsed_time` is for recurring worn-item effects, not a creation readiness gate.

## DM Agenda Component

"If the soul is free and willing to return" — willingness is DM-adjudicated. This is not a blocking issue for the surface (the trigger could simply note `requires_dm_resolution: true`), but the condition means the spell cannot be modeled as fully deterministic.

## Confidence

**High.** Six independent gaps were found. Even if individual gaps could be worked around with creative encoding, the combination of (a) no appropriate family, (b) no "creature dies" trigger, and (c) no soul-transfer atom makes an honest encoding impossible with the current surface.
